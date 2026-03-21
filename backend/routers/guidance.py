from fastapi import APIRouter, HTTPException
from models import GuidanceRequest
from services import generate_guidance
from ai_utils import AIRateLimitError, AISchemaValidationError, AIServiceError

router = APIRouter(prefix="/coach", tags=["coach"])


@router.post("/guide")
def guide_user(request: GuidanceRequest):
    """Provide concise guidance to a follow-up question using main context and history."""
    try:
        result = generate_guidance(request)
        return {**result.data.model_dump(), "_ai_meta": result.meta.model_dump()}
    except AIRateLimitError:
        raise HTTPException(status_code=429, detail="AI service is rate limited. Please try again in a moment.")
    except AISchemaValidationError:
        raise HTTPException(status_code=502, detail="AI returned an unexpected response format. Please try again.")
    except AIServiceError:
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable.")
    except Exception:
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
