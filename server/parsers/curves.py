"""Parser for well log curve files (测井曲线.txt).

Format: Tab-separated, GB2312 encoded
Header: 深度  伽马  电阻率  自然电位  自然伽马  浅电阻  深电阻  DT  ...
Data:   2090  21.952  196.419  91.762  0.101  0.234  62.657  ...
Note:   -9999 values represent null/missing data
"""

from typing import List, Tuple, Optional
from models import CurveInfo, CurveDataPoint


def parse_curves(
    file_path: str,
) -> Tuple[List[CurveInfo], dict[str, List[CurveDataPoint]]]:
    """Parse a curve file.

    Returns:
        A tuple of (curve_infos, curve_data_dict) where curve_data_dict
        maps curve_name -> list of CurveDataPoint.
    """
    with open(file_path, encoding="gb2312") as f:
        lines = f.readlines()

    if not lines:
        return [], {}

    # Parse header to get curve names
    header = lines[0].strip().split("\t")
    # First column is depth, rest are curve names
    curve_names = [name.strip() for name in header[1:] if name.strip()]

    curve_infos = [CurveInfo(name=name) for name in curve_names]
    curve_data: dict[str, List[CurveDataPoint]] = {name: [] for name in curve_names}

    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue

        try:
            depth = float(parts[0].strip())
        except ValueError:
            continue

        for i, name in enumerate(curve_names):
            if i + 1 < len(parts):
                raw = parts[i + 1].strip()
                value: Optional[float] = None
                try:
                    v = float(raw)
                    if v != -9999:
                        value = v
                except ValueError:
                    pass
                curve_data[name].append(CurveDataPoint(depth=depth, value=value))

    return curve_infos, curve_data
