import os
import re
import json
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types

router = APIRouter(prefix="/api", tags=["resume"])

MAX_RESUME_CHARS = 20_000

# Model priority list – try each in order on rate-limit errors
GEMINI_MODELS = [
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def _get_client():
    if not _client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set.")
    return _client


def _extract_text_from_file(data: bytes, filename: str, content_type: str) -> str:
    fname = filename.lower()
    ct = content_type or ""

    if ct == "application/pdf" or fname.endswith(".pdf"):
        try:
            import fitz  # pymupdf
            doc = fitz.open(stream=data, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF parse error: {e}")

    if ct == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or fname.endswith(".docx"):
        try:
            import docx
            import io
            document = docx.Document(io.BytesIO(data))
            return "\n".join(p.text for p in document.paragraphs)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"DOCX parse error: {e}")

    return data.decode("utf-8", errors="replace")


def _extract_json(raw: str) -> str:
    match = re.search(r"```json\s*([\s\S]*?)```", raw, re.IGNORECASE)
    return match.group(1).strip() if match else raw.strip()


def _normalize_profile(profile: dict) -> dict:
    def safe(v):
        return v.strip() if isinstance(v, str) else ""
    links = profile.get("links") or {}
    return {
        "name": safe(profile.get("name")),
        "email": safe(profile.get("email")),
        "phone": safe(profile.get("phone")),
        "location": safe(profile.get("location")),
        "title": safe(profile.get("title")),
        "links": {
            "linkedin": safe(links.get("linkedin")),
            "github": safe(links.get("github")),
            "website": safe(links.get("website")),
        },
    }


def _normalize_sections(sections: list) -> list:
    result = []
    for i, s in enumerate(sections):
        title = s.get("title", "").strip() if isinstance(s.get("title"), str) else ""
        content = s.get("content", "").strip() if isinstance(s.get("content"), str) else ""
        if not content:
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or f"section-{i + 1}"
        result.append({"id": slug, "title": title or f"Section {i + 1}", "content": content})
    if not result:
        raise HTTPException(status_code=502, detail="Gemini did not return any usable sections.")
    return result


# ---------------------------------------------------------------------------
# Local (rule-based) resume parser — works without Gemini
# ---------------------------------------------------------------------------

# Common resume section headers (case-insensitive)
_SECTION_HEADERS = [
    "summary", "professional summary", "objective", "career objective",
    "about", "about me", "profile",
    "experience", "work experience", "professional experience", "employment",
    "employment history", "work history",
    "education", "academic background", "qualifications",
    "skills", "technical skills", "core competencies", "technologies",
    "projects", "personal projects", "key projects",
    "certifications", "certificates", "licenses",
    "awards", "honors", "achievements", "accomplishments",
    "publications", "research",
    "volunteer", "volunteer experience", "community involvement",
    "interests", "hobbies",
    "references", "languages",
]

# Build a regex that matches any of the known headers at the start of a line
_HEADER_PATTERN = re.compile(
    r"^[ \t]*(" + "|".join(re.escape(h) for h in sorted(_SECTION_HEADERS, key=len, reverse=True)) + r")[ \t]*:?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(?:\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}")
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_.]+/?", re.IGNORECASE)
_GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9\-_.]+/?", re.IGNORECASE)
_URL_RE = re.compile(r"https?://[^\s,]+")


def _parse_resume_local(resume_text: str) -> dict:
    """Split resume text into sections using header detection + regex profile extraction."""
    lines = resume_text.split("\n")

    # --- Extract profile from first ~15 lines (header area) ---
    header_block = "\n".join(lines[:15])

    email_m = _EMAIL_RE.search(header_block)
    phone_m = _PHONE_RE.search(header_block)
    linkedin_m = _LINKEDIN_RE.search(header_block)
    github_m = _GITHUB_RE.search(header_block)

    # Name heuristic: first non-empty line that isn't an email/phone/url
    name = ""
    for line in lines[:5]:
        stripped = line.strip()
        if not stripped:
            continue
        if _EMAIL_RE.search(stripped) or _PHONE_RE.search(stripped) or _URL_RE.search(stripped):
            continue
        # Likely the person's name
        name = stripped
        break

    profile = {
        "name": name,
        "email": email_m.group(0) if email_m else "",
        "phone": phone_m.group(0) if phone_m else "",
        "location": "",
        "title": "",
        "links": {
            "linkedin": linkedin_m.group(0) if linkedin_m else "",
            "github": github_m.group(0) if github_m else "",
            "website": "",
        },
    }

    # --- Split into sections by header matching ---
    matches = list(_HEADER_PATTERN.finditer(resume_text))

    sections = []
    seen_ids = set()
    if not matches:
        # No headers found — put everything into a single section
        sections.append({
            "id": "resume-content",
            "title": "Resume Content",
            "content": resume_text.strip(),
        })
        seen_ids.add("resume-content")
    else:
        # Content before the first header — skip if it's just contact info
        # (the profile extractor already captured name/email/phone)
        preamble = resume_text[: matches[0].start()].strip()
        # Remove lines that are purely contact info
        preamble_lines = []
        for line in preamble.split("\n"):
            stripped = line.strip()
            if not stripped:
                continue
            # Skip lines that are just the name
            if stripped == name:
                continue
            # Strip out all recognizable contact info from the line
            cleaned = stripped
            cleaned = _EMAIL_RE.sub("", cleaned)
            cleaned = _PHONE_RE.sub("", cleaned)
            cleaned = _LINKEDIN_RE.sub("", cleaned)
            cleaned = _GITHUB_RE.sub("", cleaned)
            cleaned = _URL_RE.sub("", cleaned)
            # Remove leftover separators / punctuation
            cleaned = re.sub(r"[|•·,\-\s]+", "", cleaned).strip()
            if not cleaned:
                continue  # line was entirely contact info
            preamble_lines.append(stripped)
        preamble_text = "\n".join(preamble_lines).strip()

        if preamble_text and len(preamble_text) > 20:
            sections.append({
                "id": "contact-info",
                "title": "Contact Info",
                "content": preamble_text,
            })
            seen_ids.add("contact-info")

        for i, m in enumerate(matches):
            title = m.group(1).strip().title()
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(resume_text)
            content = resume_text[start:end].strip()
            if not content:
                continue
            slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            # Deduplicate IDs
            if slug in seen_ids:
                slug = f"{slug}-{i + 1}"
            seen_ids.add(slug)
            sections.append({"id": slug, "title": title, "content": content})

    if not sections:
        sections.append({
            "id": "resume-content",
            "title": "Resume Content",
            "content": resume_text.strip(),
        })

    return {"sections": sections, "profile": profile}


