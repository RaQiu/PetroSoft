"""SQLite database connection management for PetroSoft.

Each workarea has its own .db file in the workarea directory.
"""

import os
from contextlib import asynccontextmanager
import aiosqlite

# Path to schema.sql relative to this file
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_db_path(workarea_path: str) -> str:
    """Get the SQLite database file path for a workarea."""
    return os.path.join(workarea_path, "petrosoft.db")


async def init_db(workarea_path: str) -> None:
    """Initialize a new database with the schema."""
    db_path = get_db_path(workarea_path)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    async with aiosqlite.connect(db_path) as db:
        await db.executescript(schema_sql)
        await db.commit()


@asynccontextmanager
async def get_connection(workarea_path: str):
    """Get an async database connection for a workarea (context manager)."""
    db_path = get_db_path(workarea_path)
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute("PRAGMA journal_mode = WAL")
        yield db


async def get_or_create_well(db: aiosqlite.Connection, well_name: str) -> int:
    """Get well ID by name, creating the well if it doesn't exist."""
    cursor = await db.execute("SELECT id FROM wells WHERE name = ?", (well_name,))
    row = await cursor.fetchone()
    if row:
        return row[0]
    cursor = await db.execute("INSERT INTO wells (name) VALUES (?)", (well_name,))
    await db.commit()
    return cursor.lastrowid
