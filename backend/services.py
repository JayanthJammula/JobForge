import requests
import os
from typing import List

from google import genai
from google.genai import types
from models import (
    RawJob, JobAnalysis, QuestionSet, QuestionGenerationRequest,
    RecommendationReport, LearningPlanRequest, ScoreReport, ScoringRequest,
    GuidanceRequest, GuidanceResponse,
)
from ai_utils import call_gemini, AICallResult

# Environment variables
RAPIDAPI_HOST = "jsearch.p.rapidapi.com"
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "your-rapidapi-key-here")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Setup AI client
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found. Using dummy key, AI calls will fail.")
    ai_client = genai.Client(api_key="DUMMY_KEY_IF_MISSING")
else:
    ai_client = genai.Client(api_key=GEMINI_API_KEY)

# Model tiers: cheap calls use lite first, heavy calls use flash first
MODELS_LITE = ["models/gemini-flash-lite-latest", "models/gemini-flash-latest"]
MODELS_HEAVY = ["models/gemini-flash-latest", "models/gemini-2.0-flash"]


def get_raw_jobs(query: str, page: int, num_pages: int, country: str,
                date_posted: str, job_requirements: str) -> List[RawJob]:
    """Fetch raw job data from JSearch API."""
    placeholder = "your-rapidapi-key-here"
    if not RAPIDAPI_KEY or RAPIDAPI_KEY == placeholder:
        print("Warning: RAPIDAPI_KEY not set. Job search is unavailable.")
        return []

    url = f"https://{RAPIDAPI_HOST}/search"
    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
    }
    params = {
        "query": query,
        "page": page,
        "num_pages": num_pages,
        "country": country,
        "date_posted": date_posted,
        "job_requirements": job_requirements,
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        raw_data = response.json()
    except Exception as e:
        raise Exception(f"JSearch API error: {str(e)}")

    jobs: List[RawJob] = []
    for i, job in enumerate(raw_data.get("data", [])):
        job_id = f"job_{i}_{hash(job.get('job_title', ''))}"

        jobs.append(RawJob(
            job_id=job_id,
            job_title=job.get('job_title'),
            employer_name=job.get('employer_name'),
            job_description=job.get('job_description'),
            job_city=job.get('job_city'),
            job_state=job.get('job_state'),
            job_apply_link=job.get('job_apply_link'),
            job_employment_type=job.get('job_employment_type'),
            job_salary_min=job.get('job_salary_min'),
            job_salary_max=job.get('job_salary_max'),
            job_salary_currency=job.get('job_salary_currency'),
            job_salary_period=job.get('job_salary_period')
        ))

    return jobs


def analyze_job_description(job_description: str) -> AICallResult:
    """Analyze job description using AI and return structured data."""
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=JobAnalysis,
    )

    return call_gemini(
        ai_client,
        models=MODELS_LITE,
        contents=[
            {"role": "user", "parts": [{"text": f"Analyze the following job description and extract:\n1. A concise summary of what the job involves (4-5 lines)\n2. Key requirements and qualifications needed (return as a list of individual requirements (upto 5)\n3. Required technical and soft skills (return as a list of individual skills (upto 5) )\n\nJob Description:\n{job_description}"}]}
        ],
        config=config,
        response_model=JobAnalysis,
        operation="analyze_job",
    )


