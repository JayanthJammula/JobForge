# JobForge

A full-stack career intelligence platform that combines job search, interview prep, resume management, market analytics, and coding practice into one place.

<p align="center">
  <img src="screenshots/jobs-page.png" alt="Job Search" width="700" />
</p>

## Features

- **Job Search** - Browse and filter job listings powered by the JSearch API with data source attribution
- **Job Analysis** - Get structured summaries, requirements, and skill breakdowns for any job posting
- **Mock Interviews** - Practice with 10 tailored interview questions (8 behavioral/technical + 2 LeetCode-style coding), then get scored with detailed rubric feedback
- **Learning Paths** - Personalized study plans based on your interview scores, with curated resources from real sources (MDN, LeetCode, freeCodeCamp, YouTube, etc.)
- **Resume Builder** - FlowCV-style resume editor with live preview, customizable styling, and PDF export
- **Resume Tailoring** - Optimize your resume for specific job descriptions
- **Smart Match** - Job matching based on your profile (skills, experience, salary preferences, location, remote preference) using a weighted scoring algorithm
- **Market Pulse** - Dashboard with skill trends, salary benchmarks, company hiring velocity, location demand, and emerging skills from aggregated job data
- **Coding Challenges** - LeetCode-style practice problems generated from job descriptions with a built-in code editor, test runner, and difficulty selector
- **Coaching** - Conversational guidance during mock interviews to help you think through problems without giving away answers

<details>
<summary>Screenshots</summary>

### Market Pulse
<img src="screenshots/market-pulse.png" alt="Market Pulse" width="700" />

### Smart Match
<img src="screenshots/smart-match.png" alt="Smart Match" width="700" />

### Profile
<img src="screenshots/profile.png" alt="Profile" width="700" />

### Resume Editor
<img src="screenshots/resume-editor.png" alt="Resume Editor" width="700" />

</details>

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts

**Backend:** FastAPI, Python, Google Gemini, structlog, tenacity

**Database:** PostgreSQL 16 (Docker)

**APIs:** Google Gemini (analysis, questions, scoring, learning plans, challenges, coaching), RapidAPI JSearch (job data)

## Architecture

### Backend Reliability

All Gemini calls go through a centralized `call_gemini()` wrapper that provides:

- **Model fallback** - If the primary model fails or is rate limited, automatically falls back to an alternate model
- **Retry with backoff** - Transient errors are retried with exponential backoff via tenacity
- **Schema validation** - Every response is validated against Pydantic models before being returned
- **Structured logging** - Every request gets a correlation ID, and every call is logged with operation name, model used, latency, and success/failure status
- **Typed error handling** - Rate limits return 429, schema failures return 502, service unavailability returns 503 (never exposes raw exceptions to the client)

### Data Pipeline

The ETL pipeline fetches jobs from JSearch, deduplicates via SHA256 fingerprinting, normalizes salaries to annual USD with bounds validation ($15K-$1M), extracts skills using a 150+ keyword dictionary, and stores everything in PostgreSQL. Data quality metrics (records skipped, salary violations, zero-skill jobs) are tracked per ETL run.

### Frontend Resilience

