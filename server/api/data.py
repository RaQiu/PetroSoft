"""Data import API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_connection, get_or_create_well
from parsers import (
    parse_coordinates,
    parse_trajectory,
    parse_curves,
    parse_layers,
    parse_lithology,
    parse_interpretation,
    parse_discrete_curves,
    parse_time_depth,
    parse_well_attributes,
)

router = APIRouter(prefix="/data", tags=["data"])


class ImportRequest(BaseModel):
    file_path: str
    data_type: str
    workarea_path: str
    well_name: str = ""


@router.post("/import")
async def import_data(req: ImportRequest):
    """Import a data file into the workarea database."""
    try:
        async with get_connection(req.workarea_path) as db:
            if req.data_type == "coordinates":
                return await _import_coordinates(db, req.file_path)
            elif req.data_type == "trajectory":
                return await _import_trajectory(db, req.file_path, req.well_name)
            elif req.data_type == "curves":
                return await _import_curves(db, req.file_path, req.well_name)
            elif req.data_type == "layers":
                return await _import_layers(db, req.file_path)
            elif req.data_type == "lithology":
                return await _import_lithology(db, req.file_path)
            elif req.data_type == "interpretation":
                return await _import_interpretation(db, req.file_path)
            elif req.data_type == "discrete":
                return await _import_discrete(db, req.file_path, req.well_name)
            elif req.data_type == "time_depth":
                return await _import_time_depth(db, req.file_path)
            elif req.data_type == "well_attribute":
                return await _import_well_attributes(db, req.file_path)
            else:
                raise HTTPException(status_code=400, detail=f"未知数据类型: {req.data_type}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {e}")


async def _import_coordinates(db, file_path: str):
    wells = parse_coordinates(file_path)
    count = 0
    for w in wells:
        await db.execute(
            """INSERT INTO wells (name, x, y, kb, td) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(name) DO UPDATE SET x=?, y=?, kb=?, td=?""",
            (w.name, w.x, w.y, w.kb, w.td, w.x, w.y, w.kb, w.td),
        )
        count += 1
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {count} 口井坐标"}


async def _import_trajectory(db, file_path: str, well_name: str):
    if not well_name:
        raise HTTPException(status_code=400, detail="导入井轨迹需要指定井名")
    points = parse_trajectory(file_path)
    well_id = await get_or_create_well(db, well_name)
    await db.execute("DELETE FROM trajectories WHERE well_id = ?", (well_id,))
    for p in points:
        await db.execute(
            "INSERT INTO trajectories (well_id, depth, inclination, azimuth) VALUES (?, ?, ?, ?)",
            (well_id, p.depth, p.inclination, p.azimuth),
        )
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {len(points)} 条井轨迹数据"}


async def _import_curves(db, file_path: str, well_name: str):
    if not well_name:
        raise HTTPException(status_code=400, detail="导入测井曲线需要指定井名")
    curve_infos, curve_data = parse_curves(file_path)
    well_id = await get_or_create_well(db, well_name)

    total = 0
    for info in curve_infos:
        await db.execute(
            """INSERT INTO curves (well_id, name, unit, sample_interval) VALUES (?, ?, ?, ?)
               ON CONFLICT(well_id, name) DO UPDATE SET unit=?, sample_interval=?""",
            (well_id, info.name, info.unit, info.sample_interval, info.unit, info.sample_interval),
        )
        cursor = await db.execute(
            "SELECT id FROM curves WHERE well_id = ? AND name = ?",
            (well_id, info.name),
        )
        row = await cursor.fetchone()
        curve_id = row[0]

        await db.execute("DELETE FROM curve_data WHERE curve_id = ?", (curve_id,))

        data_points = curve_data.get(info.name, [])
        batch = [(curve_id, dp.depth, dp.value) for dp in data_points]
        await db.executemany(
            "INSERT INTO curve_data (curve_id, depth, value) VALUES (?, ?, ?)",
            batch,
        )
        total += len(data_points)

    await db.commit()
    return {
        "status": "ok",
        "message": f"成功导入 {len(curve_infos)} 条曲线，共 {total} 个数据点",
    }


async def _import_layers(db, file_path: str):
    layers = parse_layers(file_path)
    count = 0
    for layer in layers:
        well_id = await get_or_create_well(db, layer.well_name)
        await db.execute(
            "INSERT INTO layers (well_id, formation, top_depth, bottom_depth) VALUES (?, ?, ?, ?)",
            (well_id, layer.formation, layer.top_depth, layer.bottom_depth),
        )
        count += 1
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {count} 条分层数据"}


async def _import_lithology(db, file_path: str):
    entries = parse_lithology(file_path)
    count = 0
    for e in entries:
        well_id = await get_or_create_well(db, e.well_name)
        await db.execute(
            "INSERT INTO lithology (well_id, top_depth, bottom_depth, description) VALUES (?, ?, ?, ?)",
            (well_id, e.top_depth, e.bottom_depth, e.description),
        )
        count += 1
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {count} 条岩性数据"}


async def _import_interpretation(db, file_path: str):
    entries = parse_interpretation(file_path)
    count = 0
    for e in entries:
        well_id = await get_or_create_well(db, e.well_name)
        await db.execute(
            "INSERT INTO interpretations (well_id, top_depth, bottom_depth, conclusion, category) VALUES (?, ?, ?, ?, ?)",
            (well_id, e.top_depth, e.bottom_depth, e.conclusion, e.category),
        )
        count += 1
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {count} 条解释结论"}


async def _import_discrete(db, file_path: str, well_name: str):
    if not well_name:
        raise HTTPException(status_code=400, detail="导入离散曲线需要指定井名")
    curve_name, points = parse_discrete_curves(file_path)
    well_id = await get_or_create_well(db, well_name)
    await db.execute(
        "DELETE FROM discrete_curves WHERE well_id = ? AND curve_name = ?",
        (well_id, curve_name),
    )
    for p in points:
        await db.execute(
            "INSERT INTO discrete_curves (well_id, curve_name, depth, value) VALUES (?, ?, ?, ?)",
            (well_id, curve_name, p.depth, p.value),
        )
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {len(points)} 条离散曲线 '{curve_name}' 数据"}


async def _import_time_depth(db, file_path: str):
    entries = parse_time_depth(file_path)
    count = 0
    for e in entries:
        well_id = await get_or_create_well(db, e.well_name)
        await db.execute(
            "INSERT INTO time_depth (well_id, depth, time) VALUES (?, ?, ?)",
            (well_id, e.depth, e.time),
        )
        count += 1
    await db.commit()
    return {"status": "ok", "message": f"成功导入 {count} 条时深数据"}


async def _import_well_attributes(db, file_path: str):
    attrs = parse_well_attributes(file_path)
    count = 0
    for a in attrs:
        well_id = await get_or_create_well(db, a.well_name)
        await db.execute(
            """INSERT INTO well_attributes (well_id, attribute_name, attribute_value) VALUES (?, ?, ?)
               ON CONFLICT DO NOTHING""",
            (well_id, a.attribute_name, a.attribute_value),
        )
        count += 1
    await db.commit()
    wells_count = len(set(a.well_name for a in attrs))
    attr_count = len(set(a.attribute_name for a in attrs))
    return {"status": "ok", "message": f"成功导入 {wells_count} 口井 {attr_count} 个属性"}
