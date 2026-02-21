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
    lines = ["井名\t层位\t顶深\t底深\t厚度"]
    for la in layers:
        top = la['top_depth']
        bot = la['bottom_depth']
        thickness = bot - top if top is not None and bot is not None else 0
        lines.append(
            f"{la['well_name']}\t{la.get('formation', '')}\t"
            f"{top:.1f}\t{bot:.1f}\t{thickness:.1f}"
        )
    return "\n".join(lines) + "\n"


def format_lithology(entries: list[dict]) -> str:
    lines = ["井名\t顶深\t底深\t厚度\t岩性描述"]
    for e in entries:
        top = e['top_depth']
        bot = e['bottom_depth']
        thickness = bot - top if top is not None and bot is not None else 0
        lines.append(
            f"{e['well_name']}\t{top:.1f}\t{bot:.1f}\t{thickness:.1f}\t{e.get('description', '')}"
        )
    return "\n".join(lines) + "\n"


def format_interpretation(entries: list[dict]) -> str:
    lines = ["井名\t顶深\t底深\t结论\t分类"]
    for e in entries:
        lines.append(
            f"{e['well_name']}\t{e['top_depth']:.1f}\t{e['bottom_depth']:.1f}\t"
            f"{e.get('conclusion', '')}\t{e.get('category', '')}"
        )
    return "\n".join(lines) + "\n"


def format_discrete(curve_name: str, points: list[dict]) -> str:
    lines = [f"深度\t{curve_name}"]
    for p in points:
        val = f"{p['value']:.3f}" if p['value'] is not None else "-9999.000"
        lines.append(f"\t{p['depth']:.3f}\t{val}")
    return "\n".join(lines) + "\n"