- **Error Boundary** - Catches render crashes with a fallback UI and reset button
- **Retry with backoff** - API calls to backend endpoints retry on 429/502/503 with exponential backoff and configurable timeouts
- **Response validation** - Critical fields are checked before rendering
- **URL sanitization** - All externally generated URLs are validated (blocks javascript:/data: protocols, normalizes bare domains to https://)
- **Rate limit messaging** - Users see a clear "rate limit reached, try again in a minute" message instead of generic errors

### Observability

- **Structured request logging** - Every HTTP request is logged with method, path, status code, latency, and a unique request ID via structlog
- **Call-level logging** - Every Gemini call logs the operation, model, latency, fallback usage, and response size
- **Database logging** - Call metadata is stored in `ai_call_logs` for historical analysis
- **Health endpoint** - `GET /observability/ai-health` returns last 24h stats: total calls, success rate, avg latency, rate limit count, and breakdowns by operation and model

## Project Structure

```
JobForge/
├── frontend/     # React frontend (port 5173)
│   ├── src/
│   │   ├── components/             # Pages and UI components
│   │   │   ├── ui/                 # shadcn components
│   │   │   ├── pulse/              # Market Pulse chart components
│   │   │   ├── matching/           # Smart Match score components
│   │   │   └── ErrorBoundary.tsx   # Global error boundary
│   │   ├── services/
│   │   │   ├── jobApi.ts           # Job search, analysis, interview API
│   │   │   └── pulseApi.ts         # Market pulse, matching, challenges API
│   │   └── lib/
│   │       ├── apiClient.ts        # fetchWithRetry, timeout, backoff
│   │       ├── urlSanitizer.ts     # URL validation for external links
│   │       ├── codeRunner.ts       # Client-side JS/Python execution
│   │       ├── userLocalId.ts      # Anonymous user identity (UUID)
│   │       ├── profileSync.ts      # Profile sync to backend
│   │       ├── resumeStore.ts      # Resume localStorage wrapper
│   │       └── resumeParser.ts     # Resume file parsing
│   ├── vite.config.ts              # Dev server + API proxy
│   └── package.json
│
├── backend/               # FastAPI backend (port 8000)
│   ├── main.py                     # App entry + lifespan + request logging middleware
│   ├── ai_utils.py                 # call_gemini wrapper, exceptions, logging config
│   ├── services.py                 # All Gemini call functions
│   ├── models.py                   # Pydantic request/response models
│   ├── routers/
│   │   ├── jobs.py                 # GET /jobs
│   │   ├── analysis.py             # POST /analysis/job
│   │   ├── questions.py            # POST /questions
│   │   ├── learning.py             # POST /learning
│   │   ├── scores.py               # POST /scores
│   │   ├── guidance.py             # POST /coach/guide
│   │   ├── resume.py               # POST /api/parse-resume, /api/improve-section
│   │   ├── challenges.py           # POST /challenges/generate, GET /challenges/{id}
│   │   ├── pulse.py                # GET /pulse/* (market analytics)
│   │   ├── matching.py             # POST /matching/jobs
│   │   ├── profiles.py             # POST /profiles, GET /profiles/{id}
│   │   ├── pipeline.py             # POST /pipeline/trigger-sync, /pipeline/analytics
│   │   ├── observability.py        # GET /observability/ai-health
│   │   └── tts.py                  # Text-to-speech
│   ├── db/
│   │   ├── connection.py           # asyncpg pool + auto-migration runner
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql
│   │       └── 002_ai_observability.sql
│   ├── pipeline/
│   │   ├── etl.py                  # JSearch fetch, dedup, normalize, store
│   │   ├── deduplicator.py         # SHA256 fingerprinting
│   │   ├── salary_normalizer.py    # Period conversion + bounds validation
│   │   ├── skill_extractor.py      # 150+ skill keyword extraction
│   │   ├── analytics_computer.py   # Daily snapshot computation
│   │   └── scheduler.py            # ETL every 6h, analytics daily at 2AM
│   ├── requirements.txt
│   └── .env                        # API keys (not committed)
│
└── screenshots/                    # README screenshots
```

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **Docker Desktop** (for PostgreSQL)
- **API Keys:**
  - [Google Gemini API Key](https://aistudio.google.com/)
  - [RapidAPI JSearch Key](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/JayanthJammula/JobForge.git
cd JobForge
```

### 2. Set up the database

```bash
docker run -d \
  --name jobpulse-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jobpulse \
  --restart unless-stopped \
  postgres:16-alpine
```

### 3. Set up the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
RAPIDAPI_KEY=your_rapidapi_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobpulse
```

Start the backend:

```bash
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. You should see structured logs with request IDs in the console.

### 4. Set up the frontend

In a new terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### 5. Seed job data

Once both servers are running, seed the database with job listings:

```bash
curl -X POST http://localhost:8000/pipeline/trigger-sync
```

Then compute analytics:

```bash
curl -X POST http://localhost:8000/pipeline/analytics
```

You can also use the "Fetch New Data" button on the Market Pulse page.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | Search jobs via JSearch |
| POST | `/analysis/job` | Analyze a job description |
| POST | `/questions` | Generate 10 interview questions |
| POST | `/scores` | Score interview responses |
| POST | `/learning` | Generate a learning plan |
| POST | `/coach/guide` | Get coaching guidance |
| POST | `/challenges/generate` | Generate coding challenges |
| GET | `/challenges/{id}` | Get a specific challenge |
| POST | `/matching/jobs` | Get matched jobs for a user |
| GET | `/pulse/overview` | Market overview stats |
| GET | `/pulse/skills/trends` | Skill trend data |
| GET | `/pulse/salaries` | Salary benchmarks |
| GET | `/pulse/companies` | Company hiring velocity |
| GET | `/pulse/locations` | Location demand |
| POST | `/pipeline/trigger-sync` | Run the ETL pipeline |
| GET | `/observability/ai-health` | Last 24h call stats |
