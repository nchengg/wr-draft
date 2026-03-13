from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class Role(str, Enum):
    BARON = "baron"
    JUNGLE = "jungle"
    MID = "mid"
    DRAGON = "dragon"
    SUPPORT = "support"


class DamageType(str, Enum):
    AD = "ad"
    AP = "ap"
    MIXED = "mixed"


class SubClass(str, Enum):
    TANK = "tank"
    FIGHTER = "fighter"
    ASSASSIN = "assassin"
    MAGE = "mage"
    MARKSMAN = "marksman"
    ENCHANTER = "enchanter"
    VANGUARD = "vanguard"
    SPECIALIST = "specialist"


class ScalingPhase(str, Enum):
    EARLY = "early"
    MID = "mid"
    LATE = "late"


class Champion(BaseModel):
    id: str
    name: str
    roles: list[Role]
    damage_type: DamageType
    sub_class: SubClass
    has_hard_cc: bool = False
    has_aoe: bool = False
    scaling: ScalingPhase = ScalingPhase.MID
    mobility: int = 2  # 1-5 scale
    notes: Optional[str] = None
