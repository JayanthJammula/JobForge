from fastapi import APIRouter, HTTPException
from typing import List
from models import RawJob
from services import get_raw_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("", response_model=List[RawJob])
def get_jobs(
    query: str = "Software Engineering Jobs in  New York City", 
    page: int = 1, 
    num_pages: int = 1, 
    country: str = "us", 
    date_posted: str = "today", 
    job_requirements: str = "over_3_years_experience"
):
    """Get raw job data from JSearch API without AI processing."""
    try:
        jobs = get_raw_jobs(
            query=query,
            page=page,
            num_pages=num_pages,
            country=country,
            date_posted=date_posted,
            job_requirements=job_requirements
        )
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
