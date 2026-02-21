"""Workarea management API endpoints."""

import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db import init_db, get_connection

router = APIRouter(prefix="/workarea", tags=["workarea"])

# Config file to track known workareas
CONFIG_DIR = os.path.expanduser("~/.petrosoft")
WORKAREA_CONFIG = os.path.join(CONFIG_DIR, "workareas.json")


def _load_workareas() -> list[dict]:
    """Load workarea list from config."""
    if not os.path.exists(WORKAREA_CONFIG):
        return []
    with open(WORKAREA_CONFIG, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_workareas(workareas: list[dict]) -> None:
    """Save workarea list to config."""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(WORKAREA_CONFIG, "w", encoding="utf-8") as f:
        json.dump(workareas, f, ensure_ascii=False, indent=2)


class CreateWorkareaRequest(BaseModel):
    name: str
    path: str


class OpenWorkareaRequest(BaseModel):
    path: str


@router.post("/create")
async def create_workarea(req: CreateWorkareaRequest):
    """Create a new workarea directory and initialize its database."""
    workarea_path = os.path.join(req.path, req.name)
    try:
        os.makedirs(workarea_path, exist_ok=True)
        await init_db(workarea_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Register in config
    workareas = _load_workareas()
    workareas = [w for w in workareas if w["path"] != workarea_path]
    workareas.append({
        "name": req.name,
        "path": workarea_path,
        "last_opened": datetime.now().isoformat(),
    })
    _save_workareas(workareas)

    return {"status": "ok", "name": req.name, "path": workarea_path}


@router.get("/list")
async def list_workareas():
    """List all registered workareas."""
    workareas = _load_workareas()
    valid = [w for w in workareas if os.path.isdir(w["path"])]
    if len(valid) != len(workareas):
        _save_workareas(valid)
    return {"status": "ok", "workareas": valid}


@router.post("/open")
async def open_workarea(req: OpenWorkareaRequest):
    """Open an existing workarea and return summary info."""
    if not os.path.isdir(req.path):
        raise HTTPException(status_code=404, detail="工区目录不存在")

    db_file = os.path.join(req.path, "petrosoft.db")
    if not os.path.exists(db_file):
        await init_db(req.path)

    async with get_connection(req.path) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM wells")
        row = await cursor.fetchone()
        well_count = row[0]

    name = os.path.basename(req.path)

    workareas = _load_workareas()
    found = False
    for w in workareas:
        if w["path"] == req.path:
            w["last_opened"] = datetime.now().isoformat()
            found = True
            break
    if not found:
        workareas.append({
            "name": name,
            "path": req.path,
            "last_opened": datetime.now().isoformat(),
        })
    _save_workareas(workareas)

    return {
        "status": "ok",
        "name": name,
        "path": req.path,
        "well_count": well_count,
    }


@router.get("/recent")
async def get_recent_workareas():
    """Get the 5 most recently opened workareas."""
    workareas = _load_workareas()
    valid = [w for w in workareas if os.path.isdir(w["path"])]
    # Sort by last_opened descending
    valid.sort(key=lambda w: w.get("last_opened", ""), reverse=True)
    return {"status": "ok", "workareas": valid[:5]}


@router.delete("/remove")
async def delete_workarea(path: str = Query(..., description="Workarea path to remove")):
    """Remove a workarea from the registry (does not delete files)."""
    workareas = _load_workareas()
    workareas = [w for w in workareas if w["path"] != path]
    _save_workareas(workareas)
    return {"status": "ok", "message": "工区已移除"}


@router.post("/save")
async def save_workarea(req: OpenWorkareaRequest):
    """Perform WAL checkpoint to persist all changes to disk."""
    if not os.path.isdir(req.path):
        raise HTTPException(status_code=404, detail="工区目录不存在")
    db_file = os.path.join(req.path, "petrosoft.db")
    if not os.path.exists(db_file):
        raise HTTPException(status_code=404, detail="数据库文件不存在")
    async with get_connection(req.path) as db:
        await db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    return {"status": "ok", "message": "工区已保存"}


class BackupRequest(BaseModel):
    workarea_path: str
    backup_path: str


@router.post("/backup")
async def backup_workarea(req: BackupRequest):
    """Backup database to a specified file path."""
    import shutil
    db_file = os.path.join(req.workarea_path, "petrosoft.db")
    if not os.path.exists(db_file):
        raise HTTPException(status_code=404, detail="数据库文件不存在")
    # Checkpoint first to ensure all data is written
    async with get_connection(req.workarea_path) as db:
        await db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    try:
        shutil.copy2(db_file, req.backup_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"备份失败: {str(e)}")
    return {"status": "ok", "message": f"备份已保存到 {req.backup_path}"}


@router.post("/clear-cache")
async def clear_cache(req: OpenWorkareaRequest):
    """Clear WAL/SHM cache files after checkpointing."""
    if not os.path.isdir(req.path):
        raise HTTPException(status_code=404, detail="工区目录不存在")
    db_file = os.path.join(req.path, "petrosoft.db")
    if not os.path.exists(db_file):
        return {"status": "ok", "message": "无需清除"}
    async with get_connection(req.path) as db:
        await db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    # Remove WAL and SHM files
    for ext in ["-wal", "-shm"]:
        f = db_file + ext
        if os.path.exists(f):
            os.remove(f)
    return {"status": "ok", "message": "缓存已清除"}
