"""Linear interpolation utilities for curve resampling."""

import bisect


def linear_interpolate(
    depths: list[float],
    values: list[float | None],
    new_interval: float,
) -> tuple[list[float], list[float | None]]:
    """Resample curve data to a new depth interval using linear interpolation.

    Returns (new_depths, new_values). None values in original data are skipped
    during interpolation and result in None in the output.
    """
    if not depths or new_interval <= 0:
        return [], []

    # Build valid (non-None) pairs for interpolation
    valid_depths = []
    valid_values = []
    for d, v in zip(depths, values):
        if v is not None:
            valid_depths.append(d)
            valid_values.append(v)

    if not valid_depths:
        return [], []

    min_depth = depths[0]
    max_depth = depths[-1]

    new_depths = []
    new_values = []
    d = min_depth
    while d <= max_depth + 1e-9:
        new_depths.append(round(d, 6))

        # Find interpolation position
        idx = bisect.bisect_right(valid_depths, d)
        if idx == 0:
            # Before first valid point
            new_values.append(valid_values[0] if abs(d - valid_depths[0]) < 1e-9 else None)
        elif idx >= len(valid_depths):
            # After last valid point
            new_values.append(
                valid_values[-1] if abs(d - valid_depths[-1]) < 1e-9 else None
            )
        else:
            d0 = valid_depths[idx - 1]
            d1 = valid_depths[idx]
            v0 = valid_values[idx - 1]
            v1 = valid_values[idx]
            if abs(d1 - d0) < 1e-12:
                new_values.append(v0)
            else:
                t = (d - d0) / (d1 - d0)
                new_values.append(v0 + t * (v1 - v0))

        d += new_interval

    return new_depths, new_values
