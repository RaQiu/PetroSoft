"""Seismic data API endpoints."""

import os
import math
from typing import Optional, Tuple
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import segyio
import numpy as np

from db import get_connection
from models import SeismicImportRequest

router = APIRouter(prefix="/seismic", tags=["seismic"])


# -- helpers ------------------------------------------------------------------

_XLINE_CANDIDATES = [
    segyio.TraceField.CROSSLINE_3D,  # 193 (standard)
    segyio.TraceField.CDP,           # 21  (common fallback)
]


@contextmanager
def open_segy(file_path: str, *, need_geometry: bool = True):
    """Open a SEG-Y file with automatic crossline field detection.

    Tries CROSSLINE_3D (byte 193) first; if geometry fails, retries with
    CDP (byte 21) as the crossline field. Yields the opened file handle.
    """
    if not need_geometry:
        with segyio.open(file_path, "r", ignore_geometry=True) as f:
            yield f
        return

    for xline_field in _XLINE_CANDIDATES:
        f = segyio.open(
            file_path, "r",
            iline=int(segyio.TraceField.INLINE_3D),
            xline=int(xline_field),
            strict=False,
        )
        if f.ilines is not None and f.xlines is not None:
            try:
                yield f
            finally:
                f.close()
            return
        f.close()

    # Last resort — open without geometry so caller gets *something*
    with segyio.open(file_path, "r", ignore_geometry=True) as f:
        yield f


