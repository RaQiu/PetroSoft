"""Parser for time-depth relationship files (时深.txt).

Format: Tab-separated, GB2312 encoded
Header: 井名  深度  时间
Data:   Well1  100.0  50.5
"""

from typing import List
from models import TimeDepthPoint


def parse_time_depth(file_path: str) -> List[TimeDepthPoint]:
    """Parse a time-depth file and return a list of TimeDepthPoint objects."""
    points = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    for line in lines[1:]:  # skip header
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            parts = line.split()
        if len(parts) < 3:
            continue

        well_name = parts[0].strip()
        try:
            depth = float(parts[1].strip())
            time_val = float(parts[2].strip())
        except (ValueError, IndexError):
            continue

        points.append(
            TimeDepthPoint(
                well_name=well_name,
                depth=depth,
                time=time_val,
            )
        )
    return points
