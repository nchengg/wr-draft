"""Team notes storage — persist the team note board as JSON."""
from __future__ import annotations

from pathlib import Path

from models.team_notes import NoteCategory, TeamBoard

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "team_notes.json"

# Default categories created on first load
_DEFAULTS: list[dict] = [
    {"id": "first-picks", "title": "First Picks", "color": "#22c55e", "cards": []},
    {"id": "lane-synergies", "title": "Lane Synergies", "color": "#0ea5e9", "cards": []},
    {"id": "must-ban", "title": "Don't Want to Play Against", "color": "#ef4444", "cards": []},
    {"id": "comfort-picks", "title": "Comfort Picks", "color": "#f59e0b", "cards": []},
    {"id": "strategies", "title": "Strategies & Gameplans", "color": "#8b5cf6", "cards": []},
    {"id": "notes", "title": "General Notes", "color": "#64748b", "cards": []},
]


def load_board() -> TeamBoard:
    if DATA_FILE.exists():
        return TeamBoard.model_validate_json(DATA_FILE.read_text(encoding="utf-8"))
    # First time — create with defaults
    board = TeamBoard(categories=[NoteCategory(**d) for d in _DEFAULTS])
    save_board(board)
    return board


def save_board(board: TeamBoard) -> TeamBoard:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(board.model_dump_json(indent=2), encoding="utf-8")
    return board
