"""Parser for coordinate files (坐标.txt).

Format A (5+ columns, with well name):
    Header: 井名  x坐标  y坐标  KB  Depth
    Data:   s1    2356780  567808  250  5000

Format B (4 columns, no well name – requires fallback_name):
    Header: x坐标  y坐标  KB  Depth
    Data:   2356780  567808  250  5000
"""

from typing import List, Optional
from models import Well


def _is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def parse_coordinates(
    file_path: str, fallback_name: Optional[str] = None
) -> List[Well]:
    """Parse a coordinate file and return a list of Well objects.

    If a row has >= 5 columns and the first column is not a number,
    treat column 0 as well name (Format A).
    Otherwise treat all columns as numeric and use *fallback_name* (Format B).
    """
    wells = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    for idx, line in enumerate(lines[1:], start=2):  # skip header
        line = line.strip()
        if not line:
            continue
        parts = line.split()

        # Detect format: if first field looks numeric → Format B (no name column)
        if len(parts) >= 5 and not _is_number(parts[0]):
            # Format A: name  x  y  kb  td
            wells.append(
                Well(
                    name=parts[0],
                    x=float(parts[1]),
                    y=float(parts[2]),
                    kb=float(parts[3]),
                    td=float(parts[4]),
                )
            )
        elif len(parts) >= 4 and _is_number(parts[0]):
            # Format B: x  y  kb  td (no name)
            name = fallback_name or f"WELL_{idx}"
            wells.append(
                Well(
                    name=name,
                    x=float(parts[0]),
                    y=float(parts[1]),
                    kb=float(parts[2]),
                    td=float(parts[3]),
                )
            )
        elif len(parts) >= 5:
            # Fallback: assume Format A
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
