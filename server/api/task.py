"""Task management API endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

from db import get_connection

router = APIRouter(prefix="/task", tags=["task"])


class CreateTaskRequest(BaseModel):
    workarea_path: str
    task_type: str
    well_name: str
    params: str = "{}"
    status: str = "success"
    result_message: str = ""


class ClearTasksRequest(BaseModel):
    workarea_path: str


@router.get("/list")
async def list_tasks(
    workarea: str,
    page: int = 1,
    page_size: int = 50,
    task_type: str = "",
    status: str = "",
):
    """List tasks with pagination and filtering."""
    async with get_connection(workarea) as db:
        conditions = []
        params = []
        if task_type:
            conditions.append("task_type = ?")
            params.append(task_type)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Count total
        cursor = await db.execute(f"SELECT COUNT(*) FROM tasks {where}", params)
        row = await cursor.fetchone()
        total = row[0]

        # Fetch page
        offset = (page - 1) * page_size
        cursor = await db.execute(
            f"SELECT * FROM tasks {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [page_size, offset],
        )
        rows = await cursor.fetchall()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "tasks": [
                {
                    "id": r["id"],
                    "task_type": r["task_type"],
                    "well_name": r["well_name"],
                    "params": r["params"],
                    "status": r["status"],
                    "result_message": r["result_message"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ],
        }


@router.post("/create")
async def create_task(req: CreateTaskRequest):
    """Create a task record."""
    async with get_connection(req.workarea_path) as db:
        await db.execute(
            "INSERT INTO tasks (task_type, well_name, params, status, result_message) VALUES (?, ?, ?, ?, ?)",
            (req.task_type, req.well_name, req.params, req.status, req.result_message),
        )
        await db.commit()
    return {"status": "ok"}


@router.delete("/{task_id}")
async def delete_task(task_id: int, workarea: str):
    """Delete a single task."""
    async with get_connection(workarea) as db:
        await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        await db.commit()
    return {"status": "ok"}


@router.post("/clear")
async def clear_tasks(req: ClearTasksRequest):
    """Clear all tasks."""
    async with get_connection(req.workarea_path) as db:
        await db.execute("DELETE FROM tasks")
        await db.commit()
    return {"status": "ok"}
