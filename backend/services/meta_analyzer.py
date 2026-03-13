"""Meta analysis — aggregate pick/ban/win statistics from match history."""
from __future__ import annotations

from collections import Counter, defaultdict

from models.match import Match


def _all_bans(matches: list[Match]) -> list[str]:
    ids: list[str] = []
    for m in matches:
        for b in m.draft.bans:
            ids.append(b.champion_id)
    return ids


def _all_picks(matches: list[Match]) -> list[str]:
    ids: list[str] = []
    for m in matches:
        if m.draft.picks:
            for p in m.draft.picks:
                ids.append(p.champion_id)
        else:
            for ps in m.player_stats:
                ids.append(ps.champion_id)
    return ids


def presence_rates(matches: list[Match]) -> dict[str, float]:
    """Pick+ban rate per champion across all matches."""
    if not matches:
        return {}
    total = len(matches)
    counter: Counter[str] = Counter()
    for m in matches:
        seen: set[str] = set()
        for action in m.draft.bans + m.draft.picks:
            seen.add(action.champion_id)
        for cid in seen:
            counter[cid] += 1
    return {cid: round(count / total, 4) for cid, count in counter.most_common()}


def pick_rates(matches: list[Match]) -> dict[str, float]:
    if not matches:
        return {}
    total = len(matches)
    counter = Counter(_all_picks(matches))
    return {cid: round(c / total, 4) for cid, c in counter.most_common()}


def ban_rates(matches: list[Match]) -> dict[str, float]:
    if not matches:
        return {}
    total = len(matches)
    counter = Counter(_all_bans(matches))
    return {cid: round(c / total, 4) for cid, c in counter.most_common()}


def win_rates(matches: list[Match]) -> dict[str, dict[str, float]]:
    """Win rate per champion. Returns {champion_id: {wins, games, rate}}."""
    if not matches:
        return {}
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"wins": 0, "games": 0})
    for m in matches:
        if not m.result:
            continue
        winner = m.result.winner
        for p in m.draft.picks:
            stats[p.champion_id]["games"] += 1
            if p.team == winner:
                stats[p.champion_id]["wins"] += 1
    result: dict[str, dict[str, float]] = {}
    for cid, s in stats.items():
        games = s["games"]
        result[cid] = {
            "wins": float(s["wins"]),
            "games": float(games),
            "rate": round(s["wins"] / games, 4) if games else 0.0,
        }
    return dict(sorted(result.items(), key=lambda x: x[1]["rate"], reverse=True))


def first_phase_trends(matches: list[Match]) -> dict[str, dict[str, int]]:
    """Track champions appearing in the first 3 bans/picks (orders 1-3)."""
    ban_counter: Counter[str] = Counter()
    pick_counter: Counter[str] = Counter()
    for m in matches:
        for b in m.draft.bans:
            if b.order <= 3:
                ban_counter[b.champion_id] += 1
        for p in m.draft.picks:
            if p.order <= 3:
                pick_counter[p.champion_id] += 1
    all_ids = set(ban_counter) | set(pick_counter)
    return {
        cid: {"first_phase_bans": ban_counter.get(cid, 0),
              "first_phase_picks": pick_counter.get(cid, 0)}
        for cid in sorted(all_ids, key=lambda c: ban_counter.get(c, 0) + pick_counter.get(c, 0), reverse=True)
    }


def player_performance(matches: list[Match]) -> list[dict]:
    """Aggregate per-player statistics across all matches."""
    if not matches:
        return []

    stats: dict[str, dict] = defaultdict(lambda: {
        "games": 0, "kills": 0, "deaths": 0, "assists": 0,
        "damage_dealt": 0, "gold": 0, "wards": 0,
    })

    for m in matches:
        for ps in m.player_stats:
            if not ps.name or not ps.name.strip():
                continue
            s = stats[ps.name]
            s["games"] += 1
            s["kills"] += ps.kills
            s["deaths"] += ps.deaths
            s["assists"] += ps.assists
            s["damage_dealt"] += ps.damage_dealt
            s["gold"] += ps.gold
            s["wards"] += ps.wards

    result = []
    for name, s in stats.items():
        g = s["games"] or 1
        result.append({
            "name": name,
            "games": s["games"],
            "avg_kills": round(s["kills"] / g, 1),
            "avg_deaths": round(s["deaths"] / g, 1),
            "avg_assists": round(s["assists"] / g, 1),
            "avg_damage": round(s["damage_dealt"] / g),
            "avg_gold": round(s["gold"] / g),
            "avg_wards": round(s["wards"] / g, 1),
        })

    result.sort(key=lambda x: x["games"], reverse=True)
    return result


