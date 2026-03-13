"""Tactic map storage — save / load / delete map plans."""
from __future__ import annotations

import uuid
from pathlib import Path

from models.tactic_map import TacticMap

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "tactic_maps"


def _ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_map(plan: TacticMap) -> TacticMap:
    _ensure_dir()
    if not plan.id:
        plan.id = uuid.uuid4().hex[:8]
    path = DATA_DIR / f"{plan.id}.json"
    path.write_text(plan.model_dump_json(indent=2), encoding="utf-8")
    return plan


def load_map(map_id: str) -> TacticMap | None:
    path = DATA_DIR / f"{map_id}.json"
    if not path.exists():
        return None
    return TacticMap.model_validate_json(path.read_text(encoding="utf-8"))


def list_maps() -> list[TacticMap]:
    _ensure_dir()
    return [
        TacticMap.model_validate_json(p.read_text(encoding="utf-8"))
        for p in sorted(DATA_DIR.glob("*.json"))
    ]


def delete_map(map_id: str) -> bool:
    path = DATA_DIR / f"{map_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False
