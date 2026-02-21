"""Data export formatters for PetroSoft.

Each function takes DB rows and returns a string in the original import format.
"""


def format_coordinates(wells: list[dict]) -> str:
    lines = ["井名\tx坐标\ty坐标\tKB\tDepth"]
    for w in wells:
        x = f"{w['x']:.2f}" if w['x'] is not None else ""
        y = f"{w['y']:.2f}" if w['y'] is not None else ""
        kb = f"{w['kb']:.2f}" if w['kb'] is not None else ""
        td = f"{w['td']:.2f}" if w['td'] is not None else ""
        lines.append(f"{w['name']}\t{x}\t{y}\t{kb}\t{td}")
    return "\n".join(lines) + "\n"


def format_trajectory(points: list[dict]) -> str:
    lines = ["深度 井斜 方位角"]
    for p in points:
        depth = f"{p['depth']:.2f}"
        inc = f"{p['inclination']:.2f}" if p['inclination'] is not None else "0.00"
        azi = f"{p['azimuth']:.2f}" if p['azimuth'] is not None else "0.00"
        lines.append(f"{depth} {inc} {azi}")
    return "\n".join(lines) + "\n"


def format_curves(curve_names: list[str], data_by_depth: dict[float, dict[str, float | None]]) -> str:
    header = "深度\t" + "\t".join(curve_names)
    lines = [header]
    for depth in sorted(data_by_depth.keys()):
        row = data_by_depth[depth]
        vals = []
        for cn in curve_names:
            v = row.get(cn)
            vals.append(f"{v:.3f}" if v is not None else "-9999.000")
        lines.append(f"{depth:.3f}\t" + "\t".join(vals))
    return "\n".join(lines) + "\n"


def format_layers(layers: list[dict]) -> str:
    # Format: 井名 \t 编号 \t 顶 \t 底 \t 厚 \t 说明 (matches import parser)
    lines = ["井名\t编号\t顶\t底\t厚\t说明"]
    for la in layers:
        top = la['top_depth'] if la['top_depth'] is not None else 0
        bot = la['bottom_depth'] if la['bottom_depth'] is not None else 0
        thickness = bot - top
        lines.append(
            f"{la['well_name']}\t\t"
            f"{top:.1f}\t{bot:.1f}\t{thickness:.1f}\t{la.get('formation', '')}"
        )
    return "\n".join(lines) + "\n"


def format_lithology(entries: list[dict]) -> str:
    # Format: 井名 \t 编号 \t 顶 \t 底 \t 厚 \t 岩性 (matches import parser)
    lines = ["井名\t编号\t顶\t底\t厚\t岩性"]
    for e in entries:
        top = e['top_depth'] if e['top_depth'] is not None else 0
        bot = e['bottom_depth'] if e['bottom_depth'] is not None else 0
        thickness = bot - top
        lines.append(
            f"{e['well_name']}\t\t"
            f"{top:.1f}\t{bot:.1f}\t{thickness:.1f}\t{e.get('description', '')}"
        )
    return "\n".join(lines) + "\n"


def format_interpretation(entries: list[dict]) -> str:
    # Format: 井名 \t [空] \t 顶 \t 底 \t 厚 \t 有效厚度 \t 综合结论 (matches import parser)
    lines = ["井名\t编号\t顶\t底\t厚\t有效厚度\t综合结论"]
    for e in entries:
        top = e['top_depth'] if e['top_depth'] is not None else 0
        bot = e['bottom_depth'] if e['bottom_depth'] is not None else 0
        thickness = bot - top
        lines.append(
            f"{e['well_name']}\t\t"
            f"{top:.1f}\t{bot:.1f}\t{thickness:.1f}\t{thickness:.3f}\t"
            f"{e.get('conclusion', '')}"
        )
    return "\n".join(lines) + "\n"


def format_discrete(curve_name: str, points: list[dict]) -> str:
    lines = [f"深度\t{curve_name}"]
    for p in points:
        val = f"{p['value']:.3f}" if p['value'] is not None else "-9999.000"
        lines.append(f"\t{p['depth']:.3f}\t{val}")
    return "\n".join(lines) + "\n"
