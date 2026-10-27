"""One pipeline for text, voice and file questions: evidence -> local LLM stream -> sources -> TTS -> done."""
from __future__ import annotations
import json
from typing import AsyncIterator

from . import data_service, llm_service, rag_service, tts_service
from .session_service import Session, sessions


def ev(**kw) -> str:
    return f"data: {json.dumps(kw, ensure_ascii=False)}\n\n"


async def answer(s: Session, question: str, extra: str = "", extra_sources: list[str] | None = None, extra_quality: str | None = None,
                 extra_notes: list[str] | None = None) -> AsyncIterator[str]:
    cancel = s.cancel  # captured: a later request on this session cannot un-cancel this run
    sources: list[str] = list(extra_sources or [])
    notes: list[str] = list(extra_notes or [])
    quality = extra_quality
    evidence: list[str] = [extra] if extra else []

    structured = await data_service.query(question)
    if structured:
        evidence.append("STRUCTURED PLATFORM DATA (deterministic):\n" + structured.facts)
        sources += structured.sources; notes += structured.notes
        quality = _worse(quality, structured.quality)
    try:
        hits = rag_service.retrieve(question, s.id)
        if hits:
            evidence.append("RETRIEVED DOCUMENTS:\n" + rag_service.format_hits(hits))
            sources += sorted({h.source for h in hits})
    except Exception:
        notes.append("Document retrieval is unavailable (embedding model or ChromaDB not ready).")
        quality = _worse(quality, "INCOMPLETE")
    if not evidence:
        quality = _worse(quality, "UNAVAILABLE")

    text = ""
    stream = llm_service.stream_answer(question, "\n\n".join(evidence), s.history)
    s.llm_streams.add(stream)
    try:
        async for tok in stream:
            if cancel.is_set():
                yield ev(event="stopped"); return
            text += tok
            yield ev(event="token", text=tok)
    except llm_service.LLMUnavailable as e:
        yield ev(event="error", message=str(e)); return
    except Exception:
        yield ev(event="error", message="The local model failed while generating the answer."); return
    finally:
        s.llm_streams.discard(stream)
        try:
            await stream.aclose()
        except Exception:
            pass
    if cancel.is_set():
        yield ev(event="stopped"); return

    uniq = list(dict.fromkeys(sources))
    quality = quality or ("OK" if uniq else "UNAVAILABLE")
    yield ev(event="source", sources=uniq, data_quality=quality, notes=notes)
    sessions.add_history(s.id, "assistant", text, quality, uniq)

    try:
        aid, path = sessions.new_audio_path(s.id)
        if await tts_service.synthesize(s, text, path):
            yield ev(event="audio", audio_url=f"/api/v1/assistant/audio/{aid}")
    except tts_service.TTSUnavailable as e:
        yield ev(event="audio_unavailable", reason=str(e))
    if cancel.is_set():
        yield ev(event="stopped"); return
    yield ev(event="done")


_ORDER = ["OK", "SAMPLE", "SYNTHETIC", "INCOMPLETE", "UNAVAILABLE"]


def _worse(a: str | None, b: str | None) -> str | None:
    if not a: return b
    if not b: return a
    return a if _ORDER.index(a) >= _ORDER.index(b) else b
