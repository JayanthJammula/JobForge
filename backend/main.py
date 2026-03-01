from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from routers import jobs, analysis, questions, learning, scores, tts, resume, guidance
from routers import pipeline, profiles, pulse, matching, challenges
from db.connection import init_db, close_db
from pipeline.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        start_scheduler()
        print("Database and scheduler initialized successfully.")
    except Exception as e:
        print(f"Warning: Database/scheduler init failed: {e}")
        print("The app will run but JobPulse features (analytics, matching) will be unavailable.")
    yield
    # Shutdown
    stop_scheduler()
    await close_db()


# FastAPI app
app = FastAPI(
    title="JobForge API",
    description="API for job search, AI-powered analysis, market intelligence, and interview prep",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing routers
app.include_router(jobs.router)
app.include_router(analysis.router)
app.include_router(questions.router)
app.include_router(learning.router)
app.include_router(scores.router)
app.include_router(tts.router)
app.include_router(guidance.router)
app.include_router(resume.router)

# JobPulse routers
app.include_router(pipeline.router)
app.include_router(profiles.router)
app.include_router(pulse.router)
app.include_router(matching.router)
app.include_router(challenges.router)


# Custom exception handler for UnicodeDecodeError
@app.exception_handler(UnicodeDecodeError)
async def unicode_decode_exception_handler(request: Request, exc: UnicodeDecodeError):
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Audio processing error. The audio data contains invalid characters that cannot be decoded. Please try with a different audio file or format."
        }
    )


@app.get("/")
def root():
    return {"message": "JobForge API", "version": "2.0.0", "features": ["jobs", "analysis", "interviews", "pulse", "matching", "challenges"]}
