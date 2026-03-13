"""Tactic map — icon placements and drawings on a Wild Rift minimap."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class MapIcon(BaseModel):
    """A single icon placed on the map."""
    id: str
    kind: str  # "champion" | "ward"
    champion_id: Optional[str] = None  # set when kind == "champion"
    x: float  # 0-100 percentage
    y: float  # 0-100 percentage


class MapArrow(BaseModel):
    """An arrow drawn on the map."""
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    color: str = "#f59e0b"


class TacticMap(BaseModel):
    """A saved tactic map plan."""
    id: str
    title: str = "Untitled"
    icons: list[MapIcon] = []
    arrows: list[MapArrow] = []
    notes: Optional[str] = None
