"""Result chart management API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_connection

router = APIRouter(prefix="/chart", tags=["chart"])


class SaveChartRequest(BaseModel):
    workarea_path: str
    name: str
    chart_type: str
    thumbnail: str = ""
    config: str = "{}"


class RenameChartRequest(BaseModel):
    workarea_path: str
    name: str


@router.get("/list")
async def list_charts(workarea: str, chart_type: str = ""):
    """List all charts (thumbnail omitted for performance)."""
    async with get_connection(workarea) as db:
        if chart_type:
            cursor = await db.execute(
                "SELECT id, name, chart_type, created_at FROM result_charts WHERE chart_type = ? ORDER BY created_at DESC",
                (chart_type,),
            )
        else:
            cursor = await db.execute(
                "SELECT id, name, chart_type, created_at FROM result_charts ORDER BY created_at DESC"
            )
        rows = await cursor.fetchall()
        return {
            "charts": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "chart_type": r["chart_type"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]
        }


@router.get("/{chart_id}")
async def get_chart(chart_id: int, workarea: str):
    """Get chart detail with thumbnail."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT * FROM result_charts WHERE id = ?", (chart_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="成果图不存在")
        return {
            "id": row["id"],
            "name": row["name"],
            "chart_type": row["chart_type"],
            "thumbnail": row["thumbnail"],
            "config": row["config"],
            "created_at": row["created_at"],
        }


@router.post("/save")
async def save_chart(req: SaveChartRequest):
    """Save a chart."""
    async with get_connection(req.workarea_path) as db:
        cursor = await db.execute(
            "INSERT INTO result_charts (name, chart_type, thumbnail, config) VALUES (?, ?, ?, ?)",
            (req.name, req.chart_type, req.thumbnail, req.config),
        )
        await db.commit()
        return {"id": cursor.lastrowid}


@router.put("/{chart_id}")
async def rename_chart(chart_id: int, req: RenameChartRequest):
    """Rename a chart."""
    async with get_connection(req.workarea_path) as db:
        await db.execute(
            "UPDATE result_charts SET name = ? WHERE id = ?",
            (req.name, chart_id),
        )
        await db.commit()
    return {"status": "ok"}


@router.delete("/{chart_id}")
async def delete_chart(chart_id: int, workarea: str):
    """Delete a chart."""
    async with get_connection(workarea) as db:
        await db.execute("DELETE FROM result_charts WHERE id = ?", (chart_id,))
        await db.commit()
    return {"status": "ok"}
