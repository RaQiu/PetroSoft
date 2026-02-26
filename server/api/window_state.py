"""Window state persistence API — save/restore open child windows per workarea."""

from fastapi import APIRouter
from pydantic import BaseModel

from db import get_connection

router = APIRouter(prefix="/window-state", tags=["window-state"])


class WindowState(BaseModel):
    window_id: str
    title: str = ""
    pos_x: float | None = None
    pos_y: float | None = None
    width: float | None = None
    height: float | None = None
    preset_data: str = "{}"


class SaveWindowStatesRequest(BaseModel):
    workarea_path: str
    windows: list[WindowState]


@router.get("/list")
async def list_windows(workarea: str):
    """Return all saved window states for a workarea."""
    async with get_connection(workarea) as db:
        cursor = await db.execute("SELECT * FROM open_windows")
        rows = await cursor.fetchall()
        return {
            "windows": [
                {
                    "window_id": r["window_id"],
                    "title": r["title"],
                    "pos_x": r["pos_x"],
                    "pos_y": r["pos_y"],
                    "width": r["width"],
                    "height": r["height"],
                    "preset_data": r["preset_data"],
                }
                for r in rows
            ]
        }


@router.post("/save")
async def save_windows(req: SaveWindowStatesRequest):
    """Full replace — clear then insert all current windows."""
    async with get_connection(req.workarea_path) as db:
        await db.execute("DELETE FROM open_windows")
        for w in req.windows:
            await db.execute(
                "INSERT INTO open_windows (window_id, title, pos_x, pos_y, width, height, preset_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (w.window_id, w.title, w.pos_x, w.pos_y, w.width, w.height, w.preset_data),
            )
        await db.commit()
    return {"status": "ok"}


@router.delete("/clear")
async def clear_windows(workarea: str):
    """Clear all saved window states."""
    async with get_connection(workarea) as db:
        await db.execute("DELETE FROM open_windows")
        await db.commit()
    return {"status": "ok"}
