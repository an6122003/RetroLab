"""
Backup & restore endpoints — export/import all database data as JSON.

Supports periodic auto-backup via configurable interval stored in Redis.
Backup files are stored as timestamped JSON in a configurable directory.
Google Drive sync: optional upload to Drive with revision versioning.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

import redis
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..gdrive import DriveConfig, get_sa_email, get_auth_status, list_drive_backups, test_drive_connection, upload_to_drive, get_file_revisions
from ..models import Article, RawArticle
from ..settings import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backup", tags=["backup"])


# ── Helpers ──────────────────────────────────────────────────────

def _backup_dir() -> Path:
    """Backup storage directory."""
    d = Path(os.environ.get(
        "BACKUP_DIR",
        str(Path(__file__).resolve().parent.parent.parent / "backups"),
    ))
    d.mkdir(parents=True, exist_ok=True)
    return d


def _redis():
    return redis.Redis.from_url(settings.REDIS_URL)


def _serialize_row(row) -> dict:
    """Convert an SQLAlchemy row to a JSON-safe dict."""
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, UUID):
            d[col.name] = str(val)
        elif isinstance(val, datetime):
            d[col.name] = val.isoformat()
        else:
            d[col.name] = val
    return d


# ── Configuration ────────────────────────────────────────────────

class BackupConfig:
    """Read/write backup config from Redis."""
    KEY = "backup:config"

    @staticmethod
    def get() -> dict:
        r = _redis()
        raw = r.get(BackupConfig.KEY)
        if raw:
            return json.loads(raw)
        return {
            "enabled": False,
            "interval_hours": 24,
            "max_backups": 10,
        }

    @staticmethod
    def set(config: dict):
        r = _redis()
        r.set(BackupConfig.KEY, json.dumps(config))


# ── Export endpoint ──────────────────────────────────────────────

@router.post("/export")
async def export_backup(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Export all articles and raw_articles to a timestamped JSON file.
    Optionally uploads to Google Drive if configured."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{ts}.json"
    filepath = _backup_dir() / filename

    # Fetch all raw articles
    raw_result = await db.execute(select(RawArticle).order_by(RawArticle.created_at))
    raw_articles = [_serialize_row(r) for r in raw_result.scalars().all()]

    # Fetch all articles
    art_result = await db.execute(select(Article).order_by(Article.created_at))
    articles = [_serialize_row(a) for a in art_result.scalars().all()]

    # Get pipeline config if available
    sources_path = settings.pipeline_dir / "config" / "sources.yaml"
    sources_config = None
    if sources_path.exists():
        sources_config = sources_path.read_text(encoding="utf-8")

    backup_data = {
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "raw_articles": len(raw_articles),
            "articles": len(articles),
        },
        "raw_articles": raw_articles,
        "articles": articles,
        "sources_config": sources_config,
    }

    filepath.write_text(json.dumps(backup_data, ensure_ascii=False, indent=2), encoding="utf-8")

    # Enforce max_backups limit
    config = BackupConfig.get()
    _cleanup_old_backups(config.get("max_backups", 10))

    size_mb = round(filepath.stat().st_size / (1024 * 1024), 2)

    result = {
        "status": "exported",
        "filename": filename,
        "size_mb": size_mb,
        "stats": backup_data["stats"],
        "drive": None,
    }

    # Auto-upload to Google Drive if enabled
    drive_config = DriveConfig.get()
    if drive_config.get("enabled") and drive_config.get("folder_id"):
        try:
            drive_result = upload_to_drive(filepath, drive_config["folder_id"])
            result["drive"] = drive_result
            logger.info(f"Backup uploaded to Drive: {drive_result}")
        except Exception as e:
            logger.error(f"Drive upload failed: {e}")
            result["drive"] = {"status": "error", "error": str(e)}

    return result


@router.get("/download/{filename}")
async def download_backup(filename: str):
    """Download a specific backup file."""
    filepath = _backup_dir() / filename
    if not filepath.exists() or not filepath.name.startswith("backup_"):
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="application/json",
    )


# ── Import endpoint ──────────────────────────────────────────────

@router.post("/import")
async def import_backup(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Import articles from a backup JSON file.

    Strategy: UPSERT — insert new records, skip existing ones (by ID).
    This is safe to run multiple times and won't create duplicates.
    """
    try:
        content = await file.read()
        data = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid backup file: {e}")

    if "raw_articles" not in data or "articles" not in data:
        raise HTTPException(status_code=400, detail="Missing required keys in backup")

    imported = {"raw_articles": 0, "articles": 0, "skipped": 0}

    # Import raw articles first (articles depend on them)
    for raw in data["raw_articles"]:
        existing = await db.execute(
            select(RawArticle).where(RawArticle.id == raw["id"])
        )
        if existing.scalar_one_or_none():
            imported["skipped"] += 1
            continue

        # Parse datetime fields
        for dt_field in ["published_at", "scraped_at", "created_at"]:
            if raw.get(dt_field) and isinstance(raw[dt_field], str):
                raw[dt_field] = datetime.fromisoformat(raw[dt_field])

        db.add(RawArticle(**raw))
        imported["raw_articles"] += 1

    await db.flush()

    # Import articles
    for art in data["articles"]:
        existing = await db.execute(
            select(Article).where(Article.id == art["id"])
        )
        if existing.scalar_one_or_none():
            imported["skipped"] += 1
            continue

        # Parse datetime fields
        for dt_field in ["source_published_at", "published_to_notion_at", "created_at"]:
            if art.get(dt_field) and isinstance(art[dt_field], str):
                art[dt_field] = datetime.fromisoformat(art[dt_field])

        db.add(Article(**art))
        imported["articles"] += 1

    await db.commit()

    return {
        "status": "imported",
        "imported": imported,
    }


