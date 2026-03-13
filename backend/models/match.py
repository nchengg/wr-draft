from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from models.champion import Role


class PickBan(BaseModel):
    """A single pick or ban action in a draft."""
    champion_id: str
    team: str  # "blue" or "red"
    role: Optional[Role] = None  # only relevant for picks
    order: int  # 1-based position in the draft sequence

    @field_validator("role", mode="before")
    @classmethod
    def _empty_role_to_none(cls, v: object) -> object:
        return None if v == "" else v


class MatchDraft(BaseModel):
    """Full draft for one match."""
    bans: list[PickBan] = []
    picks: list[PickBan] = []


class MatchResult(BaseModel):
    """Outcome of a match."""
    winner: str  # "blue" or "red"
    duration_minutes: Optional[float] = None
    mvp_champion_id: Optional[str] = None
    notes: Optional[str] = None


class PlayerStats(BaseModel):
    """Per-player post-match statistics."""
    name: str
    role: Role
    side: Literal["blue", "red"]
    result: Literal["W", "L"]
    champion_id: str
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    heal_shield: float = 0.0
    cc_duration: float = 0.0
    epic_monsters: int = 0
    wards: int = 0
    damage_dealt: int = 0
    damage_conversion_ratio: float = 0.0
    damage_taken: int = 0
    damage_taken_per_defeat: float = 0.0
    damage_mitigation_ratio: float = 0.0
    gold: int = 0
    monster_farm: int = 0
    minion_score: int = 0
    turrets_pushed: int = 0


class Match(BaseModel):
    """A single competitive match record."""
    id: str
    date: date
    tournament: Optional[str] = None
    patch: Optional[str] = None
    blue_team: str
    red_team: str
    draft: MatchDraft
    player_stats: list[PlayerStats] = []
    result: Optional[MatchResult] = None
    notes: Optional[str] = None
