from contextlib import asynccontextmanager
import time
import uuid

from dotenv import load_dotenv
load_dotenv()

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from routers import jobs, analysis, questions, learning, scores, tts, resume, guidance
from routers import pipeline, profiles, pulse, matching, challenges, observability
from db.connection import init_db, close_db
from pipeline.scheduler import start_scheduler, stop_scheduler
from ai_utils import configure_logging

log = structlog.get_logger("http")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — configure structured logging first
    configure_logging(dev_mode=True)
    try:
        await init_db()
        start_scheduler()
        log.info("startup_complete", message="Database and scheduler initialized")
    except Exception as e:
        log.warning("startup_partial", error=str(e),
                    message="App running without JobPulse features")
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


# Request logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start = time.perf_counter()
    response = await call_next(request)
    latency_ms = int((time.perf_counter() - start) * 1000)

    log.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        latency_ms=latency_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


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
app.include_router(observability.router)


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
