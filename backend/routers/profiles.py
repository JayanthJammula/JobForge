"""User profile CRUD endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from db.connection import get_pool

router = APIRouter(prefix="/profiles", tags=["profiles"])


class UserProfileCreate(BaseModel):
    local_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    experience_years: int = 0
    salary_expectation_min: Optional[float] = None
    salary_expectation_max: Optional[float] = None
    preferred_locations: List[str] = []
    remote_preference: str = "any"
    preferred_seniority: str = "any"
    preferred_industries: List[str] = []
    resume_text: Optional[str] = None


class UserProfileResponse(UserProfileCreate):
    id: int


@router.post("", response_model=UserProfileResponse)
async def create_or_update_profile(profile: UserProfileCreate):
    """Upsert user profile by local_id."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO user_profiles (
                local_id, name, email, phone, location, title, bio,
                skills, experience_years,
                salary_expectation_min, salary_expectation_max,
                preferred_locations, remote_preference,
                preferred_seniority, preferred_industries, resume_text
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (local_id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                location = EXCLUDED.location,
                title = EXCLUDED.title,
                bio = EXCLUDED.bio,
                skills = EXCLUDED.skills,
                experience_years = EXCLUDED.experience_years,
                salary_expectation_min = EXCLUDED.salary_expectation_min,
                salary_expectation_max = EXCLUDED.salary_expectation_max,
                preferred_locations = EXCLUDED.preferred_locations,
                remote_preference = EXCLUDED.remote_preference,
                preferred_seniority = EXCLUDED.preferred_seniority,
                preferred_industries = EXCLUDED.preferred_industries,
                resume_text = EXCLUDED.resume_text,
                updated_at = NOW()
            RETURNING id, local_id, name, email, phone, location, title, bio,
                      skills, experience_years,
                      salary_expectation_min, salary_expectation_max,
                      preferred_locations, remote_preference,
                      preferred_seniority, preferred_industries, resume_text""",
            profile.local_id, profile.name, profile.email, profile.phone,
            profile.location, profile.title, profile.bio,
            profile.skills, profile.experience_years,
            profile.salary_expectation_min, profile.salary_expectation_max,
            profile.preferred_locations, profile.remote_preference,
            profile.preferred_seniority, profile.preferred_industries,
            profile.resume_text,
        )

        return UserProfileResponse(
            id=row["id"],
            local_id=row["local_id"],
            name=row["name"],
            email=row["email"],
            phone=row["phone"],
            location=row["location"],
            title=row["title"],
            bio=row["bio"],
            skills=list(row["skills"]) if row["skills"] else [],
            experience_years=row["experience_years"] or 0,
            salary_expectation_min=float(row["salary_expectation_min"]) if row["salary_expectation_min"] else None,
            salary_expectation_max=float(row["salary_expectation_max"]) if row["salary_expectation_max"] else None,
            preferred_locations=list(row["preferred_locations"]) if row["preferred_locations"] else [],
            remote_preference=row["remote_preference"] or "any",
            preferred_seniority=row["preferred_seniority"] or "any",
            preferred_industries=list(row["preferred_industries"]) if row["preferred_industries"] else [],
            resume_text=row["resume_text"],
        )


@router.get("/{local_id}", response_model=UserProfileResponse)
async def get_profile(local_id: str):
    """Retrieve user profile by local_id."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE local_id = $1", local_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")

        return UserProfileResponse(
            id=row["id"],
            local_id=row["local_id"],
            name=row["name"],
            email=row["email"],
            phone=row["phone"],
            location=row["location"],
            title=row["title"],
            bio=row["bio"],
            skills=list(row["skills"]) if row["skills"] else [],
            experience_years=row["experience_years"] or 0,
            salary_expectation_min=float(row["salary_expectation_min"]) if row["salary_expectation_min"] else None,
            salary_expectation_max=float(row["salary_expectation_max"]) if row["salary_expectation_max"] else None,
            preferred_locations=list(row["preferred_locations"]) if row["preferred_locations"] else [],
            remote_preference=row["remote_preference"] or "any",
            preferred_seniority=row["preferred_seniority"] or "any",
            preferred_industries=list(row["preferred_industries"]) if row["preferred_industries"] else [],
            resume_text=row["resume_text"],
        )


@router.delete("/{local_id}")
async def delete_profile(local_id: str):
    """Delete user profile."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM user_profiles WHERE local_id = $1", local_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"message": "Profile deleted"}
