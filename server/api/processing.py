"""Curve processing API endpoints (resampling, filtering, standardization)."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db import get_connection, get_or_create_well
from interpolation import linear_interpolate
from filters import moving_average, median_filter

router = APIRouter(prefix="/well", tags=["processing"])


class ResampleRequest(BaseModel):
    workarea_path: str
    curve_name: str
    new_interval: float
    result_curve_name: str


class FilterRequest(BaseModel):
    workarea_path: str
    curve_name: str
    filter_type: str  # "moving_average" or "median"
    window_size: int
    result_curve_name: str


@router.post("/{well_name}/resample")
async def resample_curve(well_name: str, req: ResampleRequest):
    """Resample a curve to a new depth interval using linear interpolation."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        # Get source curve data
        cursor = await db.execute(
            "SELECT c.id FROM curves c WHERE c.well_id = ? AND c.name = ?",
            (well_id, req.curve_name),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"曲线 '{req.curve_name}' 不存在")
        src_curve_id = row[0]

        cursor = await db.execute(
            "SELECT depth, value FROM curve_data WHERE curve_id = ? ORDER BY depth",
            (src_curve_id,),
        )
        rows = await cursor.fetchall()
        depths = [r[0] for r in rows]
        values = [r[1] for r in rows]

        # Resample
        new_depths, new_values = linear_interpolate(depths, values, req.new_interval)

        # Save result as new curve
        await db.execute(
            """INSERT INTO curves (well_id, name, unit, sample_interval) VALUES (?, ?, '', ?)
               ON CONFLICT(well_id, name) DO UPDATE SET sample_interval=?""",
            (well_id, req.result_curve_name, req.new_interval, req.new_interval),
        )
        cursor = await db.execute(
            "SELECT id FROM curves WHERE well_id = ? AND name = ?",
            (well_id, req.result_curve_name),
        )
        new_curve_id = (await cursor.fetchone())[0]

        await db.execute("DELETE FROM curve_data WHERE curve_id = ?", (new_curve_id,))
        batch = [(new_curve_id, d, v) for d, v in zip(new_depths, new_values)]
        await db.executemany(
            "INSERT INTO curve_data (curve_id, depth, value) VALUES (?, ?, ?)", batch
        )
        await db.commit()

        return {
            "status": "ok",
            "message": f"重采样完成: {len(new_depths)} 个数据点 → 曲线 '{req.result_curve_name}'",
        }


@router.post("/{well_name}/filter")
async def filter_curve(well_name: str, req: FilterRequest):
    """Apply a filter to a curve and save as new curve."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        # Get source curve data
        cursor = await db.execute(
            "SELECT c.id, c.sample_interval FROM curves c WHERE c.well_id = ? AND c.name = ?",
            (well_id, req.curve_name),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"曲线 '{req.curve_name}' 不存在")
        src_curve_id = row[0]
        sample_interval = row[1]

        cursor = await db.execute(
            "SELECT depth, value FROM curve_data WHERE curve_id = ? ORDER BY depth",
            (src_curve_id,),
        )
        rows = await cursor.fetchall()
        depths = [r[0] for r in rows]
        values = [r[1] for r in rows]

        # Apply filter
        if req.filter_type == "moving_average":
            filtered = moving_average(values, req.window_size)
        elif req.filter_type == "median":
            filtered = median_filter(values, req.window_size)
        else:
            raise HTTPException(status_code=400, detail=f"未知滤波类型: {req.filter_type}")

        # Save result
        await db.execute(
            """INSERT INTO curves (well_id, name, unit, sample_interval) VALUES (?, ?, '', ?)
               ON CONFLICT(well_id, name) DO UPDATE SET sample_interval=?""",
            (well_id, req.result_curve_name, sample_interval, sample_interval),
        )
        cursor = await db.execute(
            "SELECT id FROM curves WHERE well_id = ? AND name = ?",
            (well_id, req.result_curve_name),
        )
        new_curve_id = (await cursor.fetchone())[0]

        await db.execute("DELETE FROM curve_data WHERE curve_id = ?", (new_curve_id,))
        batch = [(new_curve_id, d, v) for d, v in zip(depths, filtered)]
        await db.executemany(
            "INSERT INTO curve_data (curve_id, depth, value) VALUES (?, ?, ?)", batch
        )
        await db.commit()

        return {
            "status": "ok",
            "message": f"滤波完成: {len(depths)} 个数据点 → 曲线 '{req.result_curve_name}'",
        }


class StandardizeRequest(BaseModel):
    workarea_path: str
    curve_name: str
    method: str  # "zscore", "minmax", "normalize"
    result_curve_name: str


@router.post("/{well_name}/standardize")
async def standardize_curve(well_name: str, req: StandardizeRequest):
    """Standardize a curve using Z-Score, Min-Max, or Normalize method."""
    if req.method not in ("zscore", "minmax", "normalize"):
        raise HTTPException(status_code=400, detail=f"未知标准化方法: {req.method}")

    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        cursor = await db.execute(
            "SELECT c.id, c.sample_interval FROM curves c WHERE c.well_id = ? AND c.name = ?",
            (well_id, req.curve_name),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"曲线 '{req.curve_name}' 不存在")
        src_curve_id = row[0]
        sample_interval = row[1]

        cursor = await db.execute(
            "SELECT depth, value FROM curve_data WHERE curve_id = ? ORDER BY depth",
            (src_curve_id,),
        )
        rows = await cursor.fetchall()
        depths = [r[0] for r in rows]
        values = [r[1] for r in rows]

        # Filter out None values for stats calculation
        valid = [v for v in values if v is not None]
        if len(valid) == 0:
            raise HTTPException(status_code=400, detail="曲线数据为空")

        if req.method == "zscore":
            mean = sum(valid) / len(valid)
            std = (sum((v - mean) ** 2 for v in valid) / len(valid)) ** 0.5
            if std == 0:
                raise HTTPException(status_code=400, detail="标准差为0，无法进行Z-Score标准化")
            result = [(v - mean) / std if v is not None else None for v in values]
        elif req.method in ("minmax", "normalize"):
            vmin = min(valid)
            vmax = max(valid)
            rng = vmax - vmin
            if rng == 0:
                raise HTTPException(status_code=400, detail="最大值等于最小值，无法进行Min-Max标准化")
            result = [(v - vmin) / rng if v is not None else None for v in values]

        method_name = {"zscore": "Z-Score", "minmax": "Min-Max", "normalize": "归一化"}[req.method]

        # Save result
        await db.execute(
            """INSERT INTO curves (well_id, name, unit, sample_interval) VALUES (?, ?, '', ?)
               ON CONFLICT(well_id, name) DO UPDATE SET sample_interval=?""",
            (well_id, req.result_curve_name, sample_interval, sample_interval),
        )
        cursor = await db.execute(
            "SELECT id FROM curves WHERE well_id = ? AND name = ?",
            (well_id, req.result_curve_name),
        )
        new_curve_id = (await cursor.fetchone())[0]

        await db.execute("DELETE FROM curve_data WHERE curve_id = ?", (new_curve_id,))
        batch = [(new_curve_id, d, v) for d, v in zip(depths, result)]
        await db.executemany(
            "INSERT INTO curve_data (curve_id, depth, value) VALUES (?, ?, ?)", batch
        )
        await db.commit()

        return {
            "status": "ok",
            "message": f"{method_name}完成: {len(depths)} 个数据点 → 曲线 '{req.result_curve_name}'",
        }
