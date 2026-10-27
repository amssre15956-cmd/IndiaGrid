"""Local speech-to-text with faster-whisper. Never calls a cloud API."""
from __future__ import annotations
import asyncio
from pathlib import Path

from ..config import settings

_model = None


class SpeechUnavailable(RuntimeError):
    pass


def _load():
    global _model
    if _model is None:
        try:
            from faster_whisper import WhisperModel
            _model = WhisperModel(settings.whisper_model, device="auto", compute_type="int8", local_files_only=settings.hf_offline)
        except Exception as e:
            raise SpeechUnavailable(f"Whisper model '{settings.whisper_model}' is not available locally ({type(e).__name__}).") from e
    return _model


def readiness() -> tuple[str, str]:
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        return "UNAVAILABLE", "faster-whisper not installed"
    return ("READY", "") if _model is not None else ("DEGRADED", "model loads on first use")


async def transcribe(path: Path) -> str:
    def work() -> str:
        segs, _ = _load().transcribe(str(path), vad_filter=True)
        return " ".join(s.text.strip() for s in segs).strip()
    text = await asyncio.to_thread(work)
    if not text:
        raise SpeechUnavailable("No speech was recognised in the recording.")
    return text
