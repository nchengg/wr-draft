from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from models.champion import Role


class DraftSlot(BaseModel):
    """One slot in the draft board (ban or pick)."""
    champion_id: Optional[str] = None
    role: Optional[Role] = None
    note: Optional[str] = None
    rating: Optional[int] = None  # 1-5 how good this pick/ban is


class DraftPlan(BaseModel):
    """A draft plan for an upcoming match."""
    id: str
    blue_team: Optional[str] = None
    red_team: Optional[str] = None
    opponent: Optional[str] = None  # deprecated, kept for old data
    blue_bans: list[DraftSlot] = []
    red_bans: list[DraftSlot] = []
    blue_picks: list[DraftSlot] = []
    red_picks: list[DraftSlot] = []
    overall_rating: Optional[int] = None  # 1-10
    notes: Optional[str] = None
