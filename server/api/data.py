"""Data import API endpoints."""

import os

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


class DetectWellNameRequest(BaseModel):
    file_path: str
    data_type: str


class DetectImportFileRequest(BaseModel):
    file_path: str


@router.post("/import")
async def import_data(req: ImportRequest):
    """Import a data file into the workarea database."""
    try:
        async with get_connection(req.workarea_path) as db:
            if req.data_type == "coordinates":
                return await _import_coordinates(db, req.file_path, req.well_name)
            elif req.data_type == "trajectory":
                return await _import_trajectory(db, req.file_path, req.well_name)
            elif req.data_type == "curves":
                return await _import_curves(db, req.file_path, req.well_name)
            elif req.data_type == "layers":
                return await _import_layers(db, req.file_path, req.well_name)
            elif req.data_type == "lithology":
                return await _import_lithology(db, req.file_path, req.well_name)
            elif req.data_type == "interpretation":
                return await _import_interpretation(db, req.file_path, req.well_name)
            elif req.data_type == "discrete":
                return await _import_discrete(db, req.file_path, req.well_name)
            elif req.data_type == "time_depth":
                return await _import_time_depth(db, req.file_path, req.well_name)
            elif req.data_type == "well_attribute":
                return await _import_well_attributes(db, req.file_path, req.well_name)
            else:
                raise HTTPException(status_code=400, detail=f"未知数据类型: {req.data_type}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {e}")


@router.post("/detect-well-name")
async def detect_well_name(req: DetectWellNameRequest):
    """Best-effort well-name detection for import forms."""
    try:
        return {"well_name": _detect_well_name(req.file_path, req.data_type)}
    except Exception:
        return {"well_name": ""}


@router.post("/detect-import-file")
async def detect_import_file(req: DetectImportFileRequest):
    """Best-effort file-type detection for drag-and-drop imports."""
    try:
        detected = _detect_import_file(req.file_path)
        if detected["kind"] == "data" and detected.get("data_type"):
            try:
                detected["well_name"] = _detect_well_name(
                    req.file_path, detected["data_type"]
                )
            except Exception:
                detected["well_name"] = ""
        return detected
    except Exception:
        return {
            "kind": "unknown",
            "data_type": "",
            "display_name": _default_well_name(req.file_path),
            "well_name": "",
        }


def _default_well_name(file_path: str) -> str:
    return os.path.splitext(os.path.basename(file_path))[0]


def _read_preview_lines(file_path: str, max_lines: int = 3) -> list[str]:
    for encoding in ("gb2312", "utf-8", "utf-8-sig"):
        try:
            with open(file_path, encoding=encoding) as f:
                return [next(f, "").strip() for _ in range(max_lines)]
        except UnicodeDecodeError:
            continue
        except OSError:
            break
    return []


def _apply_well_name_override(entries, well_name: str, attr: str = "well_name"):
    normalized_name = well_name.strip()
    if not normalized_name or not entries:
        return entries
    existing_names = {
        getattr(entry, attr, "").strip()
        for entry in entries
        if getattr(entry, attr, "").strip()
    }
    if len(existing_names) <= 1:
        for entry in entries:
            setattr(entry, attr, normalized_name)
    return entries


def _detect_well_name(file_path: str, data_type: str) -> str:
    fallback_name = _default_well_name(file_path)

    if data_type == "coordinates":
        wells = parse_coordinates(file_path)
        names = [w.name.strip() for w in wells if w.name.strip() and not w.name.startswith("WELL_")]
        return names[0] if names else fallback_name
    if data_type == "layers":
        entries = parse_layers(file_path)
        return entries[0].well_name.strip() if entries and entries[0].well_name.strip() else fallback_name
    if data_type == "lithology":
        entries = parse_lithology(file_path)
        return entries[0].well_name.strip() if entries and entries[0].well_name.strip() else fallback_name
    if data_type == "interpretation":
        entries = parse_interpretation(file_path)
        return entries[0].well_name.strip() if entries and entries[0].well_name.strip() else fallback_name
    if data_type == "time_depth":
        entries = parse_time_depth(file_path)
        return entries[0].well_name.strip() if entries and entries[0].well_name.strip() else fallback_name
    if data_type == "well_attribute":
        entries = parse_well_attributes(file_path)
        return entries[0].well_name.strip() if entries and entries[0].well_name.strip() else fallback_name

    return fallback_name


def _detect_import_file(file_path: str) -> dict[str, str]:
    ext = os.path.splitext(file_path)[1].lower()
    display_name = _default_well_name(file_path)
    image_exts = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"}
    if ext in image_exts:
        return {
            "kind": "image",
            "data_type": "",
            "display_name": display_name,
            "well_name": "",
        }

    lines = _read_preview_lines(file_path)
    header = lines[0] if lines else ""
    normalized = header.replace(" ", "").replace("\t", "|")
    tokens = [part.strip() for part in header.replace("\t", " ").split() if part.strip()]
    token_set = set(tokens)
    lower_name = os.path.basename(file_path).lower()

    def result(data_type: str) -> dict[str, str]:
        return {
            "kind": "data",
            "data_type": data_type,
            "display_name": display_name,
            "well_name": "",
        }

    if "x坐标" in normalized and "y坐标" in normalized:
        return result("coordinates")
    if "井斜" in normalized and "方位角" in normalized:
        return result("trajectory")
    if "综合结论" in normalized or "解释结论" in normalized:
        return result("interpretation")
    if "岩性" in normalized and "顶" in normalized and "底" in normalized:
        return result("lithology")
    if "说明" in normalized and "顶" in normalized and "底" in normalized:
        return result("layers")
    if "时间" in normalized and "深度" in normalized:
        return result("time_depth")
    if "深度" in token_set:
        if len(tokens) <= 2:
            return result("discrete")
        return result("curves")
    if tokens and tokens[0] == "井名" and "顶" not in token_set and "底" not in token_set:
        return result("well_attribute")

    filename_rules = [
        ("轨迹", "trajectory"),
        ("坐标", "coordinates"),
        ("岩性", "lithology"),
        ("解释", "interpretation"),
        ("分层", "layers"),
        ("时深", "time_depth"),
        ("属性", "well_attribute"),
        ("离散", "discrete"),
        ("曲线", "curves"),
    ]
    for keyword, data_type in filename_rules:
        if keyword in lower_name:
            return result(data_type)

    return {
        "kind": "unknown",
        "data_type": "",
        "display_name": display_name,
        "well_name": "",
    }


async def _import_coordinates(db, file_path: str, well_name: str = ""):
    wells = parse_coordinates(file_path, fallback_name=well_name or None)
    wells = _apply_well_name_override(wells, well_name, attr="name")
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


async def _import_layers(db, file_path: str, well_name: str = ""):
    layers = parse_layers(file_path)
    layers = _apply_well_name_override(layers, well_name)
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


async def _import_lithology(db, file_path: str, well_name: str = ""):
    entries = parse_lithology(file_path)
    entries = _apply_well_name_override(entries, well_name)
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


async def _import_interpretation(db, file_path: str, well_name: str = ""):
    entries = parse_interpretation(file_path)
    entries = _apply_well_name_override(entries, well_name)
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


async def _import_time_depth(db, file_path: str, well_name: str = ""):
    entries = parse_time_depth(file_path)
    entries = _apply_well_name_override(entries, well_name)
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


async def _import_well_attributes(db, file_path: str, well_name: str = ""):
    attrs = parse_well_attributes(file_path)
    attrs = _apply_well_name_override(attrs, well_name)
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
