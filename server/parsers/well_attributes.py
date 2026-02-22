"""Parser for well-point attribute files (井点属性.txt).

Format: Tab-separated, GB2312 encoded
Header: 井名  属性1  属性2  ...
Data:   Well1  1.5  2.3  ...

Each column after the well name is an attribute; each row is a well.
"""

from typing import List
from models import WellAttribute


def parse_well_attributes(file_path: str) -> List[WellAttribute]:
    """Parse a well-attribute file and return a list of WellAttribute objects."""
    attrs = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    if not lines:
        return attrs

    # Parse header to get attribute names
    header_parts = lines[0].strip().split("\t")
    if len(header_parts) < 2:
        header_parts = lines[0].strip().split()
    if len(header_parts) < 2:
        return attrs

    attr_names = [h.strip() for h in header_parts[1:]]

    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            parts = line.split()
        if len(parts) < 2:
            continue

        well_name = parts[0].strip()
        for i, attr_name in enumerate(attr_names):
            idx = i + 1
            value = parts[idx].strip() if idx < len(parts) else ""
            attrs.append(
                WellAttribute(
                    well_name=well_name,
                    attribute_name=attr_name,
                    attribute_value=value,
                )
            )
    return attrs
