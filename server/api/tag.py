"""Tag management API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_connection

router = APIRouter(prefix="/tag", tags=["tag"])


class CreateTagRequest(BaseModel):
    workarea_path: str
    name: str
    color: str = "#409eff"


class UpdateTagRequest(BaseModel):
    workarea_path: str
    name: str | None = None
    color: str | None = None


class AssignTagsRequest(BaseModel):
    workarea_path: str
    well_name: str
    tag_ids: list[int]


@router.get("/list")
async def list_tags(workarea: str):
    """List all tags with well count."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            """SELECT t.id, t.name, t.color, t.created_at,
                      COUNT(wt.well_id) AS well_count
               FROM tags t
               LEFT JOIN well_tags wt ON t.id = wt.tag_id
               GROUP BY t.id
               ORDER BY t.created_at DESC"""
        )
        rows = await cursor.fetchall()
        return {
            "tags": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "color": r["color"],
                    "created_at": r["created_at"],
                    "well_count": r["well_count"],
                }
                for r in rows
            ]
        }


@router.post("/create")
async def create_tag(req: CreateTagRequest):
    """Create a new tag."""
    async with get_connection(req.workarea_path) as db:
        try:
            cursor = await db.execute(
                "INSERT INTO tags (name, color) VALUES (?, ?)",
                (req.name, req.color),
            )
            await db.commit()
            return {"id": cursor.lastrowid}
        except Exception:
            raise HTTPException(status_code=400, detail=f"标签 '{req.name}' 已存在")


@router.put("/{tag_id}")
async def update_tag(tag_id: int, req: UpdateTagRequest):
    """Update a tag."""
    async with get_connection(req.workarea_path) as db:
        fields = []
        values = []
        if req.name is not None:
            fields.append("name = ?")
            values.append(req.name)
        if req.color is not None:
            fields.append("color = ?")
            values.append(req.color)
        if not fields:
            return {"status": "ok"}
        values.append(tag_id)
        try:
            await db.execute(
                f"UPDATE tags SET {', '.join(fields)} WHERE id = ?", values
            )
            await db.commit()
        except Exception:
            raise HTTPException(status_code=400, detail="更新失败，标签名可能重复")
        return {"status": "ok"}


@router.delete("/{tag_id}")
async def delete_tag(tag_id: int, workarea: str):
    """Delete a tag (cascade deletes associations)."""
    async with get_connection(workarea) as db:
        await db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        await db.commit()
    return {"status": "ok"}


@router.post("/assign")
async def assign_tags(req: AssignTagsRequest):
    """Assign tags to a well (replace mode)."""
    async with get_connection(req.workarea_path) as db:
        cursor = await db.execute(
            "SELECT id FROM wells WHERE name = ?", (req.well_name,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"井 '{req.well_name}' 不存在")
        well_id = row["id"]

        await db.execute("DELETE FROM well_tags WHERE well_id = ?", (well_id,))
        for tag_id in req.tag_ids:
            await db.execute(
                "INSERT OR IGNORE INTO well_tags (well_id, tag_id) VALUES (?, ?)",
                (well_id, tag_id),
            )
        await db.commit()
    return {"status": "ok"}


@router.get("/well-tags/{well_name}")
async def get_well_tags(well_name: str, workarea: str):
    """Get tags for a well."""
    async with get_connection(workarea) as db:
        cursor = await db.execute(
            "SELECT id FROM wells WHERE name = ?", (well_name,)
        )
        row = await cursor.fetchone()
        if not row:
            return {"tags": []}
        well_id = row["id"]

        cursor = await db.execute(
            """SELECT t.id, t.name, t.color
               FROM tags t
               JOIN well_tags wt ON t.id = wt.tag_id
               WHERE wt.well_id = ?
               ORDER BY t.name""",
            (well_id,),
        )
        rows = await cursor.fetchall()
        return {
            "tags": [
                {"id": r["id"], "name": r["name"], "color": r["color"]}
                for r in rows
            ]
        }
