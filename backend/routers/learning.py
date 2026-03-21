from fastapi import APIRouter, HTTPException
from models import LearningPlanRequest
from services import generate_learning_plan
from ai_utils import AIRateLimitError, AISchemaValidationError, AIServiceError

router = APIRouter(prefix="/learning", tags=["learning"])

@router.post("")
def generate_learning_recommendations(request: LearningPlanRequest):
    """Generate learning recommendations based on scored interview report."""
    try:
        result = generate_learning_plan(request)
        return {**result.data.model_dump(), "_ai_meta": result.meta.model_dump()}
    except AIRateLimitError:
        raise HTTPException(status_code=429, detail="AI service is rate limited. Please try again in a moment.")
    except AISchemaValidationError:
        raise HTTPException(status_code=502, detail="AI returned an unexpected response format. Please try again.")
    except AIServiceError:
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable.")
    except Exception:
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
