"""Compute analytics snapshots from the jobs table for the dashboard."""

import json
import logging
from datetime import date, datetime, timezone

from db.connection import get_pool

logger = logging.getLogger("analytics")


async def compute_daily_snapshots():
    """Compute all analytics metrics for today and store as snapshots.

    Metrics computed:
    - skill_demand: count of jobs requiring each skill
    - salary_benchmark: salary stats by role/seniority
    - company_velocity: job posting counts by company
    - location_demand: job counts by location
    """
    pool = await get_pool()
    today = date.today()

    async with pool.acquire() as conn:
        # ---- Skill Demand ----
        skill_rows = await conn.fetch("""
            SELECT s.name AS skill_name, s.category, COUNT(*) AS job_count,
                   AVG(j.salary_annual_min) AS avg_salary_min,
                   AVG(j.salary_annual_max) AS avg_salary_max
            FROM job_skills js
            JOIN skills s ON s.id = js.skill_id
            JOIN jobs j ON j.id = js.job_id
            WHERE j.is_active = TRUE
            GROUP BY s.name, s.category
            ORDER BY job_count DESC
        """)

        for row in skill_rows:
            await conn.execute(
                """INSERT INTO analytics_snapshots (snapshot_date, metric_type, dimension_key, dimension_value)
                   VALUES ($1, 'skill_demand', $2, $3)
                   ON CONFLICT (snapshot_date, metric_type, dimension_key)
                   DO UPDATE SET dimension_value = EXCLUDED.dimension_value""",
                today,
                row["skill_name"],
                json.dumps({
                    "count": row["job_count"],
                    "category": row["category"],
                    "avg_salary_min": float(row["avg_salary_min"]) if row["avg_salary_min"] else None,
                    "avg_salary_max": float(row["avg_salary_max"]) if row["avg_salary_max"] else None,
                }),
            )

        # ---- Salary Benchmark by Seniority ----
        salary_rows = await conn.fetch("""
            SELECT seniority_level,
                   COUNT(*) AS sample_size,
                   MIN(salary_annual_min) AS min_salary,
                   MAX(salary_annual_max) AS max_salary,
                   AVG((COALESCE(salary_annual_min, 0) + COALESCE(salary_annual_max, 0)) / 2) AS median_salary
            FROM jobs
            WHERE is_active = TRUE
              AND (salary_annual_min IS NOT NULL OR salary_annual_max IS NOT NULL)
            GROUP BY seniority_level
        """)

        for row in salary_rows:
            level = row["seniority_level"] or "unknown"
            await conn.execute(
                """INSERT INTO analytics_snapshots (snapshot_date, metric_type, dimension_key, dimension_value)
                   VALUES ($1, 'salary_benchmark', $2, $3)
                   ON CONFLICT (snapshot_date, metric_type, dimension_key)
                   DO UPDATE SET dimension_value = EXCLUDED.dimension_value""",
                today,
                level,
                json.dumps({
                    "sample_size": row["sample_size"],
                    "min_salary": float(row["min_salary"]) if row["min_salary"] else 0,
                    "max_salary": float(row["max_salary"]) if row["max_salary"] else 0,
                    "median_salary": float(row["median_salary"]) if row["median_salary"] else 0,
                }),
            )

        # ---- Company Velocity ----
        company_rows = await conn.fetch("""
            SELECT company, company_normalized, COUNT(*) AS job_count,
                   COUNT(*) FILTER (WHERE first_seen_at > NOW() - INTERVAL '7 days') AS recent_postings
            FROM jobs
            WHERE is_active = TRUE
            GROUP BY company, company_normalized
            ORDER BY job_count DESC
            LIMIT 50
        """)

        for row in company_rows:
            total = row["job_count"]
            recent = row["recent_postings"]
            trend = "accelerating" if recent > total * 0.3 else ("steady" if recent > 0 else "slowing")
            await conn.execute(
                """INSERT INTO analytics_snapshots (snapshot_date, metric_type, dimension_key, dimension_value)
                   VALUES ($1, 'company_velocity', $2, $3)
                   ON CONFLICT (snapshot_date, metric_type, dimension_key)
                   DO UPDATE SET dimension_value = EXCLUDED.dimension_value""",
                today,
                row["company"],
                json.dumps({
                    "job_count": total,
                    "recent_postings": recent,
                    "trend": trend,
                }),
            )

        # ---- Location Demand ----
        location_rows = await conn.fetch("""
            SELECT location_normalized, COUNT(*) AS job_count,
                   AVG((COALESCE(salary_annual_min, 0) + COALESCE(salary_annual_max, 0)) / 2) AS avg_salary
            FROM jobs
            WHERE is_active = TRUE AND location_normalized IS NOT NULL
            GROUP BY location_normalized
            ORDER BY job_count DESC
            LIMIT 50
        """)

        for row in location_rows:
            # Get top skills for this location
            loc_skills = await conn.fetch("""
                SELECT s.name, COUNT(*) AS cnt
                FROM jobs j
                JOIN job_skills js ON js.job_id = j.id
                JOIN skills s ON s.id = js.skill_id
                WHERE j.location_normalized = $1 AND j.is_active = TRUE
                GROUP BY s.name
                ORDER BY cnt DESC
                LIMIT 5
            """, row["location_normalized"])

            await conn.execute(
                """INSERT INTO analytics_snapshots (snapshot_date, metric_type, dimension_key, dimension_value)
                   VALUES ($1, 'location_demand', $2, $3)
                   ON CONFLICT (snapshot_date, metric_type, dimension_key)
                   DO UPDATE SET dimension_value = EXCLUDED.dimension_value""",
                today,
                row["location_normalized"],
                json.dumps({
                    "job_count": row["job_count"],
                    "avg_salary": float(row["avg_salary"]) if row["avg_salary"] else 0,
                    "top_skills": [r["name"] for r in loc_skills],
                }),
            )

    logger.info(f"Analytics snapshots computed for {today}")
    return {"snapshot_date": str(today), "status": "completed"}
