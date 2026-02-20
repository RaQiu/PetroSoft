"""Parser for layer/formation files (分层.txt).

Format: Tab-separated, GB2312 encoded
Header: 井名  编号  顶  底  厚  说明
Data:   陆钻井1HF    7.5  20  12.5  更新系
Note: 编号 column is often empty
"""

from typing import List
from models import Layer


def parse_layers(file_path: str) -> List[Layer]:
    """Parse a layer file and return a list of Layer objects."""
    layers = []
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
        formation = parts[5].strip() if len(parts) > 5 else ""

        layers.append(
            Layer(
                well_name=well_name,
                formation=formation,
                top_depth=top,
                bottom_depth=bottom,
            )
        )
    return layers
