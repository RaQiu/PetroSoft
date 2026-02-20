"""Parser for coordinate files (坐标.txt).

Format: Tab-separated, GB2312 encoded
Header: 井名  x坐标  y坐标  KB  Depth
Data:   s1    2356780  567808  250  5000
"""

from typing import List
from models import Well


def parse_coordinates(file_path: str) -> List[Well]:
    """Parse a coordinate file and return a list of Well objects."""
    wells = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    for line in lines[1:]:  # skip header
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        wells.append(
            Well(
                name=parts[0],
                x=float(parts[1]),
                y=float(parts[2]),
                kb=float(parts[3]),
                td=float(parts[4]),
            )
        )
    return wells
