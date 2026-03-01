from fastapi import APIRouter, HTTPException
from models import QuestionSet, QuestionGenerationRequest
from services import generate_questions

router = APIRouter(prefix="/questions", tags=["questions"])

@router.post("", response_model=QuestionSet)
def generate_interview_questions(request: QuestionGenerationRequest):
    """Generate interview questions based on job description and resume."""
    try:
        question_set = generate_questions(request)
        return question_set
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
