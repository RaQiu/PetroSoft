"""Horizon data API endpoints."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import numpy as np

from db import get_connection

router = APIRouter(prefix="/horizons", tags=["horizons"])


# -- Request models -----------------------------------------------------------

class HorizonFromWellTopsRequest(BaseModel):
    workarea_path: str
    formation: str
    horizon_name: str
    domain: str = "depth"  # depth or time


class HorizonSmoothRequest(BaseModel):
    workarea_path: str
    horizon_name: str
    method: str = "mean"  # mean, median, gaussian
    window_size: int = 3
    result_name: str = ""


class HorizonCalcRequest(BaseModel):
    workarea_path: str
    horizon_a: str
    horizon_b: Optional[str] = None
    operation: str = "subtract"  # add, subtract, multiply, divide, scale, offset
    constant: float = 0.0
    result_name: str = ""


class HorizonInterpolateRequest(BaseModel):
    workarea_path: str
    horizon_name: str
    method: str = "linear"  # linear, nearest, cubic
    result_name: str = ""


class HorizonMergeRequest(BaseModel):
    workarea_path: str
    horizons: List[str]
    strategy: str = "average"  # average, first, min, max
    result_name: str = ""


class HorizonDecimateRequest(BaseModel):
    workarea_path: str
    horizon_name: str
    factor: int = 2
    result_name: str = ""


# -- Helpers -------------------------------------------------------------------

async def _get_horizon_id(db, name: str) -> int:
    cursor = await db.execute("SELECT id FROM horizons WHERE name = ?", (name,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"层位 '{name}' 不存在")
    return row[0]


async def _load_horizon_data(db, horizon_id: int):
    """Load horizon data as list of dicts."""
    cursor = await db.execute(
        "SELECT inline_no, crossline_no, x, y, value FROM horizon_data WHERE horizon_id = ? ORDER BY inline_no, crossline_no",
        (horizon_id,),
    )
    rows = await cursor.fetchall()
    return [
        {"inline_no": r[0], "crossline_no": r[1], "x": r[2], "y": r[3], "value": r[4]}
        for r in rows
    ]


async def _save_horizon(db, name: str, domain: str, data_points: list):
    """Save a horizon with data points. Overwrites if exists."""
    cursor = await db.execute("SELECT id FROM horizons WHERE name = ?", (name,))
    row = await cursor.fetchone()
    if row:
        hid = row[0]
        await db.execute("DELETE FROM horizon_data WHERE horizon_id = ?", (hid,))
        await db.execute("UPDATE horizons SET domain = ? WHERE id = ?", (domain, hid))
    else:
        cursor = await db.execute(
            "INSERT INTO horizons (name, domain) VALUES (?, ?)", (name, domain)
        )
        hid = cursor.lastrowid

    if data_points:
        await db.executemany(
            "INSERT INTO horizon_data (horizon_id, inline_no, crossline_no, x, y, value) VALUES (?, ?, ?, ?, ?, ?)",
            [(hid, p.get("inline_no"), p.get("crossline_no"), p.get("x"), p.get("y"), p["value"]) for p in data_points],
        )
    await db.commit()
    return hid


# -- Endpoints -----------------------------------------------------------------

@router.get("/list")
async def list_horizons(workarea: str = Query(...)):
    """List all horizons in the workarea."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT h.id, h.name, h.domain, h.created_at, COUNT(hd.id) as point_count "
            "FROM horizons h LEFT JOIN horizon_data hd ON h.id = hd.horizon_id "
            "GROUP BY h.id ORDER BY h.name"
        )
        rows = await cursor.fetchall()
        return {
            "status": "ok",
            "horizons": [
                {"id": r[0], "name": r[1], "domain": r[2], "created_at": r[3], "point_count": r[4]}
                for r in rows
            ],
        }