@router.get("/segy-headers")
async def browse_segy_headers(
    file_path: str = Query(..., description="SEG-Y 文件路径"),
):
    """Browse SEG-Y file headers without requiring a workarea."""
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"文件不存在: {file_path}")

    try:
        with segyio.open(file_path, "r", ignore_geometry=True) as f:
            # Text header (3200 bytes EBCDIC)
            raw_text = segyio.tools.wrap(f.text[0])
            text_header = raw_text

            # Binary header
            bin_header = {}
            for key in segyio.binfield.keys:
                bin_header[str(key)] = int(f.bin[key])

            # First 5 trace headers
            n_traces = f.tracecount
            sample_traces = []
            for i in range(min(5, n_traces)):
                th = {}
                th["trace_index"] = i
                th["INLINE_3D"] = int(f.header[i].get(segyio.TraceField.INLINE_3D, 0))
                th["CROSSLINE_3D"] = int(f.header[i].get(segyio.TraceField.CROSSLINE_3D, 0))
                th["CDP_X"] = int(f.header[i].get(segyio.TraceField.CDP_X, 0))
                th["CDP_Y"] = int(f.header[i].get(segyio.TraceField.CDP_Y, 0))
                th["TRACE_SAMPLE_COUNT"] = int(
                    f.header[i].get(segyio.TraceField.TRACE_SAMPLE_COUNT, 0)
                )
                th["SourceX"] = int(f.header[i].get(segyio.TraceField.SourceX, 0))
                th["SourceY"] = int(f.header[i].get(segyio.TraceField.SourceY, 0))
                sample_traces.append(th)

            return {
                "status": "ok",
                "text_header": text_header,
                "binary_header": bin_header,
                "sample_traces": sample_traces,
                "total_traces": n_traces,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取 SEG-Y 文件失败: {str(e)}")


@router.post("/import")
async def import_seismic(req: SeismicImportRequest):
    """Import a seismic volume into the workarea database."""
    if not os.path.isfile(req.file_path):
        raise HTTPException(status_code=404, detail=f"文件不存在: {req.file_path}")
    if not os.path.isdir(req.workarea_path):
        raise HTTPException(status_code=404, detail="工区目录不存在")

    # survey geometry extracted during the same read pass
    survey_geo = None

    try:
        with open_segy(req.file_path) as f:
            ilines = f.ilines
            xlines = f.xlines
            n_samples = len(f.samples)
            sample_interval = float(f.samples[1] - f.samples[0]) if n_samples > 1 else 1.0
            format_code = int(f.bin[segyio.BinField.Format])

            if ilines is not None and xlines is not None:
                meta = {
                    "n_inlines": len(ilines),
                    "n_crosslines": len(xlines),
                    "n_samples": n_samples,
                    "sample_interval": sample_interval,
                    "inline_min": int(ilines[0]),
                    "inline_max": int(ilines[-1]),
                    "crossline_min": int(xlines[0]),
                    "crossline_max": int(xlines[-1]),
                    "format_code": format_code,
                }

                # --- extract survey geometry from trace headers ---
                il_step = int(ilines[1] - ilines[0]) if len(ilines) > 1 else 1
                xl_step = int(xlines[1] - xlines[0]) if len(xlines) > 1 else 1

                def _read_coord(il_idx, xl_idx):
                    tidx = il_idx * len(xlines) + xl_idx
                    cx = float(f.header[tidx].get(segyio.TraceField.CDP_X, 0))
                    cy = float(f.header[tidx].get(segyio.TraceField.CDP_Y, 0))
                    sc = int(f.header[tidx].get(segyio.TraceField.SourceGroupScalar, 0))
                    if sc < 0:
                        cx /= abs(sc); cy /= abs(sc)
                    elif sc > 0:
                        cx *= sc; cy *= sc
                    return cx, cy

                try:
                    ox, oy = _read_coord(0, 0)
                    il_dx, il_dy = 0.0, 0.0
                    xl_dx, xl_dy = 0.0, 0.0
                    if len(ilines) > 1:
                        x1, y1 = _read_coord(1, 0)
                        il_dx, il_dy = x1 - ox, y1 - oy
                    if len(xlines) > 1:
                        x1, y1 = _read_coord(0, 1)
                        xl_dx, xl_dy = x1 - ox, y1 - oy
                    survey_geo = {
                        "il_min": int(ilines[0]), "il_max": int(ilines[-1]), "il_step": il_step,
                        "xl_min": int(xlines[0]), "xl_max": int(xlines[-1]), "xl_step": xl_step,
                        "origin_x": ox, "origin_y": oy,
                        "il_dx": il_dx, "il_dy": il_dy,
                        "xl_dx": xl_dx, "xl_dy": xl_dy,
                    }
                except Exception:
                    pass  # coordinate extraction failed — skip survey creation
            else:
                # Geometry completely unresolvable — scan trace headers
                il_field = segyio.TraceField.INLINE_3D
                xl_field = segyio.TraceField.CDP
                il_vals = set()
                xl_vals = set()
                for i in range(f.tracecount):
                    il_vals.add(int(f.header[i][il_field]))
                    xl_vals.add(int(f.header[i][xl_field]))
                il_sorted = sorted(il_vals)
                xl_sorted = sorted(xl_vals)
                meta = {
                    "n_inlines": len(il_sorted),
                    "n_crosslines": len(xl_sorted),
                    "n_samples": n_samples,
                    "sample_interval": sample_interval,
                    "inline_min": il_sorted[0] if il_sorted else 0,
                    "inline_max": il_sorted[-1] if il_sorted else 0,
                    "crossline_min": xl_sorted[0] if xl_sorted else 0,
                    "crossline_max": xl_sorted[-1] if xl_sorted else 0,
                    "format_code": format_code,
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取 SEG-Y 元数据失败: {str(e)}")

    async with get_connection(req.workarea_path) as db:
        try:
            await db.execute(
                """INSERT INTO seismic_volumes
                   (name, file_path, n_inlines, n_crosslines, n_samples,
                    sample_interval, inline_min, inline_max,
                    crossline_min, crossline_max, format_code)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    req.name,
                    req.file_path,
                    meta["n_inlines"],
                    meta["n_crosslines"],
                    meta["n_samples"],
                    meta["sample_interval"],
                    meta["inline_min"],
                    meta["inline_max"],
                    meta["crossline_min"],
                    meta["crossline_max"],
                    meta["format_code"],
                ),
            )
            await db.commit()
        except Exception as e:
            if "UNIQUE constraint" in str(e):
                raise HTTPException(status_code=409, detail=f"数据体名称 '{req.name}' 已存在")
            raise HTTPException(status_code=500, detail=f"写入数据库失败: {str(e)}")

    # Auto-create a survey with the same name (silently skip if already exists)
    if survey_geo is not None:
        async with get_connection(req.workarea_path) as db:
            try:
                await db.execute(
                    """INSERT INTO surveys
                       (name, inline_min, inline_max, inline_step,
                        crossline_min, crossline_max, crossline_step,
                        origin_x, origin_y,
                        inline_dx, inline_dy, crossline_dx, crossline_dy)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (req.name,
                     survey_geo["il_min"], survey_geo["il_max"], survey_geo["il_step"],
                     survey_geo["xl_min"], survey_geo["xl_max"], survey_geo["xl_step"],
                     survey_geo["origin_x"], survey_geo["origin_y"],
                     survey_geo["il_dx"], survey_geo["il_dy"],
                     survey_geo["xl_dx"], survey_geo["xl_dy"]),
                )
                await db.commit()
            except Exception:
                pass  # duplicate or other error — volume import still succeeds

    return {"status": "ok", "message": f"地震数据体 '{req.name}' 导入成功", "metadata": meta}


@router.get("/volumes")
async def list_volumes(
    workarea: str = Query(..., description="工区路径"),
):
    """List all registered seismic volumes in a workarea."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            """SELECT id, name, file_path, n_inlines, n_crosslines, n_samples,
                      sample_interval, inline_min, inline_max,
                      crossline_min, crossline_max, format_code
               FROM seismic_volumes ORDER BY name"""
        )
        rows = await cursor.fetchall()
        volumes = [
            {
                "id": r[0],
                "name": r[1],
                "file_path": r[2],
                "n_inlines": r[3],
                "n_crosslines": r[4],
                "n_samples": r[5],
                "sample_interval": r[6],
                "inline_min": r[7],
                "inline_max": r[8],
                "crossline_min": r[9],
                "crossline_max": r[10],
                "format_code": r[11],
            }
            for r in rows
        ]
        return {"status": "ok", "volumes": volumes}


@router.get("/section")
async def get_section(
    workarea: str = Query(..., description="工区路径"),
    volume_id: int = Query(..., description="数据体 ID"),
    direction: str = Query("inline", description="方向: inline 或 crossline"),
    index: int = Query(..., description="线号"),
    downsample: int = Query(1, ge=1, description="降采样因子"),
):
    """Read one inline or crossline section from a seismic volume."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT file_path, n_samples, sample_interval FROM seismic_volumes WHERE id = ?",
            (volume_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="数据体不存在")
        file_path, n_samples, sample_interval = row[0], row[1], row[2]

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"SEG-Y 文件不存在: {file_path}")

    try:
        with open_segy(file_path) as f:
            if f.ilines is None or f.xlines is None:
                raise HTTPException(
                    status_code=400,
                    detail="该 SEG-Y 文件无法识别测线几何信息，不支持剖面浏览",
                )
            if direction == "inline":
                if index not in f.ilines:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Inline {index} 不存在，范围: {int(f.ilines[0])}-{int(f.ilines[-1])}",
                    )
                section = f.iline[index]
                positions = [int(x) for x in f.xlines]
            elif direction == "crossline":
                if index not in f.xlines:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Crossline {index} 不存在，范围: {int(f.xlines[0])}-{int(f.xlines[-1])}",
                    )
                section = f.xline[index]
                positions = [int(x) for x in f.ilines]
            else:
                raise HTTPException(status_code=400, detail="direction 必须是 inline 或 crossline")

            # section is a generator/array of traces; convert to numpy
            data = np.array(section, dtype=np.float32)

            # Downsample if needed
            if downsample > 1:
                data = data[::downsample, ::downsample]
                positions = positions[::downsample]

            # Time axis
            times_full = [float(s) for s in f.samples]
            if downsample > 1:
                times_full = times_full[::downsample]

            # Replace NaN/Inf with 0
            data = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)

            amp_min = float(np.min(data))
            amp_max = float(np.max(data))

            # Convert to nested list
            data_list = data.tolist()

            return {
                "status": "ok",
                "data": data_list,
                "times": times_full,
                "positions": positions,
                "amp_min": amp_min,
                "amp_max": amp_max,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取剖面数据失败: {str(e)}")


@router.get("/survey-outline")
async def get_survey_outline(
    workarea: str = Query(..., description="工区路径"),
    volume_id: int = Query(..., description="数据体 ID"),
):
    """Get the 4-corner survey outline coordinates from a seismic volume."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT file_path FROM seismic_volumes WHERE id = ?", (volume_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="数据体不存在")
        file_path = row[0]

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"SEG-Y 文件不存在: {file_path}")

    try:
        with open_segy(file_path) as f:
            ilines = f.ilines
            xlines = f.xlines

            if ilines is None or xlines is None:
                raise HTTPException(
                    status_code=400,
                    detail="该 SEG-Y 文件无法识别测线几何信息",
                )

            # Read corner trace headers for coordinates
            corners = []
            corner_specs = [
                (ilines[0], xlines[0]),
                (ilines[0], xlines[-1]),
                (ilines[-1], xlines[-1]),
                (ilines[-1], xlines[0]),
            ]

            for il, xl in corner_specs:
                # Find the trace index for this inline/crossline pair
                try:
                    trace_idx = f.iline.keys.index(il) * len(xlines) + f.xline.keys.index(xl)
                    x = float(f.header[trace_idx].get(segyio.TraceField.CDP_X, 0))
                    y = float(f.header[trace_idx].get(segyio.TraceField.CDP_Y, 0))
                    # Apply coordinate scalar if present
                    scalar = int(f.header[trace_idx].get(segyio.TraceField.SourceGroupScalar, 0))
                    if scalar < 0:
                        x /= abs(scalar)
                        y /= abs(scalar)
                    elif scalar > 0:
                        x *= scalar
                        y *= scalar
                    corners.append({"x": x, "y": y, "inline": int(il), "crossline": int(xl)})
                except (ValueError, IndexError):
                    corners.append(
                        {"x": 0.0, "y": 0.0, "inline": int(il), "crossline": int(xl)}
                    )

            return {"status": "ok", "outline": corners}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取测区范围失败: {str(e)}")


# ══════════════════════════════════════════════════════════════════════
# Survey (测网) management
# ══════════════════════════════════════════════════════════════════════

@router.get("/surveys")
async def list_surveys(workarea: str = Query(..., description="工区路径")):
    """List all surveys in a workarea."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            """SELECT id, name, inline_min, inline_max, inline_step,
                      crossline_min, crossline_max, crossline_step,
                      origin_x, origin_y,
                      inline_dx, inline_dy, crossline_dx, crossline_dy,
                      created_at
               FROM surveys ORDER BY id"""
        )
        rows = await cursor.fetchall()
        surveys = []
        for r in rows:
            surveys.append({
                "id": r[0], "name": r[1],
                "inline_min": r[2], "inline_max": r[3], "inline_step": r[4],
                "crossline_min": r[5], "crossline_max": r[6], "crossline_step": r[7],
                "origin_x": r[8], "origin_y": r[9],
                "inline_dx": r[10], "inline_dy": r[11],
                "crossline_dx": r[12], "crossline_dy": r[13],
                "created_at": r[14],
            })
        return {"status": "ok", "surveys": surveys}


class SurveyCreateRequest(BaseModel):
    workarea_path: str
    name: str
    inline_min: int
    inline_max: int
    inline_step: int = 1
    crossline_min: int
    crossline_max: int
    crossline_step: int = 1
    origin_x: float = 0.0
    origin_y: float = 0.0
    inline_dx: float = 0.0
    inline_dy: float = 0.0
    crossline_dx: float = 0.0
    crossline_dy: float = 0.0


@router.post("/surveys/create")
async def create_survey(req: SurveyCreateRequest):
    """Create a survey manually."""
    async with get_connection(req.workarea_path) as db:
        try:
            await db.execute(
                """INSERT INTO surveys
                   (name, inline_min, inline_max, inline_step,
                    crossline_min, crossline_max, crossline_step,
                    origin_x, origin_y,
                    inline_dx, inline_dy, crossline_dx, crossline_dy)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (req.name, req.inline_min, req.inline_max, req.inline_step,
                 req.crossline_min, req.crossline_max, req.crossline_step,
                 req.origin_x, req.origin_y,
                 req.inline_dx, req.inline_dy, req.crossline_dx, req.crossline_dy),
            )
            await db.commit()
        except Exception as e:
            if "UNIQUE constraint" in str(e):
                raise HTTPException(status_code=409, detail=f"测网 '{req.name}' 已存在")
            raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "message": f"测网 '{req.name}' 创建成功"}


