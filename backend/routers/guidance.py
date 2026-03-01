from fastapi import APIRouter, HTTPException
from models import GuidanceRequest, GuidanceResponse
from services import generate_guidance

router = APIRouter(prefix="/coach", tags=["coach"])


@router.post("/guide", response_model=GuidanceResponse)
def guide_user(request: GuidanceRequest):
    """Provide concise guidance to a follow-up question using main context and history."""
    try:
        return generate_guidance(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