@router.get("/formations")
async def list_formations(workarea: str = Query(...)):
    """List distinct formation names from layers table."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT DISTINCT formation FROM layers WHERE formation IS NOT NULL AND formation != '' ORDER BY formation"
        )
        rows = await cursor.fetchall()
        return {"status": "ok", "formations": [r[0] for r in rows]}


@router.post("/from-well-tops")
async def create_horizon_from_well_tops(req: HorizonFromWellTopsRequest):
    """Create a horizon from well layer (formation top) picks."""
    async with get_connection(req.workarea_path) as db:
        # Get wells with this formation
        cursor = await db.execute(
            """SELECT w.name, w.x, w.y, l.top_depth
               FROM layers l
               JOIN wells w ON l.well_id = w.id
               WHERE l.formation = ?
               ORDER BY w.name""",
            (req.formation,),
        )
        rows = await cursor.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail=f"未找到分层 '{req.formation}' 的数据")

        data_points = []
        wells_used = []
        for r in rows:
            well_name, wx, wy, top_depth = r[0], r[1], r[2], r[3]
            if top_depth is None:
                continue

            value = top_depth
            # If time domain requested, try to convert using time-depth table
            if req.domain == "time":
                well_cursor = await db.execute("SELECT id FROM wells WHERE name = ?", (well_name,))
                well_row = await well_cursor.fetchone()
                if well_row:
                    td_cursor = await db.execute(
                        "SELECT depth, time FROM time_depth WHERE well_id = ? ORDER BY depth",
                        (well_row[0],),
                    )
                    td_rows = await td_cursor.fetchall()
                    if td_rows:
                        depths = [t[0] for t in td_rows]
                        times = [t[1] for t in td_rows]
                        # Linear interpolation
                        value = float(np.interp(top_depth, depths, times))

            data_points.append({
                "inline_no": None,
                "crossline_no": None,
                "x": wx,
                "y": wy,
                "value": value,
            })
            wells_used.append(well_name)

        if not data_points:
            raise HTTPException(status_code=400, detail="无有效的井分层数据点")

        await _save_horizon(db, req.horizon_name, req.domain, data_points)

    return {
        "status": "ok",
        "message": f"层位 '{req.horizon_name}' 已创建，包含 {len(data_points)} 个井点 ({', '.join(wells_used[:5])}{'...' if len(wells_used) > 5 else ''})",
    }


@router.post("/smooth")
async def smooth_horizon(req: HorizonSmoothRequest):
    """Smooth a horizon using moving average, median, or Gaussian filter."""
    result_name = req.result_name or f"{req.horizon_name}_smooth"

    async with get_connection(req.workarea_path) as db:
        hid = await _get_horizon_id(db, req.horizon_name)
        data = await _load_horizon_data(db, hid)

        if not data:
            raise HTTPException(status_code=400, detail="层位数据为空")

        # Get domain
        cursor = await db.execute("SELECT domain FROM horizons WHERE id = ?", (hid,))
        domain = (await cursor.fetchone())[0]

        # Check if grid-based (inline/crossline) or scattered (x/y)
        has_grid = data[0]["inline_no"] is not None
        values = np.array([p["value"] for p in data], dtype=float)

        if has_grid:
            # Build 2D grid
            inlines = sorted(set(p["inline_no"] for p in data))
            xlines = sorted(set(p["crossline_no"] for p in data))
            il_idx = {v: i for i, v in enumerate(inlines)}
            xl_idx = {v: i for i, v in enumerate(xlines)}
            grid = np.full((len(inlines), len(xlines)), np.nan)
            for p in data:
                grid[il_idx[p["inline_no"]], xl_idx[p["crossline_no"]]] = p["value"]

            # Apply smoothing
            from scipy.ndimage import uniform_filter, median_filter, gaussian_filter
            mask = ~np.isnan(grid)
            grid_filled = np.nan_to_num(grid, nan=np.nanmean(grid))

            if req.method == "mean":
                smoothed = uniform_filter(grid_filled, size=req.window_size)
            elif req.method == "median":
                smoothed = median_filter(grid_filled, size=req.window_size)
            elif req.method == "gaussian":
                smoothed = gaussian_filter(grid_filled, sigma=req.window_size / 2.0)
            else:
                raise HTTPException(status_code=400, detail=f"未知平滑方法: {req.method}")

            # Only keep original data positions
            result_points = []
            for p in data:
                i, j = il_idx[p["inline_no"]], xl_idx[p["crossline_no"]]
                result_points.append({
                    "inline_no": p["inline_no"],
                    "crossline_no": p["crossline_no"],
                    "x": p["x"],
                    "y": p["y"],
                    "value": float(smoothed[i, j]),
                })
        else:
            # Scattered points: simple moving average on sorted values
            w = req.window_size
            if req.method == "median":
                smoothed_vals = _moving_median(values, w)
            else:
                kernel = np.ones(w) / w
                smoothed_vals = np.convolve(values, kernel, mode="same")
            result_points = []
            for idx, p in enumerate(data):
                result_points.append({**p, "value": float(smoothed_vals[idx])})

        await _save_horizon(db, result_name, domain, result_points)

    return {"status": "ok", "message": f"层位平滑完成，结果保存为 '{result_name}'，共 {len(result_points)} 个点"}


def _moving_median(arr, w):
    """Simple moving median for 1D array."""
    result = np.empty_like(arr)
    half = w // 2
    for i in range(len(arr)):
        start = max(0, i - half)
        end = min(len(arr), i + half + 1)
        result[i] = np.median(arr[start:end])
    return result


@router.post("/calculate")
async def calculate_horizon(req: HorizonCalcRequest):
    """Arithmetic operations on horizons."""
    result_name = req.result_name or f"{req.horizon_a}_calc"

    async with get_connection(req.workarea_path) as db:
        hid_a = await _get_horizon_id(db, req.horizon_a)
        data_a = await _load_horizon_data(db, hid_a)
        cursor = await db.execute("SELECT domain FROM horizons WHERE id = ?", (hid_a,))
        domain = (await cursor.fetchone())[0]

        if not data_a:
            raise HTTPException(status_code=400, detail=f"层位 '{req.horizon_a}' 数据为空")

        if req.operation in ("scale", "offset"):
            # Single-horizon operations with constant
            result_points = []
            for p in data_a:
                if req.operation == "scale":
                    new_val = p["value"] * req.constant
                else:
                    new_val = p["value"] + req.constant
                result_points.append({**p, "value": float(new_val)})
        else:
            # Two-horizon operations
            if not req.horizon_b:
                raise HTTPException(status_code=400, detail="双层位运算需要指定第二个层位")
            hid_b = await _get_horizon_id(db, req.horizon_b)
            data_b = await _load_horizon_data(db, hid_b)

            # Build lookup for B
            has_grid = data_a[0]["inline_no"] is not None
            if has_grid:
                b_map = {(p["inline_no"], p["crossline_no"]): p["value"] for p in data_b}
            else:
                # For scattered, match by x,y
                b_map = {}
                for p in data_b:
                    b_map[(round(p["x"] or 0, 2), round(p["y"] or 0, 2))] = p["value"]

            result_points = []
            for p in data_a:
                if has_grid:
                    key = (p["inline_no"], p["crossline_no"])
                else:
                    key = (round(p["x"] or 0, 2), round(p["y"] or 0, 2))

                val_b = b_map.get(key)
                if val_b is None:
                    continue

                if req.operation == "add":
                    new_val = p["value"] + val_b
                elif req.operation == "subtract":
                    new_val = p["value"] - val_b
                elif req.operation == "multiply":
                    new_val = p["value"] * val_b
                elif req.operation == "divide":
                    new_val = p["value"] / val_b if val_b != 0 else float("nan")
                else:
                    raise HTTPException(status_code=400, detail=f"未知运算: {req.operation}")
                result_points.append({**p, "value": float(new_val)})

        await _save_horizon(db, result_name, domain, result_points)

    return {"status": "ok", "message": f"层位计算完成，结果保存为 '{result_name}'，共 {len(result_points)} 个点"}


@router.post("/interpolate")
async def interpolate_horizon(req: HorizonInterpolateRequest):
    """Interpolate missing values in a horizon grid."""
    result_name = req.result_name or f"{req.horizon_name}_interp"

    async with get_connection(req.workarea_path) as db:
        hid = await _get_horizon_id(db, req.horizon_name)
        data = await _load_horizon_data(db, hid)
        cursor = await db.execute("SELECT domain FROM horizons WHERE id = ?", (hid,))
        domain = (await cursor.fetchone())[0]

        if not data:
            raise HTTPException(status_code=400, detail="层位数据为空")

        has_grid = data[0]["inline_no"] is not None

        if has_grid:
            # Grid-based interpolation
            inlines = sorted(set(p["inline_no"] for p in data))
            xlines = sorted(set(p["crossline_no"] for p in data))
            il_idx = {v: i for i, v in enumerate(inlines)}
            xl_idx = {v: i for i, v in enumerate(xlines)}
            grid = np.full((len(inlines), len(xlines)), np.nan)
            for p in data:
                grid[il_idx[p["inline_no"]], xl_idx[p["crossline_no"]]] = p["value"]

            # Count NaN before
            nan_before = int(np.sum(np.isnan(grid)))

            if nan_before > 0 and nan_before < grid.size:
                from scipy.interpolate import griddata
                # Known points
                known_mask = ~np.isnan(grid)
                known_ij = np.argwhere(known_mask)
                known_vals = grid[known_mask]
                # All points
                all_i, all_j = np.meshgrid(range(len(inlines)), range(len(xlines)), indexing="ij")
                all_points = np.column_stack([all_i.ravel(), all_j.ravel()])
                interpolated = griddata(known_ij, known_vals, all_points, method=req.method, fill_value=np.nan)
                grid_interp = interpolated.reshape(grid.shape)
            else:
                grid_interp = grid

            # Build result
            result_points = []
            for i, il in enumerate(inlines):
                for j, xl in enumerate(xlines):
                    v = grid_interp[i, j]
                    if not np.isnan(v):
                        result_points.append({
                            "inline_no": il,
                            "crossline_no": xl,
                            "x": None,
                            "y": None,
                            "value": float(v),
                        })
        else:
            # Scattered point interpolation using scipy
            from scipy.interpolate import griddata
            xs = np.array([p["x"] or 0 for p in data])
            ys = np.array([p["y"] or 0 for p in data])
            vals = np.array([p["value"] for p in data])
            known_mask = ~np.isnan(vals)
            if np.sum(known_mask) < 3:
                raise HTTPException(status_code=400, detail="有效数据点不足，无法插值")

            # Create a regular grid
            x_min, x_max = float(xs.min()), float(xs.max())
            y_min, y_max = float(ys.min()), float(ys.max())
            nx = max(int((x_max - x_min) / max((x_max - x_min) / 50, 1)), 10)
            ny = max(int((y_max - y_min) / max((y_max - y_min) / 50, 1)), 10)
            gx, gy = np.meshgrid(np.linspace(x_min, x_max, nx), np.linspace(y_min, y_max, ny))
            gz = griddata(
                np.column_stack([xs[known_mask], ys[known_mask]]),
                vals[known_mask],
                (gx, gy),
                method=req.method,
            )
            result_points = []
            for i in range(ny):
                for j in range(nx):
                    v = gz[i, j]
                    if not np.isnan(v):
                        result_points.append({
                            "inline_no": None,
                            "crossline_no": None,
                            "x": float(gx[i, j]),
                            "y": float(gy[i, j]),
                            "value": float(v),
                        })

        await _save_horizon(db, result_name, domain, result_points)

    return {"status": "ok", "message": f"层位插值完成，结果保存为 '{result_name}'，共 {len(result_points)} 个点"}


@router.post("/merge")
async def merge_horizons(req: HorizonMergeRequest):
    """Merge multiple horizons into one."""
    if len(req.horizons) < 2:
        raise HTTPException(status_code=400, detail="至少需要两个层位进行合并")
    result_name = req.result_name or f"{'_'.join(req.horizons[:3])}_merge"

    async with get_connection(req.workarea_path) as db:
        all_data = {}
        domain = "depth"
        for hname in req.horizons:
            hid = await _get_horizon_id(db, hname)
            cursor = await db.execute("SELECT domain FROM horizons WHERE id = ?", (hid,))
            domain = (await cursor.fetchone())[0]
            data = await _load_horizon_data(db, hid)
            for p in data:
                has_grid = p["inline_no"] is not None
                if has_grid:
                    key = (p["inline_no"], p["crossline_no"])
                else:
                    key = (round(p["x"] or 0, 2), round(p["y"] or 0, 2))
                if key not in all_data:
                    all_data[key] = {"meta": p, "values": []}
                all_data[key]["values"].append(p["value"])

        result_points = []
        for key, item in all_data.items():
            vals = [v for v in item["values"] if v is not None and not np.isnan(v)]
            if not vals:
                continue
            if req.strategy == "average":
                merged = float(np.mean(vals))
            elif req.strategy == "first":
                merged = vals[0]
            elif req.strategy == "min":
                merged = float(np.min(vals))
            elif req.strategy == "max":
                merged = float(np.max(vals))
            else:
                merged = float(np.mean(vals))
            result_points.append({**item["meta"], "value": merged})

        await _save_horizon(db, result_name, domain, result_points)

    return {"status": "ok", "message": f"层位合并完成，结果保存为 '{result_name}'，共 {len(result_points)} 个点"}


@router.post("/decimate")
async def decimate_horizon(req: HorizonDecimateRequest):
    """Decimate (thin out) a horizon by keeping every Nth point."""
    if req.factor < 2:
        raise HTTPException(status_code=400, detail="抽稀因子必须 >= 2")
    result_name = req.result_name or f"{req.horizon_name}_dec{req.factor}"

    async with get_connection(req.workarea_path) as db:
        hid = await _get_horizon_id(db, req.horizon_name)
        data = await _load_horizon_data(db, hid)
        cursor = await db.execute("SELECT domain FROM horizons WHERE id = ?", (hid,))
        domain = (await cursor.fetchone())[0]

        if not data:
            raise HTTPException(status_code=400, detail="层位数据为空")

        has_grid = data[0]["inline_no"] is not None
        if has_grid:
            inlines = sorted(set(p["inline_no"] for p in data))
            xlines = sorted(set(p["crossline_no"] for p in data))
            keep_il = set(inlines[::req.factor])
            keep_xl = set(xlines[::req.factor])
            result_points = [
                p for p in data
                if p["inline_no"] in keep_il and p["crossline_no"] in keep_xl
            ]
        else:
            result_points = data[::req.factor]

        await _save_horizon(db, result_name, domain, result_points)

    return {"status": "ok", "message": f"层位抽稀完成，结果保存为 '{result_name}'，{len(data)} → {len(result_points)} 个点"}


@router.delete("/{horizon_name}")
async def delete_horizon(
    horizon_name: str,
    workarea: str = Query(...),
):
    """Delete a horizon."""
    async with get_connection(workarea) as db:
        hid = await _get_horizon_id(db, horizon_name)
        await db.execute("DELETE FROM horizon_data WHERE horizon_id = ?", (hid,))
        await db.execute("DELETE FROM horizons WHERE id = ?", (hid,))
        await db.commit()
    return {"status": "ok", "message": f"层位 '{horizon_name}' 已删除"}
