"""Smart Job Matching endpoints."""

import json
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from db.connection import get_pool

router = APIRouter(prefix="/matching", tags=["matching"])


def _compute_skill_score(user_skills: List[str], job_skills: List[str]) -> tuple:
    """Compute skill match score and return matching/missing skills."""
    if not job_skills:
        return 70.0, [], []  # baseline when no skills extracted

    user_set = {s.lower() for s in user_skills}
    job_set = {s.lower() for s in job_skills}

    matching = user_set & job_set
    missing = job_set - user_set

    score = (len(matching) / len(job_set)) * 100
    return score, [s for s in job_skills if s.lower() in matching], [s for s in job_skills if s.lower() in missing]


def _compute_experience_score(user_years: int, job_seniority: str) -> float:
    """Score based on experience alignment."""
    seniority_map = {"intern": 0, "junior": 1, "mid": 3, "senior": 5, "lead": 8, "staff": 10}
    expected = seniority_map.get(job_seniority or "mid", 3)
    diff = abs(user_years - expected)
    return max(0, 100 - (diff * 15))


def _compute_salary_score(
    user_min: Optional[float], user_max: Optional[float],
    job_min: Optional[float], job_max: Optional[float]
) -> float:
    """Score based on salary range overlap."""
    if not user_min and not user_max:
        return 80.0  # No preference = neutral
    if not job_min and not job_max:
        return 70.0  # No salary data = neutral

    u_min = user_min or 0
    u_max = user_max or float('inf')
    j_min = job_min or 0
    j_max = job_max or float('inf')

    # Check overlap
    overlap_start = max(u_min, j_min)
    overlap_end = min(u_max, j_max)

    if overlap_start <= overlap_end:
        # Ranges overlap
        overlap = overlap_end - overlap_start
        total_range = max(u_max, j_max) - min(u_min, j_min)
        if total_range > 0:
            return min(100, (overlap / total_range) * 200)
        return 100.0
    else:
        # No overlap - penalize by distance
        gap = overlap_start - overlap_end
        penalty = min(100, gap / 10000)  # Every $10k gap = 1% penalty
        return max(0, 100 - penalty)


def _compute_location_score(
    user_locations: List[str], user_remote_pref: str,
    job_location: str, job_is_remote: bool
) -> float:
    """Score based on location/remote preference."""
    if user_remote_pref == "any":
        return 90.0

    if user_remote_pref == "remote":
        return 100.0 if job_is_remote else 30.0

    if user_remote_pref == "onsite":
        if not user_locations:
            return 70.0
        job_loc_lower = (job_location or "").lower()
        for pref in user_locations:
            if pref.lower() in job_loc_lower:
                return 100.0
        return 40.0

    # hybrid
    if job_is_remote:
        return 80.0
    if user_locations:
        job_loc_lower = (job_location or "").lower()
        for pref in user_locations:
            if pref.lower() in job_loc_lower:
                return 100.0
    return 60.0


