"""Local RAG: HuggingFace embeddings + persistent ChromaDB. No remote services at query time."""
from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path

from ..config import settings

COLLECTION = "ev_planner_docs"
_store = None


@dataclass
class Hit:
    text: str
    source: str
    page: int | None
    score: float | None = None


def _get_store():
    global _store
    if _store is None:
        if settings.hf_offline:
            os.environ["HF_HUB_OFFLINE"] = "1"
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_community.vectorstores import Chroma
        emb = HuggingFaceEmbeddings(model_name=settings.embedding_model)
        _store = Chroma(collection_name=COLLECTION, embedding_function=emb, persist_directory=str(settings.chroma_persist_directory))
    return _store


def readiness() -> tuple[str, str]:
    try:
        _get_store()
        return "READY", ""
    except Exception as e:  # missing model / chroma
        return "UNAVAILABLE", f"{type(e).__name__}: embedding model or ChromaDB not ready"


def _split(text: str, size: int = 900, overlap: int = 120) -> list[str]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    return RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=overlap).split_text(text)


def add_text(text: str, source: str, page: int | None = None, session_id: str | None = None, kind: str = "document") -> int:
    chunks = _split(text)
    if not chunks:
        return 0
    meta = {"source": source, "page": page if page is not None else -1, "session_id": session_id or "", "kind": kind}
    _get_store().add_texts(chunks, metadatas=[dict(meta) for _ in chunks])
    return len(chunks)


def retrieve(query: str, session_id: str | None = None, k: int = 5) -> list[Hit]:
    store = _get_store()
    flt = {"$or": [{"session_id": ""}, {"session_id": session_id or "-"}]}  # global docs + this session's uploads only
    docs = store.similarity_search_with_score(query, k=k, filter=flt)
    return [Hit(d.page_content, d.metadata.get("source", "unknown"), (d.metadata.get("page") if d.metadata.get("page", -1) >= 0 else None), s) for d, s in docs]


def ingest_directory(directory: Path | None = None) -> dict:
    """Index .md/.txt/.pdf files under the documents directory (idempotent per file: old chunks are replaced)."""
    d = Path(directory or settings.documents_directory)
    report = {"files": 0, "chunks": 0, "skipped": []}
    store = _get_store()
    for p in sorted(d.rglob("*")):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        try:
            store.delete(where={"source": p.name})
        except Exception:
            pass
        if ext in (".md", ".txt"):
            report["chunks"] += add_text(p.read_text(encoding="utf-8", errors="replace"), p.name)
        elif ext == ".pdf":
            import fitz
            with fitz.open(p) as doc:
                for i, page in enumerate(doc, 1):
                    report["chunks"] += add_text(page.get_text(), p.name, page=i)
        else:
            report["skipped"].append(p.name); continue
        report["files"] += 1
    return report


def format_hits(hits: list[Hit]) -> str:
    return "\n\n".join(f"[{h.source}{f', p.{h.page}' if h.page else ''}] {h.text}" for h in hits)
