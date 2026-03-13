import type {
  Champion,
  Match,
  DraftPlan,
} from "./models/types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Champions
export const getChampions = () => request<Champion[]>("/champions");

// Matches
export const getMatches = () => request<Match[]>("/matches");
export const createMatch = (m: Match) =>
  request<Match>("/matches", { method: "POST", body: JSON.stringify(m) });
export const deleteMatch = (id: string) =>
  request<{ ok: boolean }>(`/matches/${encodeURIComponent(id)}`, { method: "DELETE" });

// Meta
export const getPresence = () => request<Record<string, number>>("/meta/presence");
export const getPickRates = () => request<Record<string, number>>("/meta/picks");
export const getBanRates = () => request<Record<string, number>>("/meta/bans");
export const getWinRates = () =>
  request<Record<string, { wins: number; games: number; rate: number }>>("/meta/winrates");
export const getFirstPhase = () =>
  request<Record<string, { first_phase_bans: number; first_phase_picks: number }>>(
    "/meta/first-phase"
  );

// External server meta (lolm.qq.com)
export interface ExternalChampion {
  hero_id: string;
  champion_id: string;
  name_en: string;
  name_cn: string;
  avatar: string;
  role: string;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
  updated: string;
}

export interface ExternalMeta {
  tier: string;
  dan: string;
  position: string;
  champions: ExternalChampion[];
  error: string | null;
}

export interface PlayerPerformance {
  name: string;
  games: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  avg_damage: number;
  avg_gold: number;
  avg_wards: number;
}

export interface ChampionProfile {
  champion_id: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  kda: number;
  avg_damage: number;
  avg_gold: number;
}

export interface RecentGame {
  match_id: string;
  date: string;
  tournament: string | null;
  blue_team: string;
  red_team: string;
  champion_id: string;
  role: string;
  side: string;
  result: "W" | "L";
  kills: number;
  deaths: number;
  assists: number;
  damage_dealt: number;
  gold: number;
}

export interface PlayerProfile {
  name: string;
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  kda: number;
  avg_damage: number;
  avg_gold: number;
  avg_wards: number;
  avg_damage_taken: number;
  avg_heal_shield: number;
  avg_cc: number;
  champions: ChampionProfile[];
  roles: { role: string; games: number }[];
  recent: RecentGame[];
}

export const getExternalMeta = (dan = "1", position = "all") =>
  request<ExternalMeta>(`/meta/external?dan=${encodeURIComponent(dan)}&position=${encodeURIComponent(position)}`);

export const getPlayerPerformance = () =>
  request<PlayerPerformance[]>("/meta/player-performance");

export const getPlayerProfile = (name: string) =>
  request<PlayerProfile>(`/meta/player-profile/${encodeURIComponent(name)}`);

// Drafts
export const getDrafts = () => request<DraftPlan[]>("/drafts");
export const createDraft = (d: DraftPlan) =>
  request<DraftPlan>("/drafts", { method: "POST", body: JSON.stringify(d) });
export const deleteDraft = (id: string) =>
  request<{ ok: boolean }>(`/drafts/${encodeURIComponent(id)}`, { method: "DELETE" });

// Team Notes
export interface NoteCard {
  id: string;
  text: string;
}

export interface NoteCategory {
  id: string;
  title: string;
  color?: string;
  cards: NoteCard[];
}

export interface TeamBoard {
  categories: NoteCategory[];
}

export const getTeamNotes = () => request<TeamBoard>("/team-notes");
export const saveTeamNotes = (board: TeamBoard) =>
  request<TeamBoard>("/team-notes", { method: "PUT", body: JSON.stringify(board) });

// Tactic Maps
export interface MapIcon {
  id: string;
  kind: "champion" | "ward";
  champion_id?: string;
  x: number;
  y: number;
}

export interface MapArrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface TacticMap {
  id: string;
  title: string;
  icons: MapIcon[];
  arrows: MapArrow[];
  notes?: string;
}

export const getTacticMaps = () => request<TacticMap[]>("/tactic-maps");
export const createTacticMap = (m: TacticMap) =>
  request<TacticMap>("/tactic-maps", { method: "POST", body: JSON.stringify(m) });
export const deleteTacticMap = (id: string) =>
  request<{ ok: boolean }>(`/tactic-maps/${encodeURIComponent(id)}`, { method: "DELETE" });



