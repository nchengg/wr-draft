"""Team notes model — categorized note cards for team information."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class NoteCard(BaseModel):
    """A single note card within a category."""
    id: str
    text: str


class NoteCategory(BaseModel):
    """A named category of notes (e.g. 'Lane Synergies')."""
    id: str
    title: str
    color: Optional[str] = None
    cards: list[NoteCard] = []


class TeamBoard(BaseModel):
    """The full team note board."""
    categories: list[NoteCategory] = []