def generate_questions(request: QuestionGenerationRequest) -> AICallResult:
    """Generate interview questions using AI based on job description and resume."""

    SYSTEM_PROMPT = """You are an interview-question generator that must return STRICT JSON.
Return a JSON object with these EXACT top-level keys (no wrapping):
- "job_title": string
- "summary": string (brief overview of the interview)
- "questions": array of EXACTLY 10 question objects

Each question object must have:
- "question_id": unique string
- "kind": one of "coding", "behavioral", "job_requirement"
- "text": the question text
- "rationale": why this question fits the JD/resume
- "rubric": array of 3-5 bullet strings for grading
- "user_response": empty string ""
- "coding": (ONLY for kind="coding") object with "difficulty", "target_language", "constraints" (array), "examples" (array)

Rules (MUST FOLLOW):
- Total questions: EXACTLY 10.
- Exactly 2 questions with kind="coding". They MUST be classic LeetCode-style DS&A (e.g., arrays, hash maps, stacks, strings, graphs).
- The other 8 questions are non-coding: kind="job_requirement" or "behavioral".
- Scope for interns: keep non-coding questions practical and foundational.
- For coding questions: set difficulty to {difficulty}, include short concrete examples (I/O) and constraints.
- Ensure breadth: avoid duplicates, cover the JD's key responsibilities and technologies.
- Do not output anything outside of JSON.
"""

    USER_PROMPT = """Job Description:
---
{jd}
---

Candidate Resume:
---
{resume}
---

Task:
Create interview questions JSON for the role "{job_title}" with:
- Exactly 10 questions
- Exactly 2 coding (LeetCode DS&A)
- 8 non-coding (job_requirement/behavioral) tuned to an INTERN scope
Return the JSON object directly (not wrapped in another object).
"""

    # Note: QuestionSet has Optional[CodingMeta] which the google-genai SDK
    # can't convert to JSON schema (KeyError on anyOf). We omit response_schema
    # and rely on the prompt + Pydantic validation via response_model instead.
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
    )

    system_prompt = SYSTEM_PROMPT.format(difficulty=request.difficulty)
    user_prompt = USER_PROMPT.format(
        jd=request.job_description,
        resume=request.resume,
        job_title=request.job_title
    )

    return call_gemini(
        ai_client,
        models=MODELS_LITE,
        contents=[
            {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
        ],
        config=config,
        response_model=QuestionSet,
        operation="generate_questions",
    )


def generate_learning_plan(request: LearningPlanRequest) -> AICallResult:
    """Generate learning recommendations based on scored interview report."""

    SYSTEM_PROMPT = """You are a career coach who designs targeted learning plans for software engineers.
You will receive a scored interview report (per-question % and rubric notes).
Your job: produce a JSON RecommendationReport that helps the candidate improve specifically on low or suboptimal areas.

Rules (MUST FOLLOW):
- Return STRICT JSON matching the provided schema.
- Focus remediation on questions with percent < {threshold}% OR verdict in ["fair", "poor"].
- Use the question text, kind, and bullet notes to derive concrete topics (e.g., "TypeScript interfaces vs types", "REST status codes", "Hash map practice", "Next.js SSR vs SSG", "Foreign keys in Postgres", "Code reviews").
- Prioritize topics by impact (coding & core backend fundamentals first for Back End roles).
- Include actionable practice_tasks (e.g., "Implement 5 hash-map problems on arrays/strings", "Create a Next.js API route with auth and rate limiting").
- Include a realistic study_schedule that fits within ~{budget_hours} hours (e.g., 2–3 weeks, 6–10 hrs/week).
- Keep wording concise and practical. Avoid generic advice.
- Limit topics to 3-5 maximum to avoid overwhelming the candidate.
- Limit quick_wins to 3-5 maximum.
- Provide 1-3 resources per topic maximum.

CRITICAL RESOURCE RULES:
- ONLY use real, well-known resources that you are confident exist. Examples of trusted sources:
  - Documentation: MDN Web Docs (developer.mozilla.org), Python docs (docs.python.org), React docs (react.dev), official framework docs
  - Practice: LeetCode (leetcode.com), HackerRank (hackerrank.com), Exercism (exercism.org), freeCodeCamp (freecodecamp.org)
  - Courses: freeCodeCamp YouTube, Traversy Media YouTube, The Odin Project (theodinproject.com), CS50 (cs50.harvard.edu)
  - Articles: Real Python (realpython.com), DigitalOcean tutorials (digitalocean.com/community/tutorials), Baeldung (baeldung.com)
  - Videos: YouTube channels (Fireship, Web Dev Simplified, Corey Schafer, Tech With Tim, NeetCode)
- For URLs: use only the base/known URL paths you are confident about (e.g., "https://leetcode.com/problemset/", "https://developer.mozilla.org/en-US/docs/Web/JavaScript", "https://react.dev/learn").
- DO NOT fabricate or guess specific course/article URLs. If you are unsure of the exact URL, provide the site's homepage URL instead (e.g., "https://leetcode.com" not "https://leetcode.com/problems/some-made-up-slug").
- If a resource is a YouTube video/channel, use the channel URL (e.g., "https://www.youtube.com/@NeetCode") not a guessed video URL.
- Set "cost" accurately: "free" for MDN, LeetCode, freeCodeCamp, YouTube, docs sites; "freemium" for sites with paid tiers; "paid" for Udemy, Coursera certificates.

Safety and integrity:
- If all percents ≥ {threshold} and verdicts are "good/excellent", still produce stretch topics and advanced resources.
- Do not output anything outside JSON.
"""

    USER_PROMPT = """Scored interview JSON:
---
{scores_json}
---
Context:
- Use at most {max_resources} total resources across the plan.
- Candidate role: {job_title}
"""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecommendationReport,
    )

    system_prompt = SYSTEM_PROMPT.format(
        threshold=request.threshold,
        budget_hours=request.budget_hours
    )
    user_prompt = USER_PROMPT.format(
        scores_json=request.scored_report.model_dump_json(),
        max_resources=request.max_resources,
        job_title=request.scored_report.job_title
    )

    return call_gemini(
        ai_client,
        models=MODELS_HEAVY,
        contents=[
            {"role": "user", "parts": [{"text": f"{system_prompt}\n{user_prompt}"}]},
        ],
        config=config,
        response_model=RecommendationReport,
        operation="generate_learning_plan",
    )


