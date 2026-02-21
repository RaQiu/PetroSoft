"""Signal filtering utilities for curve processing."""


def moving_average(values: list[float | None], window: int) -> list[float | None]:
    """Apply moving average filter, handling None values."""
    if window < 1:
        return list(values)
    n = len(values)
    result = [None] * n
    half = window // 2
    for i in range(n):
        start = max(0, i - half)
        end = min(n, i + half + 1)
        valid = [v for v in values[start:end] if v is not None]
        if valid:
            result[i] = sum(valid) / len(valid)
    return result


def median_filter(values: list[float | None], window: int) -> list[float | None]:
    """Apply median filter, handling None values."""
    if window < 1:
        return list(values)
    n = len(values)
    result = [None] * n
    half = window // 2
    for i in range(n):
        start = max(0, i - half)
        end = min(n, i + half + 1)
        valid = sorted(v for v in values[start:end] if v is not None)
        if valid:
            mid = len(valid) // 2
            if len(valid) % 2 == 0:
                result[i] = (valid[mid - 1] + valid[mid]) / 2
            else:
                result[i] = valid[mid]
    return result
