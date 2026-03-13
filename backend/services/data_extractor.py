"""Match data extraction & persistence (JSON file store)."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from models.match import Match

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "matches"


def _ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_match(match: Match) -> Match:
    """Persist a match record to a JSON file."""
    _ensure_dir()
    if not match.id:
        match.id = uuid.uuid4().hex[:8]
    path = DATA_DIR / f"{match.id}.json"
    path.write_text(match.model_dump_json(indent=2), encoding="utf-8")
    return match


def load_match(match_id: str) -> Match | None:
    path = DATA_DIR / f"{match_id}.json"
    if not path.exists():
        return None
    return Match.model_validate_json(path.read_text(encoding="utf-8"))


def list_matches() -> list[Match]:
    _ensure_dir()
    matches: list[Match] = []
    for p in sorted(DATA_DIR.glob("*.json")):
        matches.append(Match.model_validate_json(p.read_text(encoding="utf-8")))
    return matches


def delete_match(match_id: str) -> bool:
    path = DATA_DIR / f"{match_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False
