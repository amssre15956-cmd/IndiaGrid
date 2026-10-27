"""Session state, cancellation tokens and audio registry. In-memory with JSON history on disk."""
from __future__ import annotations
import asyncio, json, shutil, time, uuid
from dataclasses import dataclass, field
from pathlib import Path

from ..config import settings


@dataclass
class Session:
    id: str
    created: float = field(default_factory=time.time)
    status: str = "active"  # active | stopped
    history: list[dict] = field(default_factory=list)
    cancel: asyncio.Event = field(default_factory=asyncio.Event)
    llm_streams: set = field(default_factory=set)       # async generators currently streaming
    tts_procs: set = field(default_factory=set)         # asyncio subprocesses running TTS
    stt_tasks: set = field(default_factory=set)         # asyncio tasks transcribing audio
    audio: dict[str, Path] = field(default_factory=dict)


class SessionService:
    def __init__(self) -> None:
        self._s: dict[str, Session] = {}
        self._audio_owner: dict[str, str] = {}

    def get(self, sid: str, create: bool = True) -> Session | None:
        s = self._s.get(sid)
        if s is None and create:
            s = self._s[sid] = Session(sid)
        return s

    def begin(self, sid: str) -> Session:
        """Start a new unit of work; a previously stopped session is re-armed explicitly by the client's new request."""
        s = self.get(sid)
        assert s is not None
        s.cancel = asyncio.Event()
        s.status = "active"
        return s

    def add_history(self, sid: str, role: str, text: str, quality: str | None = None, sources: list[str] | None = None) -> None:
        s = self.get(sid)
        assert s is not None
        s.history.append({"role": role, "text": text, "ts": time.time(), "data_quality": quality, "sources": sources or []})
        self._persist(s)

    def _persist(self, s: Session) -> None:
        try:
            d = Path(settings.sessions_directory); d.mkdir(parents=True, exist_ok=True)
            (d / f"{s.id}.json").write_text(json.dumps({"id": s.id, "created": s.created, "history": s.history}), encoding="utf-8")
        except OSError:
            pass

    def new_audio_path(self, sid: str, ext: str = "wav") -> tuple[str, Path]:
        aid = uuid.uuid4().hex
        d = Path(settings.audio_directory) / sid
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{aid}.{ext}"
        self._audio_owner[aid] = sid
        s = self.get(sid); assert s is not None
        s.audio[aid] = p
        return aid, p

    def audio_path(self, aid: str) -> Path | None:
        sid = self._audio_owner.get(aid)
        s = self._s.get(sid) if sid else None
        p = s.audio.get(aid) if s else None
        return p if p and p.exists() else None

    async def stop(self, sid: str) -> dict:
        """Cancel everything cancellable for the session. Flags are truthful: only true when something was actually cancelled."""
        s = self.get(sid, create=False)
        if s is None:
            return {"session_id": sid, "stopped": True, "llm_stream_cancelled": False, "audio_playback_stopped": False,
                    "tts_generation_cancelled": False, "recording_cancelled": False}
        s.cancel.set()
        llm = bool(s.llm_streams)
        for g in list(s.llm_streams):
            try:
                await g.aclose()
            except Exception:
                pass
        tts = False
        for p in list(s.tts_procs):
            if p.returncode is None:
                try:
                    p.kill(); tts = True
                except ProcessLookupError:
                    pass
        stt = False
        for t in list(s.stt_tasks):
            if not t.done():
                t.cancel(); stt = True
        s.status = "stopped"
        return {
            "session_id": sid, "stopped": True, "llm_stream_cancelled": llm, "tts_generation_cancelled": tts,
            # Playback happens in the browser; the server only reports it as stopped (nothing is served after stop).
            "audio_playback_stopped": False,
            # Backend-recognised recording task = server-side transcription in flight.
            "recording_cancelled": stt,
        }

    def delete(self, sid: str) -> bool:
        s = self._s.pop(sid, None)
        for aid in [a for a, o in self._audio_owner.items() if o == sid]:
            self._audio_owner.pop(aid, None)
        shutil.rmtree(Path(settings.audio_directory) / sid, ignore_errors=True)
        shutil.rmtree(Path(settings.uploads_directory) / sid, ignore_errors=True)
        f = Path(settings.sessions_directory) / f"{sid}.json"
        existed = s is not None or f.exists()
        f.unlink(missing_ok=True)
        return existed


sessions = SessionService()
