from fastapi import APIRouter, HTTPException
from models import ScoreReport, ScoringRequest
from services import score_questions

router = APIRouter(prefix="/scores", tags=["scores"])

@router.post("", response_model=ScoreReport)
def score_interview_questions(request: ScoringRequest):
    """Score interview questions based on user responses."""
    try:
        score_report = score_questions(request)
        return score_report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
