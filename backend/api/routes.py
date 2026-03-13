"""API route definitions."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from models.champion import Champion
from models.draft import DraftPlan
from models.match import Match
from models.tactic_map import TacticMap
from models.team_notes import TeamBoard
from services import data_extractor, draft_advisor, external_meta, meta_analyzer, tactic_map, team_notes

router = APIRouter()

CHAMPIONS_PATH = Path(__file__).resolve().parent.parent / "data" / "champions.json"

# ── Champions ────────────────────────────────────────────────────────────────

@router.get("/champions", response_model=list[Champion])
def get_champions():
    raw = json.loads(CHAMPIONS_PATH.read_text(encoding="utf-8"))
    return [Champion(**c) for c in raw]


# ── Matches ──────────────────────────────────────────────────────────────────

@router.get("/matches", response_model=list[Match])
def get_matches():
    return data_extractor.list_matches()


@router.post("/matches", response_model=Match)
def create_match(match: Match):
    return data_extractor.save_match(match)


@router.get("/matches/{match_id}", response_model=Match)
def get_match(match_id: str):
    m = data_extractor.load_match(match_id)
    if not m:
        raise HTTPException(404, "Match not found")
    return m


@router.delete("/matches/{match_id}")
def delete_match(match_id: str):
    if not data_extractor.delete_match(match_id):
        raise HTTPException(404, "Match not found")
    return {"ok": True}


# ── Meta Analysis ────────────────────────────────────────────────────────────

@router.get("/meta/presence")
def meta_presence():
    return meta_analyzer.presence_rates(data_extractor.list_matches())


@router.get("/meta/picks")
def meta_picks():
    return meta_analyzer.pick_rates(data_extractor.list_matches())


@router.get("/meta/bans")
def meta_bans():
    return meta_analyzer.ban_rates(data_extractor.list_matches())


@router.get("/meta/winrates")
def meta_winrates():
    return meta_analyzer.win_rates(data_extractor.list_matches())


@router.get("/meta/first-phase")
def meta_first_phase():
    return meta_analyzer.first_phase_trends(data_extractor.list_matches())


@router.get("/meta/external")
def meta_external(dan: str = "1", position: str = "all"):
    return external_meta.fetch_server_meta(dan, position)


@router.get("/meta/player-performance")
def meta_player_performance():
    return meta_analyzer.player_performance(data_extractor.list_matches())


@router.get("/meta/player-profile/{name}")
def meta_player_profile(name: str):
    profile = meta_analyzer.player_profile(data_extractor.list_matches(), name)
    if profile is None:
        raise HTTPException(404, "Player not found")
    return profile


# ── Draft Plans ──────────────────────────────────────────────────────────────

@router.get("/drafts", response_model=list[DraftPlan])
def get_drafts():
    return draft_advisor.list_plans()


@router.post("/drafts", response_model=DraftPlan)
def create_draft(plan: DraftPlan):
    return draft_advisor.save_plan(plan)


@router.get("/drafts/{plan_id}", response_model=DraftPlan)
def get_draft(plan_id: str):
    p = draft_advisor.load_plan(plan_id)
    if not p:
        raise HTTPException(404, "Draft plan not found")
    return p


@router.delete("/drafts/{plan_id}")
def delete_draft(plan_id: str):
    if not draft_advisor.delete_plan(plan_id):
        raise HTTPException(404, "Draft plan not found")
    return {"ok": True}


# ── Team Notes ───────────────────────────────────────────────────────────────

@router.get("/team-notes", response_model=TeamBoard)
def get_team_notes():
    return team_notes.load_board()


@router.put("/team-notes", response_model=TeamBoard)
def update_team_notes(board: TeamBoard):
    return team_notes.save_board(board)


# ── Tactic Maps ────────────────────────────────────────────────────────────────

@router.get("/tactic-maps", response_model=list[TacticMap])
def get_tactic_maps():
    return tactic_map.list_maps()


@router.post("/tactic-maps", response_model=TacticMap)
def create_tactic_map(plan: TacticMap):
    return tactic_map.save_map(plan)


@router.get("/tactic-maps/{map_id}", response_model=TacticMap)
def get_tactic_map(map_id: str):
    m = tactic_map.load_map(map_id)
    if not m:
        raise HTTPException(404, "Tactic map not found")
    return m


@router.delete("/tactic-maps/{map_id}")
def delete_tactic_map(map_id: str):
    if not tactic_map.delete_map(map_id):
        raise HTTPException(404, "Tactic map not found")
    return {"ok": True}

