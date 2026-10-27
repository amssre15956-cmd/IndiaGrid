"""Local text-to-speech with Piper, run as a killable subprocess so Exit can cancel it."""
from __future__ import annotations
import asyncio, re, shutil
from pathlib import Path

from ..config import settings
from .session_service import Session


class TTSUnavailable(RuntimeError):
    pass


def readiness() -> tuple[str, str]:
    if settings.tts_engine != "piper":
        return "NOT_CONFIGURED", f"Unsupported TTS_ENGINE '{settings.tts_engine}' (piper is implemented)"
    if not shutil.which("piper"):
        return "UNAVAILABLE", "piper executable not found"
    if not settings.tts_model_path or not Path(settings.tts_model_path).is_file():
        return "NOT_CONFIGURED", "TTS_MODEL_PATH is not set to an installed voice (.onnx)"
    return "READY", ""


def speakable(markdown: str) -> str:
    t = re.sub(r"```.*?```", " ", markdown, flags=re.S)
    t = re.sub(r"\|.*\|", " ", t)
    return re.sub(r"[*_`#>|-]+", " ", t).strip()[:3000]


async def synthesize(session: Session, text: str, out: Path) -> bool:
    """Returns True when audio was written, False when cancelled. Raises TTSUnavailable when not configured/failed."""
    st, why = readiness()
    if st != "READY":
        raise TTSUnavailable(why)
    spoken = speakable(text)
    if not spoken:
        raise TTSUnavailable("Nothing speakable in the answer")
    proc = await asyncio.create_subprocess_exec("piper", "--model", settings.tts_model_path, "--output_file", str(out),
                                                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
    session.tts_procs.add(proc)
    try:
        await proc.communicate(spoken.encode("utf-8"))
    finally:
        session.tts_procs.discard(proc)
    if session.cancel.is_set():
        out.unlink(missing_ok=True)
        return False
    if proc.returncode != 0 or not out.exists():
        out.unlink(missing_ok=True)
        raise TTSUnavailable("Piper failed to synthesise audio")
    return True