# ── List backups ─────────────────────────────────────────────────

@router.get("/list")
async def list_backups() -> dict[str, Any]:
    """List all available backup files."""
    backup_path = _backup_dir()
    backups = []

    for f in sorted(backup_path.glob("backup_*.json"), reverse=True):
        stat = f.stat()
        # Parse timestamp from filename
        try:
            ts_str = f.stem.replace("backup_", "")
            created = datetime.strptime(ts_str, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
        except ValueError:
            created = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

        backups.append({
            "filename": f.name,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_at": created.isoformat(),
        })

    return {
        "backups": backups,
        "backup_dir": str(backup_path),
        "total": len(backups),
    }


@router.delete("/delete/{filename}")
async def delete_backup(filename: str) -> dict[str, str]:
    """Delete a specific backup file."""
    filepath = _backup_dir() / filename
    if not filepath.exists() or not filepath.name.startswith("backup_"):
        raise HTTPException(status_code=404, detail="Backup file not found")
    filepath.unlink()
    return {"status": "deleted", "filename": filename}


# ── Config endpoint ──────────────────────────────────────────────

@router.get("/config")
async def get_backup_config() -> dict[str, Any]:
    """Get current backup configuration."""
    config = BackupConfig.get()

    # Also get next scheduled backup time if enabled
    r = _redis()
    last_backup = r.get("backup:last_run")
    next_backup = None
    if config.get("enabled") and last_backup:
        from datetime import timedelta
        last_dt = datetime.fromisoformat(last_backup.decode())
        next_dt = last_dt + timedelta(hours=config["interval_hours"])
        next_backup = next_dt.isoformat()

    return {
        **config,
        "last_backup": last_backup.decode() if last_backup else None,
        "next_backup": next_backup,
    }


@router.post("/config")
async def update_backup_config(
    enabled: bool = True,
    interval_hours: int = 24,
    max_backups: int = 10,
) -> dict[str, Any]:
    """Update backup configuration."""
    config = {
        "enabled": enabled,
        "interval_hours": max(1, interval_hours),
        "max_backups": max(1, max_backups),
    }
    BackupConfig.set(config)
    return {"status": "saved", **config}


# ── Periodic check (called by a scheduled task or startup) ───────

@router.post("/run-scheduled")
async def run_scheduled_backup(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Check if a scheduled backup is due and run it if so."""
    from datetime import timedelta

    config = BackupConfig.get()
    if not config.get("enabled"):
        return {"status": "skipped", "reason": "auto-backup disabled"}

    r = _redis()
    last_run = r.get("backup:last_run")

    if last_run:
        last_dt = datetime.fromisoformat(last_run.decode())
        next_due = last_dt + timedelta(hours=config["interval_hours"])
        if datetime.now(timezone.utc) < next_due:
            return {"status": "skipped", "reason": "not due yet", "next": next_due.isoformat()}

    # Run the backup
    result = await export_backup(db)

    # Record the timestamp
    r.set("backup:last_run", datetime.now(timezone.utc).isoformat())

    return {"status": "completed", **result}


# ── Google Drive endpoints ───────────────────────────────────────

@router.get("/drive/config")
async def get_drive_config() -> dict[str, Any]:
    """Get Google Drive sync configuration."""
    config = DriveConfig.get()
    auth = get_auth_status()
    return {
        **config,
        "sa_email": get_sa_email(),
        "auth": auth,
        "key_file_found": auth.get("authenticated", False),
    }


@router.post("/drive/config")
async def update_drive_config(
    enabled: bool = False,
    folder_id: str = "",
    upload_after_backup: bool = True,
) -> dict[str, Any]:
    """Update Google Drive sync configuration."""
    config = {
        "enabled": enabled,
        "folder_id": folder_id.strip(),
        "upload_after_backup": upload_after_backup,
    }
    DriveConfig.set(config)
    return {"status": "saved", **config}


@router.post("/drive/test")
async def test_drive() -> dict[str, Any]:
    """Test Google Drive connection."""
    config = DriveConfig.get()
    if not config.get("folder_id"):
        return {"status": "error", "error": "No folder ID configured"}
    return test_drive_connection(config["folder_id"])


@router.get("/drive/files")
async def list_drive_files() -> dict[str, Any]:
    """List backup files on Google Drive."""
    config = DriveConfig.get()
    if not config.get("folder_id"):
        return {"files": [], "error": "No folder ID configured"}
    try:
        files = list_drive_backups(config["folder_id"])
        return {"files": files, "total": len(files)}
    except Exception as e:
        return {"files": [], "error": str(e)}


@router.post("/drive/upload/{filename}")
async def upload_single_to_drive(filename: str) -> dict[str, Any]:
    """Manually upload a specific local backup to Google Drive."""
    config = DriveConfig.get()
    if not config.get("folder_id"):
        raise HTTPException(status_code=400, detail="No Drive folder ID configured")

    filepath = _backup_dir() / filename
    if not filepath.exists() or not filepath.name.startswith("backup_"):
        raise HTTPException(status_code=404, detail="Backup file not found")

    result = upload_to_drive(filepath, config["folder_id"])
    return result


@router.get("/drive/revisions/{file_id}")
async def get_drive_revisions(file_id: str) -> dict[str, Any]:
    """Get revision history for a Drive backup file."""
    try:
        revisions = get_file_revisions(file_id)
        return {"revisions": revisions, "total": len(revisions)}
    except Exception as e:
        return {"revisions": [], "error": str(e)}


# ── Cleanup ──────────────────────────────────────────────────────

def _cleanup_old_backups(max_backups: int = 10):
    """Remove oldest backups exceeding the max count."""
    backup_path = _backup_dir()
    backups = sorted(backup_path.glob("backup_*.json"), reverse=True)
    for old in backups[max_backups:]:
        old.unlink()

