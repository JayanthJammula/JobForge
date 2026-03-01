from fastapi import APIRouter, HTTPException
from models import RecommendationReport, LearningPlanRequest
from services import generate_learning_plan

router = APIRouter(prefix="/learning", tags=["learning"])

@router.post("", response_model=RecommendationReport)
def generate_learning_recommendations(request: LearningPlanRequest):
    """Generate learning recommendations based on scored interview report."""
    try:
        recommendation_report = generate_learning_plan(request)
        return recommendation_report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
