"""Well data query API endpoints."""

import math
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from db import get_connection

router = APIRouter(prefix="/well", tags=["well"])


@router.get("/list")
async def list_wells(workarea: str = Query(..., description="工区路径")):
    """List all wells in a workarea."""
    async with get_connection(workarea) as db:
        cursor = await db.execute("SELECT id, name, x, y, kb, td FROM wells ORDER BY name")
        rows = await cursor.fetchall()
        wells = [
            {"id": r[0], "name": r[1], "x": r[2], "y": r[3], "kb": r[4], "td": r[5]}
            for r in rows
        ]
        return {"status": "ok", "wells": wells}


@router.get("/{well_name}/curves")
async def get_well_curves(
    well_name: str, workarea: str = Query(..., description="工区路径")
):
    """Get list of curve names for a well."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT c.id, c.name, c.unit, c.sample_interval FROM curves c "
            "JOIN wells w ON c.well_id = w.id WHERE w.name = ? ORDER BY c.name",
            (well_name,),
        )
        rows = await cursor.fetchall()
        curves = [
            {"id": r[0], "name": r[1], "unit": r[2], "sample_interval": r[3]}
            for r in rows
        ]
        return {"status": "ok", "curves": curves}


@router.get("/{well_name}/curve-data")
async def get_curve_data(
    well_name: str,
    workarea: str = Query(..., description="工区路径"),
    curves: str = Query(..., description="曲线名称，逗号分隔"),
    depth_min: Optional[float] = Query(None, description="最小深度"),
    depth_max: Optional[float] = Query(None, description="最大深度"),
):
    """Get curve data for plotting."""
    curve_names = [c.strip() for c in curves.split(",") if c.strip()]
    if not curve_names:
        raise HTTPException(status_code=400, detail="请指定至少一条曲线")

    async with get_connection(workarea) as db:
        result = {}
        for cname in curve_names:
            query = (
                "SELECT cd.depth, cd.value FROM curve_data cd "
                "JOIN curves c ON cd.curve_id = c.id "
                "JOIN wells w ON c.well_id = w.id "
                "WHERE w.name = ? AND c.name = ?"
            )
            params: list = [well_name, cname]

            if depth_min is not None:
                query += " AND cd.depth >= ?"
                params.append(depth_min)
            if depth_max is not None:
                query += " AND cd.depth <= ?"
                params.append(depth_max)
            query += " ORDER BY cd.depth"

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            result[cname] = [{"depth": r[0], "value": r[1]} for r in rows]

        return {"status": "ok", "data": result}


@router.get("/{well_name}/layers")
async def get_well_layers(
    well_name: str, workarea: str = Query(..., description="工区路径")
):
    """Get layers for a well."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT l.id, l.formation, l.top_depth, l.bottom_depth FROM layers l "
            "JOIN wells w ON l.well_id = w.id WHERE w.name = ? ORDER BY l.top_depth",
            (well_name,),
        )
        rows = await cursor.fetchall()
        layers = [
            {"id": r[0], "formation": r[1], "top_depth": r[2], "bottom_depth": r[3]}
            for r in rows
        ]
        return {"status": "ok", "layers": layers}


@router.get("/{well_name}/lithology")
async def get_well_lithology(
    well_name: str, workarea: str = Query(..., description="工区路径")
):
    """Get lithology for a well."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT l.id, l.top_depth, l.bottom_depth, l.description FROM lithology l "
            "JOIN wells w ON l.well_id = w.id WHERE w.name = ? ORDER BY l.top_depth",
            (well_name,),
        )
        rows = await cursor.fetchall()
        entries = [
            {"id": r[0], "top_depth": r[1], "bottom_depth": r[2], "description": r[3]}
            for r in rows
        ]
        return {"status": "ok", "lithology": entries}


@router.get("/{well_name}/interpretation")
async def get_well_interpretation(
    well_name: str, workarea: str = Query(..., description="工区路径")
):
    """Get interpretation conclusions for a well."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT i.id, i.top_depth, i.bottom_depth, i.conclusion, i.category "
            "FROM interpretations i "
            "JOIN wells w ON i.well_id = w.id WHERE w.name = ? ORDER BY i.top_depth",
            (well_name,),
        )
        rows = await cursor.fetchall()
        entries = [
            {
                "id": r[0],
                "top_depth": r[1],
                "bottom_depth": r[2],
                "conclusion": r[3],
                "category": r[4],
            }
            for r in rows
        ]
        return {"status": "ok", "interpretations": entries}


