"""Parser for interpretation conclusion files (解释结论.txt).

Format: Tab-separated, GB2312 encoded
Header: 井名  [空]  顶  底  厚  有效厚度  综合结论
Data:   陆钻井1HF      1385.5  1400.5  15  15.000  含气层
Note: Second column (编号) is often empty/whitespace
"""

from typing import List
from models import InterpretationEntry


def parse_interpretation(file_path: str) -> List[InterpretationEntry]:
    """Parse an interpretation file and return a list of InterpretationEntry."""
    entries = []
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    for line in lines[1:]:  # skip header
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 7:
            continue

        well_name = parts[0].strip()
        try:
            top = float(parts[2].strip())
            bottom = float(parts[3].strip())
        except (ValueError, IndexError):
            continue
        # parts[4] = 厚, parts[5] = 有效厚度 (derived)
        conclusion = parts[6].strip() if len(parts) > 6 else ""

        entries.append(
            InterpretationEntry(
                well_name=well_name,
                top_depth=top,
                bottom_depth=bottom,
                conclusion=conclusion,
                category="",
            )
        )
    return entries
