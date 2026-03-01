"""APScheduler-based periodic tasks for ETL and analytics."""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger("scheduler")

_scheduler: AsyncIOScheduler | None = None


async def _run_etl_job():
    """Wrapper for scheduled ETL execution."""
    try:
        from pipeline.etl import run_etl
        logger.info("Scheduled ETL job starting...")
        result = await run_etl(pages=1, date_posted="today")
        logger.info(f"Scheduled ETL completed: {result}")
    except Exception as e:
        logger.error(f"Scheduled ETL failed: {e}")


async def _run_analytics_job():
    """Wrapper for scheduled analytics computation."""
    try:
        from pipeline.analytics_computer import compute_daily_snapshots
        logger.info("Scheduled analytics computation starting...")
        result = await compute_daily_snapshots()
        logger.info(f"Scheduled analytics completed: {result}")
    except Exception as e:
        logger.error(f"Scheduled analytics failed: {e}")


def start_scheduler():
    """Start the APScheduler with ETL and analytics jobs."""
    global _scheduler
    _scheduler = AsyncIOScheduler()

    # Run ETL every 6 hours
    _scheduler.add_job(
        _run_etl_job,
        trigger=IntervalTrigger(hours=6),
        id="etl_job",
        name="Job Data ETL Pipeline",
        replace_existing=True,
    )

    # Compute analytics daily at 2 AM
    _scheduler.add_job(
        _run_analytics_job,
        trigger=CronTrigger(hour=2, minute=0),
        id="analytics_job",
        name="Daily Analytics Computation",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Scheduler started: ETL every 6h, analytics daily at 2 AM")


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped")
