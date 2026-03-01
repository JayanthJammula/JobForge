# TTS/STT functionality has been moved to the browser (Web Speech API).
# This router is kept as a stub so existing imports don't break.
from fastapi import APIRouter

router = APIRouter(prefix="/tts", tags=["tts"])
