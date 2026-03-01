"""ETL pipeline management endpoints."""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
import json

from db.connection import get_pool
from pipeline.etl import run_etl
from pipeline.analytics_computer import compute_daily_snapshots

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/trigger")
async def trigger_etl(
    background_tasks: BackgroundTasks,
    queries: Optional[str] = None,
    pages: int = 1,
    date_posted: str = "all",
):
    """Manually trigger the ETL pipeline.

    queries: comma-separated search terms (default: built-in list)
    pages: number of JSearch pages per query (default: 1)
    """
    query_list = [q.strip() for q in queries.split(",")] if queries else None

    async def _run():
        try:
            result = await run_etl(queries=query_list, pages=pages, date_posted=date_posted)
            return result
        except Exception as e:
            print(f"ETL background error: {e}")

    background_tasks.add_task(_run)
    return {"message": "ETL pipeline triggered", "queries": query_list or "default"}


@router.post("/trigger-sync")
async def trigger_etl_sync(
    queries: Optional[str] = None,
    pages: int = 1,
    date_posted: str = "all",
):
    """Trigger ETL synchronously (waits for completion). Use for testing."""
    query_list = [q.strip() for q in queries.split(",")] if queries else None
    try:
        result = await run_etl(queries=query_list, pages=pages, date_posted=date_posted)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analytics")
async def trigger_analytics():
    """Manually trigger analytics snapshot computation."""
    try:
        result = await compute_daily_snapshots()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_pipeline_status():
    """Get recent ETL run statuses."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, run_type, status, started_at, completed_at,
                      records_processed, error_message, metadata
               FROM etl_runs
               ORDER BY started_at DESC
               LIMIT 10"""
        )
        return [
            {
                "id": r["id"],
                "run_type": r["run_type"],
                "status": r["status"],
                "started_at": r["started_at"].isoformat() if r["started_at"] else None,
                "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
                "records_processed": r["records_processed"],
                "error_message": r["error_message"],
                "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
            }
            for r in rows
        ]
