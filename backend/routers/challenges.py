"""Coding Challenge generation and management endpoints."""

import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from db.connection import get_pool
from services import ai_client
from google.genai import types

router = APIRouter(prefix="/challenges", tags=["challenges"])


class CodingChallengeRequest(BaseModel):
    job_description: str
    difficulty: str = "medium"
    count: int = 3
    target_language: str = "javascript"


class CodeSubmission(BaseModel):
    code: str
    language: str = "javascript"
    test_cases: List[Dict[str, Any]] = []


CHALLENGE_GENERATION_PROMPT = """You are a coding challenge generator. Based on the job description below, generate {count} LeetCode-style coding problems.

Job Description:
{job_description}

Requirements:
- Difficulty: {difficulty}
- Generate problems that test skills relevant to this job
- Each problem must include:
  1. A clear title
  2. A detailed description of the problem
  3. A category (e.g., "arrays", "strings", "hash_map", "trees", "dynamic_programming", "graphs", "sorting", "linked_list", "stack", "queue", "recursion", "binary_search")
  4. 3-5 test cases with input and expected output (as JSON-serializable strings)
  5. 2-3 examples with input, output, and explanation
  6. Constraints (e.g., "1 <= nums.length <= 10^4")
  7. Starter code for {target_language} with a function signature
  8. 1-2 solution hints (without giving away the answer)
  9. Related skills from the job description

Return a JSON array of objects with this EXACT structure:
[
  {{
    "title": "Problem Title",
    "description": "Full problem description...",
    "difficulty": "{difficulty}",
    "category": "arrays",
    "related_skills": ["JavaScript", "Arrays"],
    "starter_code": {{
      "{target_language}": "function solve(nums) {{\\n  // Your code here\\n}}"
    }},
    "test_cases": [
      {{"input": "[1, 2, 3]", "expected_output": "6", "is_hidden": false}},
      {{"input": "[4, 5, 6]", "expected_output": "15", "is_hidden": true}}
    ],
    "examples": [
      {{"input": "[1, 2, 3]", "output": "6", "explanation": "Sum of all elements"}}
    ],
    "constraints": ["1 <= nums.length <= 10^4", "-10^4 <= nums[i] <= 10^4"],
    "solution_hints": ["Consider using a running total", "Think about edge cases with empty arrays"]
  }}
]

Return ONLY the JSON array, no other text.
"""


@router.post("/generate")
async def generate_challenges(request: CodingChallengeRequest):
    """Generate LeetCode-style challenges based on a job description."""
    prompt = CHALLENGE_GENERATION_PROMPT.format(
        count=request.count,
        job_description=request.job_description[:3000],
        difficulty=request.difficulty,
        target_language=request.target_language,
    )

    try:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
        )

        response = ai_client.models.generate_content(
            model='models/gemini-flash-latest',
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=config,
        )

        challenges = json.loads(response.text)

        # Store in database
        pool = await get_pool()
        stored = []
        async with pool.acquire() as conn:
            for challenge in challenges:
                row = await conn.fetchrow(
                    """INSERT INTO coding_challenges (
                        title, description, difficulty, category,
                        related_skills, starter_code, test_cases,
                        solution_hints, constraints, examples
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id""",
                    challenge.get("title", "Untitled"),
                    challenge.get("description", ""),
                    challenge.get("difficulty", request.difficulty),
                    challenge.get("category", "general"),
                    challenge.get("related_skills", []),
                    json.dumps(challenge.get("starter_code", {})),
                    json.dumps(challenge.get("test_cases", [])),
                    challenge.get("solution_hints", []),
                    challenge.get("constraints", []),
                    json.dumps(challenge.get("examples", [])),
                )
                challenge["id"] = row["id"]
                stored.append(challenge)

        return stored

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Challenge generation failed: {str(e)}")


@router.get("/{challenge_id}")
async def get_challenge(challenge_id: int):
    """Get a specific challenge by ID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM coding_challenges WHERE id = $1", challenge_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")

        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "difficulty": row["difficulty"],
            "category": row["category"],
            "related_skills": list(row["related_skills"]) if row["related_skills"] else [],
            "starter_code": json.loads(row["starter_code"]) if isinstance(row["starter_code"], str) else row["starter_code"],
            "test_cases": json.loads(row["test_cases"]) if isinstance(row["test_cases"], str) else row["test_cases"],
            "solution_hints": list(row["solution_hints"]) if row["solution_hints"] else [],
            "constraints": list(row["constraints"]) if row["constraints"] else [],
            "examples": json.loads(row["examples"]) if isinstance(row["examples"], str) else row["examples"],
        }


@router.get("")
async def list_challenges(
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(20, le=100),
):
    """List available challenges with optional filters."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        conditions = []
        params = []
        idx = 1

        if difficulty:
            conditions.append(f"difficulty = ${idx}")
            params.append(difficulty)
            idx += 1

        if category:
            conditions.append(f"category = ${idx}")
            params.append(category)
            idx += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        rows = await conn.fetch(f"""
            SELECT id, title, difficulty, category, related_skills, created_at
            FROM coding_challenges
            {where}
            ORDER BY created_at DESC
            LIMIT ${idx}
        """, *params)

        return [
            {
                "id": r["id"],
                "title": r["title"],
                "difficulty": r["difficulty"],
                "category": r["category"],
                "related_skills": list(r["related_skills"]) if r["related_skills"] else [],
            }
            for r in rows
        ]
