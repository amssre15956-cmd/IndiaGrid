"""Adapter for the EV Infra Planner platform API. Reports UNAVAILABLE rather than inventing data."""
from __future__ import annotations
import httpx

from ..config import settings


class PlatformConnector:
    source_id = "PLATFORM_API"

    @property
    def configured(self) -> bool:
        return bool(settings.platform_api_url)

    async def districts(self, state: str | None = None) -> tuple[list[dict] | None, str]:
        """Returns (records, reason). Records follow the district schema (district_name, state_name, priority_level, gap_score, ...)."""
        if not self.configured:
            return None, "PLATFORM_API_URL is not configured"
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{settings.platform_api_url.rstrip('/')}/districts", params={"state": state} if state else None)
                r.raise_for_status()
                return r.json(), ""
        except Exception as e:
            return None, f"platform API unreachable ({type(e).__name__})"


platform = PlatformConnector()
