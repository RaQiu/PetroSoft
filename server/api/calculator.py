"""Curve calculator API endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_connection, get_or_create_well
from calculator import evaluate_expression

router = APIRouter(prefix="/well", tags=["calculator"])


class CalculateRequest(BaseModel):
    workarea_path: str
    expression: str
    result_curve_name: str
    result_unit: str = ""


@router.post("/{well_name}/calculate")
async def calculate_curve(well_name: str, req: CalculateRequest):
    """Create a new curve from a mathematical expression of existing curves."""
    async with get_connection(req.workarea_path) as db:
        well_id = await get_or_create_well(db, well_name)

        # Get all curves for this well
        cursor = await db.execute(
            "SELECT c.id, c.name, c.sample_interval FROM curves c WHERE c.well_id = ?",
            (well_id,),
        )
        curve_rows = await cursor.fetchall()
        curve_map = {r[1]: r[0] for r in curve_rows}
        sample_interval = curve_rows[0][2] if curve_rows else 0.125

        # Only load curves that are referenced in the expression
        curve_data: dict[str, list[tuple[float, float | None]]] = {}
        for cname, cid in curve_map.items():
            if cname not in req.expression:
                continue
            cursor = await db.execute(
                "SELECT depth, value FROM curve_data WHERE curve_id = ? ORDER BY depth",
                (cid,),
            )
            rows = await cursor.fetchall()
            curve_data[cname] = [(r[0], r[1]) for r in rows]

        # Evaluate expression
        try:
            result = evaluate_expression(req.expression, curve_data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Save result curve
        await db.execute(
            """INSERT INTO curves (well_id, name, unit, sample_interval) VALUES (?, ?, ?, ?)
               ON CONFLICT(well_id, name) DO UPDATE SET unit=?, sample_interval=?""",
            (well_id, req.result_curve_name, req.result_unit, sample_interval,
             req.result_unit, sample_interval),
        )
        cursor = await db.execute(
            "SELECT id FROM curves WHERE well_id = ? AND name = ?",
            (well_id, req.result_curve_name),
        )
        new_curve_id = (await cursor.fetchone())[0]

        await db.execute("DELETE FROM curve_data WHERE curve_id = ?", (new_curve_id,))
        batch = [(new_curve_id, d, v) for d, v in result]
        await db.executemany(
            "INSERT INTO curve_data (curve_id, depth, value) VALUES (?, ?, ?)", batch
        )
        await db.commit()

        valid_count = sum(1 for _, v in result if v is not None)
        return {
            "status": "ok",
            "message": f"计算完成: {valid_count} 个有效数据点 → 曲线 '{req.result_curve_name}'",
        }
