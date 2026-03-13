"""Fetch Wild Rift CN server champion stats from Tencent's public APIs.

Hero list:  https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js
Rank data:  https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2

Data structure:  rank_data["data"][dan][position][i]
  dan:      "1"=Diamond+  "2"=Master+  "3"=Challenger  "4"=Top
  position: "1"=Mid  "2"=Baron  "3"=Dragon(Bot)  "4"=Support  "5"=Jungle
"""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from typing import Any

_HERO_LIST_URL = (
    "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"
)
_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://lolm.qq.com/",
    "Accept": "application/json, text/plain, */*",
}

POSITION_MAP = {
    "1": "Mid",
    "2": "Baron",
    "3": "Dragon",
    "4": "Support",
    "5": "Jungle",
}

DAN_MAP = {
    "0": "All",
    "1": "Diamond+",
    "2": "Master+",
    "3": "Challenger",
    "4": "Top",
}

_cache: dict[str, Any] = {}
_cache_ts: float = 0.0
_CACHE_TTL = 3600  # seconds


def _fetch_json(url: str) -> Any:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
        raw = resp.read()
        # Detect encoding from Content-Type or default to utf-8
        ct = resp.getheader("Content-Type", "")
        enc = "utf-8"
        if "charset=" in ct:
            enc = ct.split("charset=")[-1].strip()
        return json.loads(raw.decode(enc))


def _champion_id_from_poster(poster_url: str) -> str:
    """Extract lowercase English champion ID from poster URL.

    e.g. '.../Posters/MissFortune_0.jpg'  →  'missfortune'
    """
    m = re.search(r"/Posters/([^/]+)_0", poster_url)
    return m.group(1).lower() if m else ""


def _name_en_from_poster(poster_url: str) -> str:
    """Extract spaced English display name from poster URL.

    e.g. '.../Posters/MissFortune_0.jpg'  →  'Miss Fortune'
         '.../Posters/LeeSin_0.jpg'       →  'Lee Sin'
    """
    m = re.search(r"/Posters/([^/]+)_0", poster_url)
    if not m:
        return ""
    raw = m.group(1)  # PascalCase, e.g. "MissFortune"
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", raw)


def fetch_server_meta(dan: str = "1", position: str = "all") -> dict:
    """Return champion stats for the given rank tier and optional role filter.

    dan:      '1'=Diamond+  '2'=Master+  '3'=Challenger  '4'=Top
    position: 'all' | '1'=Mid  '2'=Baron  '3'=Dragon  '4'=Support  '5'=Jungle

    Each champion: hero_id, champion_id, name_en, name_cn, avatar,
                   role, win_rate, pick_rate, ban_rate, updated
    """
    global _cache, _cache_ts
    cache_key = f"ext_{dan}_{position}"
    now = time.time()
    if cache_key in _cache and (now - _cache_ts) < _CACHE_TTL:
        return _cache[cache_key]

    try:
        hero_data = _fetch_json(_HERO_LIST_URL)
        hero_list: dict = hero_data.get("heroList", {})

        rank_data = _fetch_json(_RANK_URL)
        dan_data: dict = rank_data.get("data", {}).get(dan, {})

        # Build hero_id → {champion_id, name_en, name_cn, avatar}
        id_map: dict[str, dict] = {}
        for hero_id, info in hero_list.items():
            poster = info.get("poster", "")
            id_map[hero_id] = {
                "champion_id": _champion_id_from_poster(poster),
                "name_en": _name_en_from_poster(poster),
                "name_cn": info.get("name", hero_id),
                "avatar": info.get("avatar", ""),
            }

        if position != "all":
            # Single-role view: list all champions in that lane
            role = POSITION_MAP.get(position, position)
            champions = []
            for h in dan_data.get(position, []):
                hero_id = str(h.get("hero_id", ""))
                info = id_map.get(hero_id, {})
                champions.append({
                    "hero_id": hero_id,
                    "champion_id": info.get("champion_id", ""),
                    "name_en": info.get("name_en", hero_id),
                    "name_cn": info.get("name_cn", hero_id),
                    "avatar": info.get("avatar", ""),
                    "role": role,
                    "win_rate": float(h.get("win_rate_percent", 0)),
                    "pick_rate": float(h.get("appear_rate_percent", 0)),
                    "ban_rate": float(h.get("forbid_rate_percent", 0)),
                    "updated": h.get("dtstatdate", ""),
                })
            champions.sort(key=lambda x: x["win_rate"], reverse=True)
        else:
            # All-roles view: keep best win-rate entry per champion
            best: dict[str, dict] = {}
            for position_code, heroes in dan_data.items():
                role = POSITION_MAP.get(str(position_code), str(position_code))
                for h in heroes:
                    hero_id = str(h.get("hero_id", ""))
                    win = float(h.get("win_rate_percent", 0))
                    if hero_id not in best or win > best[hero_id]["win_rate"]:
                        info = id_map.get(hero_id, {})
                        best[hero_id] = {
                            "hero_id": hero_id,
                            "champion_id": info.get("champion_id", ""),
                            "name_en": info.get("name_en", hero_id),
                            "name_cn": info.get("name_cn", hero_id),
                            "avatar": info.get("avatar", ""),
                            "role": role,
                            "win_rate": win,
                            "pick_rate": float(h.get("appear_rate_percent", 0)),
                            "ban_rate": float(h.get("forbid_rate_percent", 0)),
                            "updated": h.get("dtstatdate", ""),
                        }
            champions = sorted(best.values(), key=lambda x: x["win_rate"], reverse=True)

        output: dict = {
            "tier": DAN_MAP.get(dan, dan),
            "dan": dan,
            "position": position,
            "position": position,
            "champions": champions,
            "error": None,
        }
        _cache[cache_key] = output
        _cache_ts = now
        return output

    except Exception as e:
        return {
            "tier": DAN_MAP.get(dan, dan),
            "dan": dan,
            "position": position,
            "champions": [],
            "error": str(e),
        }
