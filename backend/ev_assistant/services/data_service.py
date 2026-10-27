"""Deterministic calculations and structured queries. The LLM only explains what is computed here."""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from ..config import settings
from ..connectors.platform_api import platform

REQUIRED = ["district_name", "state_name", "gap_score", "ev_total", "public_charging_points", "evs_per_charger"]


@dataclass
class Structured:
    facts: str
    quality: str
    sources: list[str]
    notes: list[str] = field(default_factory=list)


def gap_score(evs_per_charger_n: float, coverage: float, demand_n: float, corridor_n: float) -> float:
    """Example formula supplied with the product brief (not verified official methodology).
    Inputs N(.) must already be normalised to 0..1; coverage is 0..1."""
    for v in (evs_per_charger_n, coverage, demand_n, corridor_n):
        if v is None or not 0 <= v <= 1:
            raise ValueError("Gap Score inputs must be within 0..1")
    return round(100 * (0.45 * evs_per_charger_n + 0.25 * (1 - coverage) + 0.20 * demand_n + 0.10 * corridor_n), 1)


def _local_frames() -> list[tuple[str, pd.DataFrame, str]]:
    out = []
    for p in sorted(Path(settings.datasets_directory).glob("*.csv")):
        try:
            df = pd.read_csv(p)
        except Exception:
            continue
        if all(c in df.columns for c in REQUIRED):
            q = str(df["data_quality"].iloc[0]).upper() if "data_quality" in df.columns and len(df) else "SAMPLE"
            out.append((p.name, df, q if q in ("OK", "SAMPLE", "SYNTHETIC", "INCOMPLETE") else "SAMPLE"))
    return out


def _row_md(r: pd.Series) -> str:
    cov = r.get("coverage_score")
    return (f"| {r['district_name']} | {r['state_name']} | {r.get('priority_level', 'n/a')} | {r['gap_score']} | {int(r['ev_total']):,} | "
            f"{int(r['public_charging_points']):,} | {r['evs_per_charger']} | {f'{float(cov) * 100:.0f}%' if pd.notna(cov) else 'n/a'} | {r.get('additional_chargers_required', 'n/a')} |")


HEAD = ("| District | State | Priority | Gap Score | EVs | Public charging points | EVs/charger | Coverage | Additional chargers |\n"
        "|---|---|---|---|---|---|---|---|---|")


async def query(question: str) -> Structured | None:
    """Return structured facts when the question concerns district/state metrics, else None."""
    ql = question.lower()
    if not re.search(r"gap score|district|underserved|evs? per|charger|charging point|coverage|priority|rank", ql):
        return None
    records, reason = await platform.districts()
    frames: list[tuple[str, pd.DataFrame, str]] = []
    src_used: list[str] = []
    if records:
        frames.append(("PLATFORM_API", pd.DataFrame(records), "OK"))
    local = _local_frames()
    if not frames and local:
        frames = local
    if not frames:
        return Structured(f"No platform data could be retrieved ({reason}) and no dataset is loaded in {settings.datasets_directory}. "
                          "Report that the requested figures are UNAVAILABLE.", "UNAVAILABLE", [])
    name, df, quality = frames[0]
    src_used = ["PLATFORM_API" if name == "PLATFORM_API" else "LOCAL_DATASET"]
    notes = [f"Dataset: {name}", f"{len(df)} district record(s) in scope"]
    mentioned = [r for _, r in df.iterrows() if str(r["district_name"]).lower() in ql]
    if mentioned:
        sel = pd.DataFrame(mentioned)
    else:
        st = [s for s in df["state_name"].unique() if str(s).lower() in ql]
        sel = df[df["state_name"].isin(st)] if st else df
        sel = sel.sort_values("gap_score", ascending=False).head(5)
        notes.append("Ranking basis: Gap Score, descending; scope = records in the dataset above only")
    facts = HEAD + "\n" + "\n".join(_row_md(r) for _, r in sel.iterrows())
    if quality in ("SAMPLE", "SYNTHETIC"):
        facts += f"\n\nThese figures are {quality} data and not official statistics."
    return Structured(facts, quality, src_used, notes)
