"""AI observability endpoints: health check, call stats, debugging."""

from fastapi import APIRouter, HTTPException
from db.connection import get_pool

router = APIRouter(prefix="/observability", tags=["observability"])


@router.get("/ai-health")
async def ai_health():
    """Return last 24h AI call stats: total, success rate, avg latency, model breakdown."""
    try:
        pool = await get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    async with pool.acquire() as conn:
        # Overall stats
        stats = await conn.fetchrow("""
            SELECT
                COUNT(*) AS total_calls,
                COUNT(*) FILTER (WHERE status = 'success') AS successes,
                COUNT(*) FILTER (WHERE status = 'rate_limited') AS rate_limits,
                COUNT(*) FILTER (WHERE status = 'schema_error') AS schema_errors,
                COUNT(*) FILTER (WHERE status = 'error') AS errors,
                ROUND(AVG(latency_ms)) AS avg_latency_ms,
                ROUND(AVG(latency_ms) FILTER (WHERE status = 'success')) AS avg_success_latency_ms
            FROM ai_call_logs
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)

        # Per-operation breakdown
        ops = await conn.fetch("""
            SELECT
                operation,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'success') AS successes,
                ROUND(AVG(latency_ms)) AS avg_latency_ms
            FROM ai_call_logs
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY operation
            ORDER BY total DESC
        """)

        # Per-model breakdown
        models = await conn.fetch("""
            SELECT
                model_used,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'success') AS successes
            FROM ai_call_logs
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY model_used
            ORDER BY total DESC
        """)

        total = stats["total_calls"] or 0
        success_rate = round(stats["successes"] / total * 100, 1) if total > 0 else 0

        return {
            "period": "last_24h",
            "total_calls": total,
            "success_rate_pct": success_rate,
            "avg_latency_ms": int(stats["avg_latency_ms"] or 0),
            "avg_success_latency_ms": int(stats["avg_success_latency_ms"] or 0),
            "rate_limits": stats["rate_limits"],
            "schema_errors": stats["schema_errors"],
            "errors": stats["errors"],
            "by_operation": [
                {
                    "operation": r["operation"],
                    "total": r["total"],
                    "successes": r["successes"],
                    "avg_latency_ms": int(r["avg_latency_ms"] or 0),
                }
                for r in ops
            ],
            "by_model": [
                {
                    "model": r["model_used"],
                    "total": r["total"],
                    "successes": r["successes"],
                }
                for r in models
            ],
        }
