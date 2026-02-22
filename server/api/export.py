"""Data export API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_connection
from exporters import (
    format_coordinates,
    format_trajectory,
    format_curves,
    format_layers,
    format_lithology,
    format_interpretation,
    format_discrete,
    format_time_depth,
    format_well_attributes,
)

router = APIRouter(prefix="/data", tags=["data-export"])


class ExportRequest(BaseModel):
    file_path: str
    data_type: str
    workarea_path: str
    well_name: str = ""


@router.post("/export")
async def export_data(req: ExportRequest):
    """Export data from workarea database to a file."""
    try:
        async with get_connection(req.workarea_path) as db:
            if req.data_type == "coordinates":
                content = await _export_coordinates(db)
            elif req.data_type == "trajectory":
                content = await _export_trajectory(db, req.well_name)
            elif req.data_type == "curves":
                content = await _export_curves(db, req.well_name)
            elif req.data_type == "layers":
                content = await _export_layers(db)
            elif req.data_type == "lithology":
                content = await _export_lithology(db)
            elif req.data_type == "interpretation":
                content = await _export_interpretation(db)
            elif req.data_type == "discrete":
                content = await _export_discrete(db, req.well_name)
            elif req.data_type == "time_depth":
                content = await _export_time_depth(db)
            elif req.data_type == "well_attribute":
                content = await _export_well_attributes(db)
            else:
                raise HTTPException(status_code=400, detail=f"未知数据类型: {req.data_type}")

            with open(req.file_path, "w", encoding="gb2312", errors="replace") as f:
                f.write(content)

            return {"status": "ok", "message": f"导出成功: {req.file_path}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {e}")


async def _export_coordinates(db):
    cursor = await db.execute("SELECT name, x, y, kb, td FROM wells ORDER BY name")
    rows = await cursor.fetchall()
    wells = [{"name": r[0], "x": r[1], "y": r[2], "kb": r[3], "td": r[4]} for r in rows]
    return format_coordinates(wells)


async def _export_trajectory(db, well_name: str):
    if not well_name:
        raise HTTPException(status_code=400, detail="导出井轨迹需要指定井名")
    cursor = await db.execute(
        "SELECT t.depth, t.inclination, t.azimuth FROM trajectories t "
        "JOIN wells w ON t.well_id = w.id WHERE w.name = ? ORDER BY t.depth",
        (well_name,),
    )
    rows = await cursor.fetchall()
    points = [{"depth": r[0], "inclination": r[1], "azimuth": r[2]} for r in rows]
    return format_trajectory(points)


async def _export_curves(db, well_name: str):
    if not well_name:
        raise HTTPException(status_code=400, detail="导出测井曲线需要指定井名")

    # Get curve names
    cursor = await db.execute(
        "SELECT c.id, c.name FROM curves c "
        "JOIN wells w ON c.well_id = w.id WHERE w.name = ? ORDER BY c.name",
        (well_name,),
    )
    curve_rows = await cursor.fetchall()
    if not curve_rows:
        raise HTTPException(status_code=404, detail=f"井 '{well_name}' 无曲线数据")

    curve_names = [r[1] for r in curve_rows]
    curve_ids = {r[1]: r[0] for r in curve_rows}

    # Build depth-indexed data
    data_by_depth: dict[float, dict[str, float | None]] = {}
    for cname in curve_names:
        cid = curve_ids[cname]
        cursor = await db.execute(
            "SELECT depth, value FROM curve_data WHERE curve_id = ? ORDER BY depth",
            (cid,),
        )
        for row in await cursor.fetchall():
            depth = row[0]
            if depth not in data_by_depth:
                data_by_depth[depth] = {}
            data_by_depth[depth][cname] = row[1]

    return format_curves(curve_names, data_by_depth)


async def _export_layers(db):
    cursor = await db.execute(
        "SELECT w.name, l.formation, l.top_depth, l.bottom_depth "
        "FROM layers l JOIN wells w ON l.well_id = w.id "
        "ORDER BY w.name, l.top_depth"
    )
    rows = await cursor.fetchall()
    layers = [
        {"well_name": r[0], "formation": r[1], "top_depth": r[2], "bottom_depth": r[3]}
        for r in rows
    ]
    return format_layers(layers)


async def _export_lithology(db):
    cursor = await db.execute(
        "SELECT w.name, l.top_depth, l.bottom_depth, l.description "
        "FROM lithology l JOIN wells w ON l.well_id = w.id "
        "ORDER BY w.name, l.top_depth"
    )
    rows = await cursor.fetchall()
    entries = [
        {"well_name": r[0], "top_depth": r[1], "bottom_depth": r[2], "description": r[3]}
        for r in rows
    ]
    return format_lithology(entries)


async def _export_interpretation(db):
    cursor = await db.execute(
        "SELECT w.name, i.top_depth, i.bottom_depth, i.conclusion, i.category "
        "FROM interpretations i JOIN wells w ON i.well_id = w.id "
        "ORDER BY w.name, i.top_depth"
    )
    rows = await cursor.fetchall()
    entries = [
        {
            "well_name": r[0],
            "top_depth": r[1],
            "bottom_depth": r[2],
            "conclusion": r[3],
            "category": r[4],
        }
        for r in rows
    ]
    return format_interpretation(entries)


async def _export_discrete(db, well_name: str):
    if not well_name:
        raise HTTPException(status_code=400, detail="导出离散曲线需要指定井名")
    cursor = await db.execute(
        "SELECT dc.curve_name, dc.depth, dc.value FROM discrete_curves dc "
        "JOIN wells w ON dc.well_id = w.id WHERE w.name = ? "
        "ORDER BY dc.curve_name, dc.depth",
        (well_name,),
    )
    rows = await cursor.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail=f"井 '{well_name}' 无离散曲线数据")

    # Export all discrete curves, separated by blank lines
    sections = []
    current_name = None
    current_points = []
    for r in rows:
        if r[0] != current_name:
            if current_name is not None:
                sections.append(format_discrete(current_name, current_points))
            current_name = r[0]
            current_points = []
        current_points.append({"depth": r[1], "value": r[2]})
    if current_name is not None:
        sections.append(format_discrete(current_name, current_points))
    return "\n".join(sections)


async def _export_time_depth(db):
    cursor = await db.execute(
        "SELECT w.name, td.depth, td.time "
        "FROM time_depth td JOIN wells w ON td.well_id = w.id "
        "ORDER BY w.name, td.depth"
    )
    rows = await cursor.fetchall()
    entries = [
        {"well_name": r[0], "depth": r[1], "time": r[2]}
        for r in rows
    ]
    return format_time_depth(entries)


async def _export_well_attributes(db):
    # Get all attribute names
    cursor = await db.execute(
        "SELECT DISTINCT attribute_name FROM well_attributes ORDER BY attribute_name"
    )
    attr_rows = await cursor.fetchall()
    attr_names = [r[0] for r in attr_rows]
    if not attr_names:
        raise HTTPException(status_code=404, detail="无井点属性数据")

    # Get all wells with attributes
    cursor = await db.execute(
        "SELECT w.name, wa.attribute_name, wa.attribute_value "
        "FROM well_attributes wa JOIN wells w ON wa.well_id = w.id "
        "ORDER BY w.name, wa.attribute_name"
    )
    rows = await cursor.fetchall()

    # Build per-well attribute map
    wells_map: dict[str, dict[str, str]] = {}
    for r in rows:
        well_name = r[0]
        if well_name not in wells_map:
            wells_map[well_name] = {"well_name": well_name}
        wells_map[well_name][r[1]] = r[2] or ""

    return format_well_attributes(attr_names, list(wells_map.values()))
