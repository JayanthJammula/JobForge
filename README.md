# JobForge

A full-stack career intelligence platform that combines job search, AI-powered interview prep, resume management, and market analytics.

## Features

- **Job Search** - Browse and search job listings powered by the JSearch API
- **AI Interview Prep** - Generate tailored interview questions and mock interviews with AI feedback
- **Resume Builder** - FlowCV-style resume editor with live preview, customizable styling, and PDF export
- **Resume Tailoring** - AI-powered resume optimization for specific job descriptions
- **Smart Match** - AI-driven job matching based on your profile (skills, experience, salary preferences)
- **Coding Challenges** - LeetCode-style practice problems generated from job descriptions **(Working on it)**
- **Learning Paths** - Personalized learning recommendations based on job requirements **(Working on it)**

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts

**Backend:** FastAPI, Python, Google Gemini AI

**Database:** PostgreSQL 16 (Docker)

**APIs:** Google Gemini (AI), RapidAPI JSearch (job data)

## Project Structure

```
JobForge/
├── src/                  # React frontend source
│   ├── components/       # Pages and UI components
│   ├── services/         # API service layer
│   └── lib/              # Utilities (auth, storage, parsing)
├── backend/              # FastAPI backend
│   ├── routers/          # API route handlers
│   ├── pipeline/         # ETL data pipeline
│   ├── db/               # Database connection and migrations
│   ├── main.py           # App entry point
│   ├── services.py       # AI generation logic
│   └── models.py         # Pydantic models
├── package.json          # Frontend dependencies
├── vite.config.ts        # Vite config with API proxy
└── index.html            # Entry HTML
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

venv\Scripts\activate

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

The API will be running at `http://localhost:8000`.

### 4. Set up the frontend

In a new terminal from the project root:

```bash
npm install
npm run dev
```

The app will be running at `http://localhost:5173`.
