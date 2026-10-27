"""Safe upload handling and bounded, transparent profiling of CSV/XLSX/JSON/GeoJSON/PDF/image files."""
from __future__ import annotations
import json, re, uuid
from dataclasses import dataclass, field
from pathlib import Path

from ..config import settings

ALLOWED = {"csv", "xlsx", "json", "geojson", "pdf", "png", "jpg", "jpeg"}
MAX_ROWS = 200_000  # bounded processing


class FileRejected(ValueError):
    pass


@dataclass
class Parsed:
    summary: str
    quality: str = "OK"
    sources: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def safe_name(name: str) -> str:
    base = Path(name).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", base)[:120] or "upload"


def _sniff(ext: str, head: bytes) -> bool:
    if ext == "pdf": return head.startswith(b"%PDF")
    if ext == "png": return head.startswith(b"\x89PNG")
    if ext in ("jpg", "jpeg"): return head.startswith(b"\xff\xd8")
    if ext == "xlsx": return head.startswith(b"PK")
    if ext in ("json", "geojson"): return head.lstrip()[:1] in (b"{", b"[")
    if ext == "csv": return b"\x00" not in head
    return False


async def save_upload(session_id: str, upload) -> tuple[Path, str]:
    """Validate extension, content and size; store under a server-generated id. Returns (path, original safe name)."""
    name = safe_name(upload.filename or "upload")
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ALLOWED:
        raise FileRejected(f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED))}.")
    limit = settings.max_upload_size_mb * 1024 * 1024
    d = Path(settings.uploads_directory) / session_id
    d.mkdir(parents=True, exist_ok=True)
    dest = d / f"{uuid.uuid4().hex}.{ext}"
    size, first = 0, b""
    with dest.open("wb") as f:
        while chunk := await upload.read(1024 * 1024):
            if not first: first = chunk[:16]
            size += len(chunk)
            if size > limit:
                f.close(); dest.unlink(missing_ok=True)
                raise FileRejected(f"File exceeds the {settings.max_upload_size_mb} MB limit.")
            f.write(chunk)
    if not _sniff(ext, first):
        dest.unlink(missing_ok=True)
        raise FileRejected(f"File content does not look like a valid .{ext} file.")
    return dest, name


def _profile_df(df, label: str) -> Parsed:
    import pandas as pd
    notes: list[str] = []
    if len(df) > MAX_ROWS:
        df = df.head(MAX_ROWS); notes.append(f"Analysis limited to the first {MAX_ROWS:,} rows.")
    miss = df.isna().sum()
    lines = [f"File: {label}", f"Rows: {len(df):,}; columns: {len(df.columns)}",
             "Columns (dtype, missing): " + "; ".join(f"{c} ({df[c].dtype}, {int(miss[c])})" for c in df.columns[:40])]
    dups = int(df.duplicated().sum())
    lines.append(f"Exact duplicate rows: {dups}")
    num = df.select_dtypes("number")
    if not num.empty:
        lines.append("Numeric summary:\n" + num.describe().T[["count", "mean", "min", "max"]].round(2).head(15).to_string())
    low = {c.lower(): c for c in df.columns}
    lat = next((low[k] for k in low if k in ("lat", "latitude")), None)
    lon = next((low[k] for k in low if k in ("lon", "lng", "longitude")), None)
    if lat and lon:
        la, lo = pd.to_numeric(df[lat], errors="coerce"), pd.to_numeric(df[lon], errors="coerce")
        bad = int((la.isna() | lo.isna() | ~la.between(6, 38) | ~lo.between(68, 98)).sum())
        lines.append(f"Coordinate check ({lat}/{lon}; India bounds lat 6-38, lon 68-98): {bad} invalid or missing rows")
    dcol = next((low[k] for k in low if k in ("district", "district_name")), None)
    if dcol:
        lines.append(f"Missing district names: {int(df[dcol].isna().sum())}")
        ev = next((low[k] for k in low if k in ("ev_total", "evs", "ev_count", "registrations")), None)
        if ev:
            top = df.groupby(dcol)[ev].sum(numeric_only=True).sort_values(ascending=False).head(5)
            lines.append(f"Top districts by {ev}:\n" + top.to_string())
    lines.append("No rows were modified or dropped.")
    return Parsed("\n".join(lines), "OK", ["LOCAL_DATASET"], notes + ["Profile computed from the uploaded file only; it is not official data."])


def parse(path: Path, name: str, session_id: str) -> Parsed:
    ext = path.suffix.lstrip(".").lower()
    try:
        if ext in ("csv", "xlsx"):
            import pandas as pd
            df = pd.read_csv(path, nrows=MAX_ROWS + 1) if ext == "csv" else pd.read_excel(path, nrows=MAX_ROWS + 1)
            return _profile_df(df, name)
        if ext in ("json", "geojson"):
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("type") == "FeatureCollection":
                import geopandas as gpd
                g = gpd.read_file(path)
                p = _profile_df(g.drop(columns="geometry", errors="ignore"), name)
                invalid = int((~g.geometry.is_valid).sum()) if "geometry" in g else 0
                p.summary += f"\nFeatures: {len(g)}; geometry types: {sorted(set(g.geom_type.dropna()))}; CRS: {g.crs}; invalid geometries: {invalid}"
                return p
            import pandas as pd
            rows = data if isinstance(data, list) else next((v for v in data.values() if isinstance(v, list)), None) if isinstance(data, dict) else None
            if rows and all(isinstance(r, dict) for r in rows):
                return _profile_df(pd.json_normalize(rows), name)
            return Parsed(f"File: {name}\nJSON structure not tabular; top-level type: {type(data).__name__}", "INCOMPLETE", ["LOCAL_DATASET"])
        if ext == "pdf":
            import fitz
            from . import rag_service
            pages, chunks = 0, 0
            with fitz.open(path) as doc:
                total_text = 0
                for i, pg in enumerate(doc, 1):
                    t = pg.get_text(); total_text += len(t.strip()); pages += 1
                    chunks += rag_service.add_text(t, name, page=i, session_id=session_id, kind="upload") if t.strip() else 0
            if total_text == 0:
                return Parsed(f"{name}: {pages} page(s) but no extractable text. The PDF is probably scanned; OCR is required.", "INCOMPLETE", ["UPLOADED_PDF"])
            return Parsed(f"PDF {name}: {pages} page(s) indexed into {chunks} local chunks for retrieval.", "OK", ["UPLOADED_PDF"])
        if ext in ("png", "jpg", "jpeg"):
            try:
                import pytesseract
                from PIL import Image
                text = pytesseract.image_to_string(Image.open(path)).strip()
            except Exception:
                return Parsed(f"{name}: no local OCR engine is available (install Tesseract). No text was read.", "UNAVAILABLE", ["UPLOADED_IMAGE"])
            if not text:
                return Parsed(f"{name}: OCR found no readable text.", "INCOMPLETE", ["UPLOADED_IMAGE"])
            return Parsed(f"Text read directly from image {name} by OCR (verbatim, may contain errors):\n{text[:4000]}", "OK", ["UPLOADED_IMAGE"])
    except FileRejected:
        raise
    except Exception as e:
        raise FileRejected(f"Could not parse {name}: {type(e).__name__}. Check the file is well-formed.") from e
    raise FileRejected("Unsupported file type.")