def player_profile(matches: list[Match], name: str) -> dict | None:
    """Full stats breakdown for one player: overview, champion pool, recent games."""
    entries = [(m, ps) for m in matches for ps in m.player_stats if ps.name == name]
    if not entries:
        return None

    total = len(entries)
    wins = sum(1 for _, ps in entries if ps.result == "W")

    totals: dict[str, float] = {
        "kills": 0, "deaths": 0, "assists": 0,
        "damage_dealt": 0, "gold": 0, "wards": 0,
        "damage_taken": 0,
        "heal_shield": 0, "cc_duration": 0,
        "epic_monsters": 0, "turrets_pushed": 0,
    }
    for _, ps in entries:
        totals["kills"] += ps.kills
        totals["deaths"] += ps.deaths
        totals["assists"] += ps.assists
        totals["damage_dealt"] += ps.damage_dealt
        totals["gold"] += ps.gold
        totals["wards"] += ps.wards
        totals["damage_taken"] += ps.damage_taken
        totals["heal_shield"] += ps.heal_shield
        totals["cc_duration"] += ps.cc_duration
        totals["epic_monsters"] += ps.epic_monsters
        totals["turrets_pushed"] += ps.turrets_pushed

    g = total or 1
    kda = round((totals["kills"] + totals["assists"]) / max(totals["deaths"], 1), 2)

    # Per-champion breakdown
    champ_stats: dict[str, dict] = defaultdict(lambda: {
        "games": 0, "wins": 0,
        "kills": 0, "deaths": 0, "assists": 0,
        "damage_dealt": 0, "gold": 0,
    })
    for _, ps in entries:
        cs = champ_stats[ps.champion_id]
        cs["games"] += 1
        if ps.result == "W":
            cs["wins"] += 1
        cs["kills"] += ps.kills
        cs["deaths"] += ps.deaths
        cs["assists"] += ps.assists
        cs["damage_dealt"] += ps.damage_dealt
        cs["gold"] += ps.gold

    champions_out = []
    for cid, cs in champ_stats.items():
        cg = cs["games"] or 1
        champions_out.append({
            "champion_id": cid,
            "games": cs["games"],
            "wins": cs["wins"],
            "losses": cs["games"] - cs["wins"],
            "win_rate": round(cs["wins"] / cg, 4),
            "avg_kills": round(cs["kills"] / cg, 1),
            "avg_deaths": round(cs["deaths"] / cg, 1),
            "avg_assists": round(cs["assists"] / cg, 1),
            "kda": round((cs["kills"] + cs["assists"]) / max(cs["deaths"], 1), 2),
            "avg_damage": round(cs["damage_dealt"] / cg),
            "avg_gold": round(cs["gold"] / cg),
        })
    champions_out.sort(key=lambda x: x["games"], reverse=True)

    # Role breakdown
    role_counter: Counter[str] = Counter(ps.role for _, ps in entries)

    # Recent games (newest first, up to 10)
    recent_entries = sorted(entries, key=lambda x: x[0].date, reverse=True)[:10]
    recent = [
        {
            "match_id": m.id,
            "date": str(m.date),
            "tournament": m.tournament,
            "blue_team": m.blue_team,
            "red_team": m.red_team,
            "champion_id": ps.champion_id,
            "role": ps.role,
            "side": ps.side,
            "result": ps.result,
            "kills": ps.kills,
            "deaths": ps.deaths,
            "assists": ps.assists,
            "damage_dealt": ps.damage_dealt,
            "gold": ps.gold,
        }
        for m, ps in recent_entries
    ]

    return {
        "name": name,
        "total_games": total,
        "wins": wins,
        "losses": total - wins,
        "win_rate": round(wins / g, 4),
        "avg_kills": round(totals["kills"] / g, 1),
        "avg_deaths": round(totals["deaths"] / g, 1),
        "avg_assists": round(totals["assists"] / g, 1),
        "kda": kda,
        "avg_damage": round(totals["damage_dealt"] / g),
        "avg_gold": round(totals["gold"] / g),
        "avg_wards": round(totals["wards"] / g, 1),
        "avg_damage_taken": round(totals["damage_taken"] / g),
        "avg_heal_shield": round(totals["heal_shield"] / g),
        "avg_cc": round(totals["cc_duration"] / g, 1),
        "champions": champions_out,
        "roles": [{"role": role, "games": count} for role, count in role_counter.most_common()],
        "recent": recent,
    }
