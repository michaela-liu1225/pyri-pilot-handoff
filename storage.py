"""Small persistent, append-only handoff store; deliberately not multi-tenant."""

import json
from pathlib import Path
from typing import Any

import aiosqlite


async def initialize(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(path) as db:
        await db.execute("CREATE TABLE IF NOT EXISTS handoffs (id TEXT PRIMARY KEY, site_id TEXT NOT NULL, created_at TEXT NOT NULL, document TEXT NOT NULL)")
        await db.commit()


async def save(path: Path, document: dict[str, Any]) -> None:
    async with aiosqlite.connect(path) as db:
        await db.execute("INSERT INTO handoffs VALUES (?, ?, ?, ?)",
                         (document["id"], document["site_id"], document["created_at"], json.dumps(document)))
        await db.commit()


async def list_for_site(path: Path, site_id: str) -> list[dict[str, Any]]:
    async with aiosqlite.connect(path) as db:
        async with db.execute("SELECT document FROM handoffs WHERE site_id = ? ORDER BY created_at DESC LIMIT 50", (site_id,)) as cursor:
            return [json.loads(row[0]) for row in await cursor.fetchall()]


async def get(path: Path, site_id: str, handoff_id: str) -> dict[str, Any] | None:
    async with aiosqlite.connect(path) as db:
        async with db.execute("SELECT document FROM handoffs WHERE id = ? AND site_id = ?", (handoff_id, site_id)) as cursor:
            row = await cursor.fetchone()
            return json.loads(row[0]) if row else None
