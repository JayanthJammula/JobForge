"""Market Intelligence & Analytics endpoints."""

import json
from datetime import date, timedelta
from fastapi import APIRouter, Query
from typing import Optional, List

from db.connection import get_pool

router = APIRouter(prefix="/pulse", tags=["pulse"])


@router.get("/overview")
async def get_market_overview():
    """Return top-level market intelligence dashboard data."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Total active jobs
        total_jobs = await conn.fetchval(
            "SELECT COUNT(*) FROM jobs WHERE is_active = TRUE"
        )

        # Total companies
        total_companies = await conn.fetchval(
            "SELECT COUNT(DISTINCT company_normalized) FROM jobs WHERE is_active = TRUE"
        )

        # Average salary
        avg_salary = await conn.fetchval(
            """SELECT AVG((COALESCE(salary_annual_min, 0) + COALESCE(salary_annual_max, 0)) / 2)
               FROM jobs WHERE is_active = TRUE
               AND (salary_annual_min IS NOT NULL OR salary_annual_max IS NOT NULL)"""
        )

        # Top 10 skills
        top_skills = await conn.fetch("""
            SELECT s.name, s.category, COUNT(*) AS job_count
            FROM job_skills js
            JOIN skills s ON s.id = js.skill_id
            JOIN jobs j ON j.id = js.job_id
            WHERE j.is_active = TRUE
            GROUP BY s.name, s.category
            ORDER BY job_count DESC
            LIMIT 10
        """)

        # Total remote jobs
        total_remote = await conn.fetchval(
            "SELECT COUNT(*) FROM jobs WHERE is_active = TRUE AND is_remote = TRUE"
        )

        return {
            "total_jobs": total_jobs or 0,
            "total_companies": total_companies or 0,
            "avg_salary": round(float(avg_salary), 2) if avg_salary else 0,
            "total_remote": total_remote or 0,
            "top_skills": [
                {"name": r["name"], "category": r["category"], "count": r["job_count"]}
                for r in top_skills
            ],
            "last_updated": date.today().isoformat(),
        }


@router.get("/skills/trends")
async def get_skill_trends(
    skills: Optional[str] = Query(None, description="Comma-separated skill names to filter"),
    days: int = Query(30, description="Number of days to look back"),
):
    """Skill demand trends over time from analytics snapshots."""
    pool = await get_pool()
    start_date = date.today() - timedelta(days=days)

    async with pool.acquire() as conn:
        query = """
            SELECT snapshot_date, dimension_key AS skill_name, dimension_value
            FROM analytics_snapshots
            WHERE metric_type = 'skill_demand'
              AND snapshot_date >= $1
        """
        params = [start_date]

        if skills:
            skill_list = [s.strip() for s in skills.split(",")]
            query += " AND dimension_key = ANY($2)"
            params.append(skill_list)

        query += " ORDER BY snapshot_date, dimension_key"
        rows = await conn.fetch(query, *params)

        # Group by skill
        skill_data = {}
        for row in rows:
            name = row["skill_name"]
            value = json.loads(row["dimension_value"]) if isinstance(row["dimension_value"], str) else row["dimension_value"]
            if name not in skill_data:
                skill_data[name] = {
                    "skill_name": name,
                    "category": value.get("category", ""),
                    "data_points": [],
                    "current_count": 0,
                }
            skill_data[name]["data_points"].append({
                "date": row["snapshot_date"].isoformat(),
                "count": value.get("count", 0),
            })
            skill_data[name]["current_count"] = value.get("count", 0)

        # Compute trend direction
        results = []
        for data in skill_data.values():
            points = data["data_points"]
            if len(points) >= 2:
                first_count = points[0]["count"]
                last_count = points[-1]["count"]
                if last_count > first_count * 1.1:
                    data["trend_direction"] = "rising"
                elif last_count < first_count * 0.9:
                    data["trend_direction"] = "declining"
                else:
                    data["trend_direction"] = "stable"
            else:
                data["trend_direction"] = "stable"
            results.append(data)

        # If no snapshots yet, fall back to live skill counts
        if not results:
            live_rows = await conn.fetch("""
                SELECT s.name, s.category, COUNT(*) AS job_count
                FROM job_skills js
                JOIN skills s ON s.id = js.skill_id
                JOIN jobs j ON j.id = js.job_id
                WHERE j.is_active = TRUE
                GROUP BY s.name, s.category
                ORDER BY job_count DESC
                LIMIT 20
            """)
            results = [
                {
                    "skill_name": r["name"],
                    "category": r["category"],
                    "data_points": [{"date": date.today().isoformat(), "count": r["job_count"]}],
                    "current_count": r["job_count"],
                    "trend_direction": "stable",
                }
                for r in live_rows
            ]

        return results


@router.get("/salaries")
async def get_salary_benchmarks(
    role: Optional[str] = Query(None, description="Filter by seniority level"),
    location: Optional[str] = Query(None, description="Filter by location"),
):
    """Salary distribution data by seniority/location."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        conditions = ["is_active = TRUE", "(salary_annual_min IS NOT NULL OR salary_annual_max IS NOT NULL)"]
        params = []
        idx = 1

        if role:
            conditions.append(f"seniority_level = ${idx}")
            params.append(role)
            idx += 1

        if location:
            conditions.append(f"location_normalized ILIKE ${idx}")
            params.append(f"%{location}%")
            idx += 1

        where = " AND ".join(conditions)

        rows = await conn.fetch(f"""
            SELECT seniority_level,
                   COUNT(*) AS sample_size,
                   MIN(salary_annual_min) AS min_salary,
                   MAX(salary_annual_max) AS max_salary,
                   AVG((COALESCE(salary_annual_min, 0) + COALESCE(salary_annual_max, 0)) / 2) AS median_salary
            FROM jobs
            WHERE {where}
            GROUP BY seniority_level
            ORDER BY median_salary DESC
        """, *params)

        return [
            {
                "seniority_level": r["seniority_level"] or "unknown",
                "sample_size": r["sample_size"],
                "min_salary": round(float(r["min_salary"]), 2) if r["min_salary"] else 0,
                "max_salary": round(float(r["max_salary"]), 2) if r["max_salary"] else 0,
                "median_salary": round(float(r["median_salary"]), 2) if r["median_salary"] else 0,
            }
            for r in rows
        ]


