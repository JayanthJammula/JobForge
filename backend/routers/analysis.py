from fastapi import APIRouter, HTTPException
from models import JobDescriptionRequest
from services import analyze_job_description
from ai_utils import AIRateLimitError, AISchemaValidationError, AIServiceError

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/job")
def analyze_job(request: JobDescriptionRequest):
    """Analyze a job description and extract summary, requirements, and skills using AI."""
    try:
        result = analyze_job_description(request.job_description)
        return {**result.data.model_dump(), "_ai_meta": result.meta.model_dump()}
    except AIRateLimitError:
        raise HTTPException(status_code=429, detail="AI service is rate limited. Please try again in a moment.")
    except AISchemaValidationError:
        raise HTTPException(status_code=502, detail="AI returned an unexpected response format. Please try again.")
    except AIServiceError:
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable.")
    except Exception:
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
