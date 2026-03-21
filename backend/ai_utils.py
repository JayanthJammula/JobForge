"""Centralized AI call infrastructure: retry, fallback, logging, validation, observability."""

import hashlib
import time
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Type, Union

import structlog
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)


# ---------------------------------------------------------------------------
# Custom exception hierarchy
# ---------------------------------------------------------------------------

class AIServiceError(Exception):
    """Base exception for all AI-related errors."""
    pass


class AIRateLimitError(AIServiceError):
    """Gemini API rate limit (429 / RESOURCE_EXHAUSTED)."""
    pass


class AISchemaValidationError(AIServiceError):
    """AI response failed Pydantic schema validation."""
    def __init__(self, message: str, raw_text: str = ""):
        super().__init__(message)
        self.raw_text = raw_text


class AIEmptyResponseError(AIServiceError):
    """AI returned empty or null response text."""
    pass


class ExternalAPIError(Exception):
    """Error from an external non-AI API (e.g., JSearch)."""
    pass


# ---------------------------------------------------------------------------
# AI call result + metadata
# ---------------------------------------------------------------------------

class AIMeta(BaseModel):
    """Metadata envelope returned alongside every AI-generated response."""
    model_used: str
    generated_at: str  # ISO-8601
    latency_ms: int
    fallback_used: bool


@dataclass
class AICallResult:
    """Return value from call_gemini()."""
    data: object  # Parsed Pydantic model or raw text string
    meta: AIMeta
    raw_text: str = ""


# ---------------------------------------------------------------------------
# Structured logging configuration
# ---------------------------------------------------------------------------

def configure_logging(dev_mode: bool = True):
    """Set up structlog. Call once during app startup."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if dev_mode:
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


logger = structlog.get_logger("ai")


# ---------------------------------------------------------------------------
# Rate-limit detection
# ---------------------------------------------------------------------------

_RATE_LIMIT_MARKERS = ("429", "RESOURCE_EXHAUSTED", "rate limit", "quota")


def _is_rate_limit(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(marker.lower() in msg for marker in _RATE_LIMIT_MARKERS)


# ---------------------------------------------------------------------------
# Core wrapper: call_gemini()
# ---------------------------------------------------------------------------

def _single_model_call(
    client: genai.Client,
    model: str,
    contents: list,
    config: types.GenerateContentConfig,
) -> str:
    """Call a single Gemini model with retry on transient errors (not rate limits).

    Rate limits are NOT retried here — they bubble up so the outer loop
    can fall back to the next model.
    """
    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True,
    )
    def _do_call():
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

    return _do_call()


def call_gemini(
    client: genai.Client,
    *,
    models: List[str],
    contents: list,
    config: types.GenerateContentConfig,
    response_model: Optional[Type[BaseModel]] = None,
    operation: str = "unknown",
) -> AICallResult:
    """Call Gemini with model fallback, retry, validation, and logging.

    Args:
        client:         google.genai.Client instance
        models:         Ordered list of model names to try (first = preferred)
        contents:       Gemini contents payload
        config:         GenerateContentConfig
        response_model: Optional Pydantic model to validate JSON response
        operation:      Human-readable name for logging (e.g., "analyze_job")

    Returns:
        AICallResult with parsed data, metadata, and raw text

    Raises:
        AIRateLimitError:         All models hit rate limits
        AISchemaValidationError:  Response failed Pydantic validation
        AIEmptyResponseError:     Response text was empty/null
        AIServiceError:           Any other AI-related failure
    """
    start = time.perf_counter()
    last_error: Optional[Exception] = None
    fallback_used = False
    model_used = models[0]

    for i, model in enumerate(models):
        model_used = model
        if i > 0:
            fallback_used = True

        try:
            response = _single_model_call(client, model, contents, config)

            raw_text = (response.text or "").strip()
            if not raw_text:
                raise AIEmptyResponseError(
                    f"[{operation}] Model {model} returned empty response"
                )

            latency_ms = int((time.perf_counter() - start) * 1000)

            # Validate against Pydantic model if provided
            parsed = raw_text
            if response_model is not None:
                import json as _json
                try:
                    parsed = response_model.model_validate_json(raw_text)
                except ValidationError:
                    # Gemini sometimes wraps the response in a single-key object
                    # e.g. {"question_set": {...actual data...}}
                    # Try to unwrap and validate again
                    try:
                        data = _json.loads(raw_text)
                        if isinstance(data, dict) and len(data) == 1:
                            inner = next(iter(data.values()))
                            parsed = response_model.model_validate(inner)
                        else:
                            raise
                    except (ValidationError, _json.JSONDecodeError, StopIteration) as ve:
                        raise AISchemaValidationError(
                            f"[{operation}] Schema validation failed: {ve}",
                            raw_text=raw_text,
                        )

            meta = AIMeta(
                model_used=model,
                generated_at=datetime.now(timezone.utc).isoformat(),
                latency_ms=latency_ms,
                fallback_used=fallback_used,
            )

            # Log success
            logger.info(
                "ai_call_success",
                operation=operation,
                model=model,
                latency_ms=latency_ms,
                fallback_used=fallback_used,
                response_length=len(raw_text),
            )

            return AICallResult(data=parsed, meta=meta, raw_text=raw_text)

        except AISchemaValidationError as sve:
            # Don't retry schema errors on a different model — the prompt is the same
            latency_ms = int((time.perf_counter() - start) * 1000)
            logger.error(
                "ai_call_schema_error",
                operation=operation,
                model=model,
                latency_ms=latency_ms,
                error=str(sve),
                raw_text_preview=sve.raw_text[:200] if sve.raw_text else "",
            )
            raise

        except Exception as e:
            last_error = e
            latency_ms = int((time.perf_counter() - start) * 1000)

            if _is_rate_limit(e):
                logger.warning(
                    "ai_call_rate_limited",
                    operation=operation,
                    model=model,
                    latency_ms=latency_ms,
                )
                # Try next model
                continue
            else:
                logger.error(
                    "ai_call_error",
                    operation=operation,
                    model=model,
                    latency_ms=latency_ms,
                    error=str(e),
                )
                # Try next model for non-rate-limit errors too
                continue

    # All models exhausted
    latency_ms = int((time.perf_counter() - start) * 1000)
    if last_error and _is_rate_limit(last_error):
        raise AIRateLimitError(
            f"[{operation}] All models rate limited after {latency_ms}ms"
        )
    raise AIServiceError(
        f"[{operation}] All models failed after {latency_ms}ms: {last_error}"
    )


# ---------------------------------------------------------------------------
# Prompt hashing (for observability — never store raw prompts)
# ---------------------------------------------------------------------------

def hash_prompt(contents: list) -> str:
    """SHA-256 hash of the prompt contents for logging without storing PII."""
    text = str(contents)
    return hashlib.sha256(text.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Async DB logging (Phase 5 — called from call_gemini if pool available)
# ---------------------------------------------------------------------------

async def log_ai_call_to_db(
    pool,
    *,
    request_id: str = "",
    operation: str,
    model_requested: str,
    model_used: str,
    prompt_hash: str,
    latency_ms: int,
    status: str,
    error_message: str = "",
):
    """Fire-and-forget: insert a row into ai_call_logs."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO ai_call_logs
                   (request_id, operation, model_requested, model_used,
                    prompt_hash, latency_ms, status, error_message)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                request_id, operation, model_requested, model_used,
                prompt_hash, latency_ms, status, error_message,
            )
    except Exception:
        # Observability logging should never break the request
        pass
