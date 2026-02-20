"""Parser for lithology files (岩性.txt).

Format: Tab-separated, GB2312 encoded
Header: 井名  编号  顶  底  厚  岩性
Data:   陆钻井1HF    1380  1381.18  1.18  灰褐色荧光细砂岩
Note: 编号 column is often empty
"""

from typing import List
from models import LithologyEntry


def parse_lithology(file_path: str) -> List[LithologyEntry]:
    """Parse a lithology file and return a list of LithologyEntry objects."""
    entries = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    for line in lines[1:]:  # skip header
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 6:
            continue

        well_name = parts[0].strip()
        # parts[1] is 编号 (often empty)
        try:
            top = float(parts[2].strip())
            bottom = float(parts[3].strip())
        except (ValueError, IndexError):
            continue
        # parts[4] is 厚 (thickness, derived field)
        description = parts[5].strip() if len(parts) > 5 else ""

        entries.append(
            LithologyEntry(
                well_name=well_name,
                top_depth=top,
                bottom_depth=bottom,
                description=description,
            )
        )
    return entries