@router.post("/jobs")
async def get_matched_jobs(
    user_local_id: str,
    limit: int = Query(20, description="Max results"),
    min_score: float = Query(0.0, description="Minimum match score"),
):
    """Return jobs ranked by match score for the given user profile."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Get user profile
        profile = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE local_id = $1", user_local_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found. Please save your profile first.")

        user_skills = list(profile["skills"]) if profile["skills"] else []
        user_years = profile["experience_years"] or 0
        user_sal_min = float(profile["salary_expectation_min"]) if profile["salary_expectation_min"] else None
        user_sal_max = float(profile["salary_expectation_max"]) if profile["salary_expectation_max"] else None
        user_locations = list(profile["preferred_locations"]) if profile["preferred_locations"] else []
        user_remote = profile["remote_preference"] or "any"

        # Get active jobs with their skills
        jobs = await conn.fetch("""
            SELECT j.id, j.title, j.company, j.location_normalized,
                   j.salary_annual_min, j.salary_annual_max,
                   j.seniority_level, j.is_remote, j.apply_link, j.employment_type,
                   COALESCE(
                       ARRAY_AGG(s.name) FILTER (WHERE s.name IS NOT NULL),
                       '{}'
                   ) AS skills
            FROM jobs j
            LEFT JOIN job_skills js ON js.job_id = j.id
            LEFT JOIN skills s ON s.id = js.skill_id
            WHERE j.is_active = TRUE
            GROUP BY j.id
            ORDER BY j.first_seen_at DESC
            LIMIT 200
        """)

        matched = []
        for job in jobs:
            job_skills = list(job["skills"]) if job["skills"] else []
            job_sal_min = float(job["salary_annual_min"]) if job["salary_annual_min"] else None
            job_sal_max = float(job["salary_annual_max"]) if job["salary_annual_max"] else None

            skill_score, matching_skills, missing_skills = _compute_skill_score(user_skills, job_skills)
            exp_score = _compute_experience_score(user_years, job["seniority_level"])
            sal_score = _compute_salary_score(user_sal_min, user_sal_max, job_sal_min, job_sal_max)
            loc_score = _compute_location_score(user_locations, user_remote, job["location_normalized"], job["is_remote"])
            culture_score = 70.0  # Baseline

            overall = (
                skill_score * 0.4 +
                exp_score * 0.2 +
                sal_score * 0.15 +
                loc_score * 0.15 +
                culture_score * 0.1
            )

            if overall >= min_score:
                salary_range = None
                if job_sal_min and job_sal_max:
                    salary_range = f"${int(job_sal_min):,} - ${int(job_sal_max):,}"
                elif job_sal_min:
                    salary_range = f"${int(job_sal_min):,}+"
                elif job_sal_max:
                    salary_range = f"Up to ${int(job_sal_max):,}"

                matched.append({
                    "job_id": job["id"],
                    "title": job["title"],
                    "company": job["company"],
                    "location": job["location_normalized"],
                    "is_remote": job["is_remote"],
                    "salary_range": salary_range,
                    "apply_link": job["apply_link"],
                    "employment_type": job["employment_type"],
                    "seniority_level": job["seniority_level"],
                    "match_breakdown": {
                        "skill_match": round(skill_score, 1),
                        "experience_fit": round(exp_score, 1),
                        "salary_fit": round(sal_score, 1),
                        "location_fit": round(loc_score, 1),
                        "culture_fit": round(culture_score, 1),
                        "overall_score": round(overall, 1),
                    },
                    "matching_skills": matching_skills,
                    "missing_skills": missing_skills,
                })

        # Sort by overall score descending
        matched.sort(key=lambda x: x["match_breakdown"]["overall_score"], reverse=True)
        return matched[:limit]


@router.get("/jobs/{job_id}/match/{user_local_id}")
async def get_single_job_match(job_id: int, user_local_id: str):
    """Match breakdown for a single job against a user."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE local_id = $1", user_local_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        job = await conn.fetchrow("SELECT * FROM jobs WHERE id = $1", job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        job_skills_rows = await conn.fetch("""
            SELECT s.name FROM job_skills js
            JOIN skills s ON s.id = js.skill_id
            WHERE js.job_id = $1
        """, job_id)
        job_skills = [r["name"] for r in job_skills_rows]

        user_skills = list(profile["skills"]) if profile["skills"] else []
        skill_score, matching, missing = _compute_skill_score(user_skills, job_skills)
        exp_score = _compute_experience_score(
            profile["experience_years"] or 0, job["seniority_level"]
        )
        sal_score = _compute_salary_score(
            float(profile["salary_expectation_min"]) if profile["salary_expectation_min"] else None,
            float(profile["salary_expectation_max"]) if profile["salary_expectation_max"] else None,
            float(job["salary_annual_min"]) if job["salary_annual_min"] else None,
            float(job["salary_annual_max"]) if job["salary_annual_max"] else None,
        )
        loc_score = _compute_location_score(
            list(profile["preferred_locations"]) if profile["preferred_locations"] else [],
            profile["remote_preference"] or "any",
            job["location_normalized"],
            job["is_remote"],
        )
        culture_score = 70.0
        overall = (skill_score * 0.4 + exp_score * 0.2 + sal_score * 0.15 +
                   loc_score * 0.15 + culture_score * 0.1)

        return {
            "skill_match": round(skill_score, 1),
            "experience_fit": round(exp_score, 1),
            "salary_fit": round(sal_score, 1),
            "location_fit": round(loc_score, 1),
            "culture_fit": round(culture_score, 1),
            "overall_score": round(overall, 1),
            "matching_skills": matching,
            "missing_skills": missing,
        }