def score_questions(request: ScoringRequest) -> AICallResult:
    """Score interview questions based on user responses."""

    SCORER_SYSTEM_PROMPT = """You are a rigorous interview grader. You will receive a QuestionSet JSON with:
- job_title, summary, and exactly 10 questions.
- Each question has: question_id, kind ("coding" | "behavioral" | "job_requirement"), text, rubric (list of bullet criteria), and user_response.

Your task: score EACH question ONLY against its rubric.

Return a JSON object with these EXACT top-level keys (no wrapping):
- "job_title": string
- "overall_summary": string (brief overall assessment)
- "items": array of evaluation objects, one per question

Each evaluation object must have:
- "question_id": string (matching input)
- "kind": string (matching input)
- "verdict": one of "excellent", "good", "fair", "poor"
- "bullet_evals": array of objects with "criterion" (string), "score" (0, 0.5, or 1), "notes" (string)
- "feedback": string (concise actionable feedback)
- "coding_review": (ONLY for kind="coding") object with "time_complexity", "space_complexity", "correctness_risk" (low/medium/high), "notes"

Rules (MUST FOLLOW):
- For each question, produce bullet_evals with the SAME count and ORDER as the input rubric.
- verdict mapping: excellent ≥ 0.85, good 0.65–0.84, fair 0.35–0.64, poor < 0.35
- Evaluate the ACTUAL user_response, not hypothetical answers.
- Do not invent new rubric items. If a criterion is not addressed, score 0.
- Keep feedback concise, actionable, and respectful.
- Output JSON ONLY, no extra text.
"""

    SCORER_USER_PROMPT = """QuestionSet to grade (JSON):

{question_set_json}
"""

    # Note: ScoreReport has Optional[CodingReview] which the google-genai SDK
    # can't convert to JSON schema (KeyError on anyOf). We omit response_schema
    # and rely on the prompt + Pydantic validation via response_model instead.
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
    )

    user_prompt = SCORER_USER_PROMPT.format(
        question_set_json=request.question_set.model_dump_json()
    )

    return call_gemini(
        ai_client,
        models=MODELS_HEAVY,
        contents=[
            {"role": "user", "parts": [{"text": f"{SCORER_SYSTEM_PROMPT}\n{user_prompt}"}]}
        ],
        config=config,
        response_model=ScoreReport,
        operation="score_questions",
    )


def generate_guidance(request: GuidanceRequest) -> AICallResult:
    """Generate concise coaching guidance (<150 words) using main question, history, and new user query."""
    SYSTEM_PROMPT = (
        "You are given a main question to serve as context:\n"
        "Main Question: {main_question}\n\n"
        "So far, the conversation history is as follows:{history_str}\n\n"
        "Now the user asks a new follow-up question related to the above:\n"
        "User: {new_user_query}\n\n"
        "Your role:\n"
        "1. Use the main question as the guiding context for the discussion.\n"
        "2. Do not provide the direct answer to the user's follow-up; instead, help the user think through the problem. Make the answer precise and concised. DON'T OVER EXPLAIN\n"
        "3. Offer guiding questions, suggest frameworks, or point to key concepts the user should explore.\n"
        "4. If the user seems stuck or unclear, propose specific subtopics or steps that could lead them closer to answering their own question.\n"
        "5. Keep your guidance concise, constructive, and well-structured.\n"
        "6. Ensure your response is less than 75 words."
    )

    user_prompt = SYSTEM_PROMPT.format(
        main_question=request.main_question,
        history_str=f"\n{request.history_str}\n" if request.history_str else "",
        new_user_query=request.new_user_query,
    )

    config = types.GenerateContentConfig(
        response_mime_type="text/plain",
    )

    result = call_gemini(
        ai_client,
        models=MODELS_LITE,
        contents=[{"role": "user", "parts": [{"text": user_prompt}]}],
        config=config,
        operation="generate_guidance",
    )

    # Post-process: hard cap to 150 words
    text = result.data.strip()
    words = text.split()
    if len(words) > 150:
        text = " ".join(words[:150])

    result.data = GuidanceResponse(guidance=text)
    return result
