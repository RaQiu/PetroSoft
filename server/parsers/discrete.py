"""Parser for discrete curve files (离散曲线.txt).

Format: Tab-separated, GB2312 encoded
Header: 深度  Tmax
Data:   \t1202\t440  (note: leading tab on data lines)
"""

from typing import List, Tuple
from models import DiscreteCurvePoint


def parse_discrete_curves(
    file_path: str,
) -> Tuple[str, List[DiscreteCurvePoint]]:
    """Parse a discrete curve file.

    Returns:
        A tuple of (curve_name, data_points).
    """
    points = []
    curve_name = "Tmax"

    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    if lines:
        # Parse header to get curve name
        header_parts = lines[0].strip().split("\t")
        if len(header_parts) >= 2:
            curve_name = header_parts[-1].strip()

    for line in lines[1:]:
        # Strip the line but handle leading tabs
        stripped = line.strip()
        if not stripped:
            continue
        parts = stripped.split("\t")
        # After stripping, we may still get empty strings from split
        values = [p.strip() for p in parts if p.strip()]
        if len(values) < 2:
            continue
        try:
            depth = float(values[0])
            raw_val = float(values[1])
            value = None if raw_val == -9999 else raw_val
        except ValueError:
            continue
        points.append(DiscreteCurvePoint(depth=depth, value=value))

    return curve_name, points