@router.get("/companies")
async def get_company_velocity(limit: int = Query(20, description="Number of companies")):
    """Top hiring companies ranked by posting volume."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT company, COUNT(*) AS job_count,
                   COUNT(*) FILTER (WHERE first_seen_at > NOW() - INTERVAL '7 days') AS recent_postings,
                   AVG((COALESCE(salary_annual_min, 0) + COALESCE(salary_annual_max, 0)) / 2)
                       FILTER (WHERE salary_annual_min IS NOT NULL OR salary_annual_max IS NOT NULL) AS avg_salary
            FROM jobs
            WHERE is_active = TRUE
            GROUP BY company
            ORDER BY job_count DESC
            LIMIT $1
        """, limit)

        return [
            {
                "company_name": r["company"],
                "job_count": r["job_count"],
                "recent_postings": r["recent_postings"],
                "avg_salary": round(float(r["avg_salary"]), 2) if r["avg_salary"] else None,
                "trend": "accelerating" if r["recent_postings"] > r["job_count"] * 0.3
                         else ("steady" if r["recent_postings"] > 0 else "slowing"),
            }
            for r in rows
        ]


@router.get("/locations")
async def get_location_demand(limit: int = Query(20, description="Number of locations")):
    """Job demand by geographic location."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT location_normalized, COUNT(*) AS job_count,
                   AVG((COALESCE(salary_annual_min, 0) + COALESCE(salary_annual_max, 0)) / 2)
                       FILTER (WHERE salary_annual_min IS NOT NULL OR salary_annual_max IS NOT NULL) AS avg_salary,
                   COUNT(*) FILTER (WHERE is_remote = TRUE) AS remote_count
            FROM jobs
            WHERE is_active = TRUE AND location_normalized IS NOT NULL
                  AND location_normalized != ''
            GROUP BY location_normalized
            ORDER BY job_count DESC
            LIMIT $1
        """, limit)

        results = []
        for r in rows:
            # Get top skills for this location
            loc_skills = await conn.fetch("""
                SELECT s.name
                FROM jobs j
                JOIN job_skills js ON js.job_id = j.id
                JOIN skills s ON s.id = js.skill_id
                WHERE j.location_normalized = $1 AND j.is_active = TRUE
                GROUP BY s.name
                ORDER BY COUNT(*) DESC
                LIMIT 5
            """, r["location_normalized"])

            results.append({
                "location": r["location_normalized"],
                "job_count": r["job_count"],
                "avg_salary": round(float(r["avg_salary"]), 2) if r["avg_salary"] else None,
                "remote_count": r["remote_count"],
                "top_skills": [s["name"] for s in loc_skills],
            })

        return results


@router.get("/emerging-skills")
async def get_emerging_skills(days: int = Query(14, description="Lookback period")):
    """Skills with the steepest recent growth curve."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Compare recent skills vs older period
        recent_cutoff = date.today() - timedelta(days=days)
        older_cutoff = recent_cutoff - timedelta(days=days)

        recent = await conn.fetch("""
            SELECT s.name, COUNT(*) AS cnt
            FROM job_skills js
            JOIN skills s ON s.id = js.skill_id
            JOIN jobs j ON j.id = js.job_id
            WHERE j.first_seen_at >= $1 AND j.is_active = TRUE
            GROUP BY s.name
        """, recent_cutoff)

        older = await conn.fetch("""
            SELECT s.name, COUNT(*) AS cnt
            FROM job_skills js
            JOIN skills s ON s.id = js.skill_id
            JOIN jobs j ON j.id = js.job_id
            WHERE j.first_seen_at >= $1 AND j.first_seen_at < $2 AND j.is_active = TRUE
            GROUP BY s.name
        """, older_cutoff, recent_cutoff)

        older_map = {r["name"]: r["cnt"] for r in older}
        results = []
        for r in recent:
            old_count = older_map.get(r["name"], 0)
            new_count = r["cnt"]
            if old_count > 0:
                growth = ((new_count - old_count) / old_count) * 100
            elif new_count > 0:
                growth = 100.0  # Brand new skill
            else:
                growth = 0

            if growth > 0:
                results.append({
                    "skill_name": r["name"],
                    "current_count": new_count,
                    "previous_count": old_count,
                    "growth_pct": round(growth, 1),
                    "trend_direction": "rising",
                })

        results.sort(key=lambda x: x["growth_pct"], reverse=True)
        return results[:20]
