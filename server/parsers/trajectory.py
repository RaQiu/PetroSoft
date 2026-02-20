"""Parser for well trajectory files (井轨迹.csv).

Format: Space-separated, GB2312 encoded
Header: 深度  井斜  方位角
Data:   0     0     0
        25    0     0
"""

from typing import List
from models import TrajectoryPoint


def parse_trajectory(file_path: str) -> List[TrajectoryPoint]:
    """Parse a trajectory file and return a list of TrajectoryPoint objects."""
    points = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    for line in lines[1:]:  # skip header
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        points.append(
            TrajectoryPoint(
                depth=float(parts[0]),
                inclination=float(parts[1]),
                azimuth=float(parts[2]),
            )
        )
    return points
