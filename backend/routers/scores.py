from fastapi import APIRouter, HTTPException
from models import ScoringRequest
from services import score_questions
from ai_utils import AIRateLimitError, AISchemaValidationError, AIServiceError

router = APIRouter(prefix="/scores", tags=["scores"])

@router.post("")
def score_interview_questions(request: ScoringRequest):
    """Score interview questions based on user responses."""
    try:
        result = score_questions(request)
        return {**result.data.model_dump(), "_ai_meta": result.meta.model_dump()}
    except AIRateLimitError:
        raise HTTPException(status_code=429, detail="AI service is rate limited. Please try again in a moment.")
    except AISchemaValidationError:
        raise HTTPException(status_code=502, detail="AI returned an unexpected response format. Please try again.")
    except AIServiceError:
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable.")
    except Exception:
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