@router.get("/{well_name}/discrete-curves")
async def get_discrete_curves(
    well_name: str, workarea: str = Query(..., description="工区路径")
):
    """Get discrete curve data for a well."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT dc.curve_name, dc.depth, dc.value FROM discrete_curves dc "
            "JOIN wells w ON dc.well_id = w.id WHERE w.name = ? ORDER BY dc.curve_name, dc.depth",
            (well_name,),
        )
        rows = await cursor.fetchall()
        # Group by curve name
        grouped: dict[str, list] = {}
        for r in rows:
            cname = r[0]
            if cname not in grouped:
                grouped[cname] = []
            grouped[cname].append({"depth": r[1], "value": r[2]})
        return {"status": "ok", "discrete_curves": grouped}


@router.get("/{well_name}/summary")
async def get_well_summary(
    well_name: str, workarea: str = Query(..., description="工区路径")
):
    """Get a summary of data available for a well."""
    async with get_connection(workarea) as db:
        # Get well info
        cursor = await db.execute(
            "SELECT id, name, x, y, kb, td FROM wells WHERE name = ?", (well_name,)
        )
        well_row = await cursor.fetchone()
        if not well_row:
            raise HTTPException(status_code=404, detail=f"井 '{well_name}' 不存在")

        well_id = well_row[0]

        # Count data types
        counts = {}
        for table, label in [
            ("curves", "曲线"),
            ("trajectories", "轨迹"),
            ("layers", "分层"),
            ("lithology", "岩性"),
            ("interpretations", "解释结论"),
            ("discrete_curves", "离散曲线"),
        ]:
            cursor = await db.execute(
                f"SELECT COUNT(*) FROM {table} WHERE well_id = ?", (well_id,)
            )
            row = await cursor.fetchone()
            counts[label] = row[0]

        return {
            "status": "ok",
            "well": {
                "id": well_row[0],
                "name": well_row[1],
                "x": well_row[2],
                "y": well_row[3],
                "kb": well_row[4],
                "td": well_row[5],
            },
            "data_counts": counts,
        }


@router.get("/{well_name}/query")
async def query_well_data(
    well_name: str,
    workarea: str = Query(..., description="工区路径"),
    curves: str = Query("", description="曲线名称，逗号分隔"),
    depth_min: Optional[float] = Query(None),
    depth_max: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=5000),
):
    """Query well curve data with pagination."""
    async with get_connection(workarea) as db:
        # Get well
        cursor = await db.execute("SELECT id FROM wells WHERE name = ?", (well_name,))
        well_row = await cursor.fetchone()
        if not well_row:
            raise HTTPException(status_code=404, detail=f"井 '{well_name}' 不存在")
        well_id = well_row[0]

        # Determine which curves to query
        curve_names = [c.strip() for c in curves.split(",") if c.strip()] if curves else []
        if not curve_names:
            # Get all curves
            cursor = await db.execute(
                "SELECT name FROM curves WHERE well_id = ? ORDER BY name", (well_id,)
            )
            curve_names = [r[0] for r in await cursor.fetchall()]

        if not curve_names:
            return {"status": "ok", "columns": ["深度"], "rows": [], "total": 0, "page": page, "page_size": page_size}

        # Get curve IDs
        curve_ids = {}
        for cn in curve_names:
            cursor = await db.execute(
                "SELECT id FROM curves WHERE well_id = ? AND name = ?", (well_id, cn)
            )
            row = await cursor.fetchone()
            if row:
                curve_ids[cn] = row[0]

        # Build depth-indexed data
        all_depths: set[float] = set()
        data_map: dict[str, dict[float, float | None]] = {cn: {} for cn in curve_ids}
        for cn, cid in curve_ids.items():
            query = "SELECT depth, value FROM curve_data WHERE curve_id = ?"
            params: list = [cid]
            if depth_min is not None:
                query += " AND depth >= ?"
                params.append(depth_min)
            if depth_max is not None:
                query += " AND depth <= ?"
                params.append(depth_max)
            query += " ORDER BY depth"
            cursor = await db.execute(query, params)
            for row in await cursor.fetchall():
                all_depths.add(row[0])
                data_map[cn][row[0]] = row[1]

        sorted_depths = sorted(all_depths)
        total = len(sorted_depths)
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        page_depths = sorted_depths[start:end]

        columns = ["深度"] + list(curve_ids.keys())
        rows = []
        for d in page_depths:
            row_data = [d]
            for cn in curve_ids:
                row_data.append(data_map[cn].get(d))
            rows.append(row_data)

        return {
            "status": "ok",
            "columns": columns,
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