@router.post("/surveys/from-volume")
async def create_survey_from_volume(
    workarea: str = Query(..., description="工区路径"),
    volume_id: int = Query(..., description="数据体 ID"),
    survey_name: str = Query(..., description="测网名称"),
):
    """Auto-create a survey from a seismic volume's geometry and trace headers."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT file_path, inline_min, inline_max, crossline_min, crossline_max FROM seismic_volumes WHERE id = ?",
            (volume_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="数据体不存在")
        file_path = row[0]
        il_min, il_max, xl_min, xl_max = row[1], row[2], row[3], row[4]

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"SEG-Y 文件不存在: {file_path}")

    # Extract coordinate transform from trace headers
    origin_x, origin_y = 0.0, 0.0
    il_dx, il_dy = 0.0, 0.0
    xl_dx, xl_dy = 0.0, 0.0
    il_step, xl_step = 1, 1

    try:
        with open_segy(file_path) as f:
            ilines = f.ilines
            xlines = f.xlines
            if ilines is None or xlines is None:
                raise HTTPException(status_code=400, detail="无法识别数据体测线几何信息")

            il_step = int(ilines[1] - ilines[0]) if len(ilines) > 1 else 1
            xl_step = int(xlines[1] - xlines[0]) if len(xlines) > 1 else 1

            def _read_coord(il_idx, xl_idx):
                trace_idx = il_idx * len(xlines) + xl_idx
                x = float(f.header[trace_idx].get(segyio.TraceField.CDP_X, 0))
                y = float(f.header[trace_idx].get(segyio.TraceField.CDP_Y, 0))
                scalar = int(f.header[trace_idx].get(segyio.TraceField.SourceGroupScalar, 0))
                if scalar < 0:
                    x /= abs(scalar)
                    y /= abs(scalar)
                elif scalar > 0:
                    x *= scalar
                    y *= scalar
                return x, y

            # Origin = first inline, first crossline
            origin_x, origin_y = _read_coord(0, 0)

            # Direction vectors: per-step increments
            if len(ilines) > 1:
                x1, y1 = _read_coord(1, 0)
                il_dx = x1 - origin_x
                il_dy = y1 - origin_y
            if len(xlines) > 1:
                x1, y1 = _read_coord(0, 1)
                xl_dx = x1 - origin_x
                xl_dy = y1 - origin_y

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取 SEG-Y 几何信息失败: {str(e)}")

    async with get_connection(workarea) as db:
        try:
            await db.execute(
                """INSERT INTO surveys
                   (name, inline_min, inline_max, inline_step,
                    crossline_min, crossline_max, crossline_step,
                    origin_x, origin_y,
                    inline_dx, inline_dy, crossline_dx, crossline_dy)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (survey_name, il_min, il_max, il_step,
                 xl_min, xl_max, xl_step,
                 origin_x, origin_y,
                 il_dx, il_dy, xl_dx, xl_dy),
            )
            await db.commit()
        except Exception as e:
            if "UNIQUE constraint" in str(e):
                raise HTTPException(status_code=409, detail=f"测网 '{survey_name}' 已存在")
            raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "ok",
        "message": f"从数据体创建测网 '{survey_name}' 成功",
        "survey": {
            "name": survey_name,
            "inline_min": il_min, "inline_max": il_max, "inline_step": il_step,
            "crossline_min": xl_min, "crossline_max": xl_max, "crossline_step": xl_step,
            "origin_x": origin_x, "origin_y": origin_y,
            "inline_dx": il_dx, "inline_dy": il_dy,
            "crossline_dx": xl_dx, "crossline_dy": xl_dy,
        },
    }


@router.delete("/surveys/{survey_name}")
async def delete_survey(
    survey_name: str,
    workarea: str = Query(..., description="工区路径"),
):
    """Delete a survey by name."""
    async with get_connection(workarea) as db:
        cursor = await db.execute("DELETE FROM surveys WHERE name = ?", (survey_name,))
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"测网 '{survey_name}' 不存在")
    return {"status": "ok", "message": f"测网 '{survey_name}' 已删除"}
