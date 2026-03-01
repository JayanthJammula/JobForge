from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Annotated, Dict, Any
import uuid

class RawJob(BaseModel):
    """Raw job data from JSearch API."""
    job_id: str = Field(description="Unique identifier for the job.")
    job_title: Optional[str] = Field(description="The job title.")
    employer_name: Optional[str] = Field(description="The company name.")
    job_description: Optional[str] = Field(description="Full job description.")
    job_city: Optional[str] = Field(description="Job city.")
    job_state: Optional[str] = Field(description="Job state.")
    job_apply_link: Optional[str] = Field(description="Direct application link.")
    job_employment_type: Optional[str] = Field(description="Employment type (full-time, part-time, etc.).")
    job_salary_min: Optional[float] = Field(description="Minimum salary if available.")
    job_salary_max: Optional[float] = Field(description="Maximum salary if available.")
    job_salary_currency: Optional[str] = Field(description="Salary currency.")
    job_salary_period: Optional[str] = Field(description="Salary period (hourly, yearly, etc.).")

class JobAnalysis(BaseModel):
    """AI-generated analysis of a job description."""
    description_summary: str = Field(description="A concise summary of the job description.")
    requirements: List[str] = Field(description="A list of core job requirements and qualifications.")
    required_skills: List[str] = Field(description="A list of technical or soft skills mentioned.")

class JobDescriptionRequest(BaseModel):
    job_description: str

class JobSearchRequest(BaseModel):
    query: str = "Software Developer Jobs in USA"
    page: int = 1
    num_pages: int = 1
    country: str = "us"
    date_posted: str = "today"
    job_requirements: str = "under_3_years_experience"

# Question generation models
QuestionType = Literal["coding", "behavioral", "job_requirement"]
Difficulty = Literal["easy", "medium", "hard"]

class CodingMeta(BaseModel):
    difficulty: Difficulty
    target_language: Optional[str] = Field(default="TypeScript")
    constraints: List[str] = Field(default_factory=list)
    examples: List[str] = Field(default_factory=list)

class Question(BaseModel):
    question_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: QuestionType
    text: str = Field(description="Question text the interviewer will ask")
    rationale: str = Field(description="Why this question fits the JD & resume")
    rubric: List[str] = Field(description="Bullet points used to grade a strong answer")
    coding: Optional[CodingMeta] = None  # required only when kind="coding"
    user_response: str = Field(
        default="", description="Candidate's response; initially empty and later filled in by the app"
    )

class QuestionSet(BaseModel):
    job_title: str
    summary: str
    questions: Annotated[List[Question], Field(min_length=10, max_length=10)]

class QuestionGenerationRequest(BaseModel):
    job_description: str
    resume: str
    job_title: str
    difficulty: Difficulty = "medium"

# Learning recommendation models
class BulletEvalOut(BaseModel):
    criterion: str
    score: float
    notes: Optional[str] = None

class CodingReview(BaseModel):
    time_complexity: str
    space_complexity: str
    correctness_risk: Optional[Literal["low", "medium", "high"]]
    notes: str

class ScoredItem(BaseModel):
    question_id: str
    kind: QuestionType
    text: str
    verdict: Literal["excellent", "good", "fair", "poor"]
    raw_score: float
    max_score: float
    percent: float
    weight: float
    weighted_raw: Optional[float] = None
    weighted_max: Optional[float] = None
    bullet_evals: List[BulletEvalOut]
    feedback: str
    coding_review: Optional[CodingReview] = None

class ScoredReportIn(BaseModel):
    job_title: str
    overall: Dict[str, Any]
    items: Annotated[List[ScoredItem], Field(min_length=1)]

ResourceType = Literal["doc", "course", "video", "practice", "book", "tool", "article"]
CostType = Literal["free", "paid", "freemium", "unknown"]
SkillArea = Literal[
    "coding", "frontend", "backend", "database", "infra", "testing",
    "collaboration", "architecture", "ai-ml", "other"
]
Priority = Literal["high", "medium", "low"]

class LearningResource(BaseModel):
    title: str
    type: ResourceType
    provider: Optional[str] = None
    url: Optional[str] = None
    est_time_hours: Optional[float] = None
    cost: CostType = "free"

class TopicPlan(BaseModel):
    topic: str
    skill_area: SkillArea
    why: str  # tie to weak rubric items / question text
    priority: Priority
    target_score: Optional[float] = None
    actions: List[str]  # concrete steps
    practice_tasks: List[str]  # hands-on tasks
    resources: List[LearningResource]

class RecommendationReport(BaseModel):
    job_title: str
    overview: str  # concise narrative of strengths & gaps
    quick_wins: List[str]
    topics: List[TopicPlan]
    study_schedule: List[str]

class LearningPlanRequest(BaseModel):
    scored_report: ScoredReportIn
    threshold: float = 70.0
    budget_hours: float = 20.0
    max_resources: int = 6

# Scoring models
class BulletEval(BaseModel):
    criterion: str
    # Use 0, 0.5, or 1 where possible; allow floats for nuance.
    score: float = Field(ge=0, le=1)
    notes: Optional[str] = ""

class QuestionEvaluation(BaseModel):
    question_id: str
    kind: QuestionType
    verdict: Literal["excellent", "good", "fair", "poor"]
    bullet_evals: List[BulletEval]
    feedback: str
    coding_review: Optional[CodingReview] = None

class ScoreReport(BaseModel):
    job_title: str
    overall_summary: str
    items: List[QuestionEvaluation]

class ScoringRequest(BaseModel):
    question_set: QuestionSet

# Guidance/coach models
class GuidanceRequest(BaseModel):
    main_question: str
    history_str: str
    new_user_query: str

class GuidanceResponse(BaseModel):
    guidance: str