@router.post("/parse-resume")
async def parse_resume(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    resume_text = ""
    if text:
        resume_text = text.strip()

    if not resume_text and file:
        data = await file.read()
        resume_text = _extract_text_from_file(data, file.filename or "", file.content_type or "").strip()

    if not resume_text:
        raise HTTPException(status_code=400, detail="No resume content provided.")

    if len(resume_text) > MAX_RESUME_CHARS:
        resume_text = resume_text[:MAX_RESUME_CHARS]

    # --- Try AI parsing first, fall back to local rule-based parser ---
    ai_available = _client is not None

    if ai_available:
        prompt = "\n".join([
            "You are a resume parsing assistant.",
            "Analyze the resume text and return structured JSON with sections and top-of-resume profile details.",
            "Return STRICT JSON with this exact shape (no extra keys):",
            '{"profile":{"name":"","email":"","phone":"","location":"","title":"","links":{"linkedin":"","github":"","website":""}},"sections":[{"title":"Title","content":"Content"}]}',
            "Notes:",
            "- Extract profile from the header (name, email, phone, location, title).",
            "- Links are optional, include if present (LinkedIn, GitHub, personal website).",
            "- Use title case for section titles.",
            "- Preserve bullet points as newline separated lines.",
            "- Include sections only if content is available.",
            "Resume text:",
            f'"""{resume_text}"""',
        ])

        for model in GEMINI_MODELS:
            try:
                response = _client.models.generate_content(
                    model=model,
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                )
                raw = response.text
                json_text = _extract_json(raw)
                parsed = json.loads(json_text)
                sections = _normalize_sections(parsed.get("sections", []))
                profile = _normalize_profile(parsed.get("profile") or {})
                return {"sections": sections, "profile": profile}
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    continue  # try next model
                # For JSON parse or normalization errors, fall through to local parser
                break

    # --- Fallback: local rule-based parser (always works) ---
    result = _parse_resume_local(resume_text)
    return result


class ImproveSectionRequest(BaseModel):
    title: Optional[str] = None
    content: str
    jobTitle: Optional[str] = None
    jobDescription: Optional[str] = None


@router.post("/improve-section")
async def improve_section(req: ImproveSectionRequest):
    client = _get_client()

    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Section content is required.")

    guidance = [
        "You are a professional resume writer.",
        "Improve the given resume section to be clear, concise, and impactful.",
        "If a target role or job description is provided, tailor the language and emphasis to match it, but only based on the user's existing content.",
        "CRITICAL: Do NOT fabricate or add new accomplishments, roles, skills, tools, education, certifications, or dates. Rephrase, reorganize, or quantify only when the original text already implies it.",
        "Keep the same section type/title if provided.",
        "Prefer bullet points starting with '- ' for lists; KEEP PLAIN TEXT ONLY.",
        "Keep length roughly similar (within ±20%), no more than ~1800 characters.",
        'Return only strict JSON in this exact shape: {"improved":"..."} with no markdown code fences.',
        "Output only the improved content; do not include commentary or instructions.",
    ]
    parts = list(guidance)
    if req.jobTitle:
        parts.append(f"Target role: {req.jobTitle}")
    if req.jobDescription and req.jobDescription.strip():
        parts.append(f'Job description/context:\n"""{req.jobDescription}"""')
    if req.title:
        parts.append(f"Section title: {req.title}")
    parts.append("Original section:")
    parts.append(f'"""{req.content}"""')

    prompt = "\n".join(parts)

    last_error = None
    for model in GEMINI_MODELS:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
            )
            raw = response.text
            break
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                continue
            raise HTTPException(status_code=502, detail=f"Gemini error: {e}")
    else:
        raise HTTPException(
            status_code=429,
            detail="AI rate limit reached. Please wait a minute and try again.",
        )

    json_text = _extract_json(raw)
    try:
        parsed = json.loads(json_text)
    except Exception:
        raise HTTPException(status_code=502, detail="Gemini returned an unreadable improvement.")

    improved = parsed.get("improved", "")
    if not isinstance(improved, str) or not improved.strip():
        raise HTTPException(status_code=502, detail="Gemini did not return improved content.")

    return {"improved": improved.strip()[:1800]}
