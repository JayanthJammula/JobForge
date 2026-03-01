from fastapi import APIRouter, HTTPException
from models import JobAnalysis, JobDescriptionRequest
from services import analyze_job_description

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/job", response_model=JobAnalysis)
def analyze_job(request: JobDescriptionRequest):
    """Analyze a job description and extract summary, requirements, and skills using AI."""
    try:
        analysis = analyze_job_description(request.job_description)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
