"""ETL pipeline: fetch jobs from JSearch, normalize, deduplicate, and store in PostgreSQL."""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from db.connection import get_pool
from pipeline.deduplicator import (
    generate_fingerprint,
    normalize_location,
    normalize_text,
    infer_seniority,
)
from pipeline.salary_normalizer import normalize_salary_to_annual
from pipeline.skill_extractor import extract_skills, detect_is_remote
from services import get_raw_jobs

logger = logging.getLogger("etl")

# Default search queries for diverse job data
DEFAULT_QUERIES = [
    "Software Engineer",
    "Data Scientist",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "DevOps Engineer",
    "Machine Learning Engineer",
    "Mobile Developer",
    "Cloud Engineer",
    "Product Manager",
]


async def _ensure_skill(conn, skill_name: str, category: str) -> int:
    """Insert skill if not exists, return skill id."""
    name_lower = skill_name.lower().strip()
    row = await conn.fetchrow(
        "SELECT id FROM skills WHERE name_lower = $1", name_lower
    )
    if row:
        return row["id"]

    row = await conn.fetchrow(
        """INSERT INTO skills (name, name_lower, category)
           VALUES ($1, $2, $3)
           ON CONFLICT (name_lower) DO UPDATE SET category = EXCLUDED.category
           RETURNING id""",
        skill_name, name_lower, category,
    )
    return row["id"]


async def run_etl(
    queries: Optional[List[str]] = None,
    pages: int = 1,
    date_posted: str = "all",
) -> dict:
    """Run the full ETL pipeline.

    1. Fetch jobs from JSearch for each query
    2. Deduplicate via fingerprinting
    3. Normalize salary, location, seniority
    4. Extract skills
    5. Store in PostgreSQL

    Returns summary stats.
    """
    pool = await get_pool()
    queries = queries or DEFAULT_QUERIES[:5]  # Limit to 5 queries to stay in free tier

    total_fetched = 0
    total_new = 0
    total_updated = 0
    total_skills_linked = 0
    errors = []

    # Log ETL run start
    async with pool.acquire() as conn:
        run_row = await conn.fetchrow(
            """INSERT INTO etl_runs (run_type, status, metadata)
               VALUES ('job_fetch', 'running', $1) RETURNING id""",
            json.dumps({"queries": queries, "pages": pages}),
        )
        run_id = run_row["id"]

    try:
        for query in queries:
            try:
                raw_jobs = get_raw_jobs(
                    query=query,
                    page=1,
                    num_pages=pages,
                    country="us",
                    date_posted=date_posted,
                    job_requirements="",
                )
            except Exception as e:
                errors.append(f"Fetch error for '{query}': {str(e)}")
                logger.error(f"Failed to fetch jobs for query '{query}': {e}")
                continue

            total_fetched += len(raw_jobs)

            async with pool.acquire() as conn:
                for raw_job in raw_jobs:
                    title = raw_job.job_title or "Unknown"
                    company = raw_job.employer_name or "Unknown"
                    city = raw_job.job_city or ""
                    state = raw_job.job_state or ""
                    location_str = normalize_location(city, state)
                    description = raw_job.job_description or ""

                    fingerprint = generate_fingerprint(title, company, location_str)

                    # Check for existing job
                    existing = await conn.fetchrow(
                        "SELECT id FROM jobs WHERE fingerprint = $1", fingerprint
                    )

                    if existing:
                        # Update last_seen_at
                        await conn.execute(
                            "UPDATE jobs SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1",
                            existing["id"],
                        )
                        total_updated += 1
                        continue

                    # Normalize salary
                    salary_min = raw_job.job_salary_min
                    salary_max = raw_job.job_salary_max
                    salary_period = raw_job.job_salary_period or ""
                    salary_currency = raw_job.job_salary_currency or "USD"

                    annual_min = normalize_salary_to_annual(
                        salary_min, salary_period, salary_currency
                    ) if salary_min else None
                    annual_max = normalize_salary_to_annual(
                        salary_max, salary_period, salary_currency
                    ) if salary_max else None

                    # Infer seniority
                    seniority = infer_seniority(title, description)

                    # Detect remote
                    is_remote = detect_is_remote(description, title)

                    # Insert job
                    job_row = await conn.fetchrow(
                        """INSERT INTO jobs (
                            jsearch_job_id, fingerprint, title, title_normalized,
                            company, company_normalized, description,
                            city, state, country, location_normalized,
                            is_remote, employment_type,
                            salary_min, salary_max,
                            salary_annual_min, salary_annual_max,
                            salary_currency, salary_period,
                            apply_link, seniority_level,
                            raw_data
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                            $11, $12, $13, $14, $15, $16, $17, $18, $19,
                            $20, $21, $22
                        ) RETURNING id""",
                        raw_job.job_id,
                        fingerprint,
                        title,
                        normalize_text(title),
                        company,
                        normalize_text(company),
                        description,
                        city,
                        state,
                        "US",
                        location_str,
                        is_remote,
                        raw_job.job_employment_type,
                        salary_min,
                        salary_max,
                        annual_min,
                        annual_max,
                        salary_currency,
                        salary_period,
                        raw_job.job_apply_link,
                        seniority,
                        json.dumps(raw_job.model_dump()),
                    )

                    job_id = job_row["id"]
                    total_new += 1

                    # Extract and link skills
                    skills = extract_skills(description)
                    for skill_info in skills:
                        skill_id = await _ensure_skill(
                            conn, skill_info["name"], skill_info["category"]
                        )
                        await conn.execute(
                            """INSERT INTO job_skills (job_id, skill_id, is_required)
                               VALUES ($1, $2, TRUE)
                               ON CONFLICT DO NOTHING""",
                            job_id, skill_id,
                        )
                        total_skills_linked += 1

        # Mark ETL run as completed
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE etl_runs
                   SET status = 'completed', completed_at = NOW(),
                       records_processed = $1,
                       metadata = metadata || $2::jsonb
                   WHERE id = $3""",
                total_new,
                json.dumps({
                    "total_fetched": total_fetched,
                    "new_jobs": total_new,
                    "updated_jobs": total_updated,
                    "skills_linked": total_skills_linked,
                    "errors": errors,
                }),
                run_id,
            )

    except Exception as e:
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE etl_runs
                   SET status = 'failed', completed_at = NOW(),
                       error_message = $1
                   WHERE id = $2""",
                str(e), run_id,
            )
        raise

    return {
        "run_id": run_id,
        "total_fetched": total_fetched,
        "new_jobs": total_new,
        "updated_jobs": total_updated,
        "skills_linked": total_skills_linked,
        "errors": errors,
    }
