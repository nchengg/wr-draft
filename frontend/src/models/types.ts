// ── Enums ─────────────────────────────────────────────────────────────────

export type Role = "baron" | "jungle" | "mid" | "dragon" | "support";
export type DamageType = "ad" | "ap" | "mixed";
export type SubClass =
  | "tank"
  | "fighter"
  | "assassin"
  | "mage"
  | "marksman"
  | "enchanter"
  | "vanguard"
  | "specialist";
export type ScalingPhase = "early" | "mid" | "late";

// ── Champion ──────────────────────────────────────────────────────────────

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
  damage_type: DamageType;
  sub_class: SubClass;
  has_hard_cc: boolean;
  has_aoe: boolean;
  scaling: ScalingPhase;
  mobility: number;
  notes?: string;
}

// ── Player Stats ─────────────────────────────────────────────────────────

export interface PlayerStats {
  name: string;
  role: Role;
  side: "blue" | "red";
  result: "W" | "L";
  champion_id: string;
  kills: number;
  deaths: number;
  assists: number;
  heal_shield: number;
  cc_duration: number;
  epic_monsters: number;
  wards: number;
  damage_dealt: number;
  damage_conversion_ratio: number;
  damage_taken: number;
  damage_taken_per_defeat: number;
  damage_mitigation_ratio: number;
  gold: number;
  monster_farm: number;
  minion_score: number;
  turrets_pushed: number;
}

// ── Match ─────────────────────────────────────────────────────────────────

export interface PickBan {
  champion_id: string;
  team: "blue" | "red";
  role?: Role;
  order: number;
}

export interface MatchDraft {
  bans: PickBan[];
  picks: PickBan[];
}

export interface MatchResult {
  winner: "blue" | "red";
  duration_minutes?: number;
  mvp_champion_id?: string;
  notes?: string;
}

export interface Match {
  id: string;
  date: string; // ISO date
  tournament?: string;
  patch?: string;
  blue_team: string;
  red_team: string;
  draft: MatchDraft;
  player_stats?: PlayerStats[];
  result?: MatchResult;
  notes?: string;
}

// ── Draft Plan ────────────────────────────────────────────────────────────

export interface DraftSlot {
  champion_id?: string;
  role?: Role;
  note?: string;
  rating?: number;
}

export interface DraftPlan {
  id: string;
  blue_team?: string;
  red_team?: string;
  opponent?: string;
  blue_bans: DraftSlot[];
  red_bans: DraftSlot[];
  blue_picks: DraftSlot[];
  red_picks: DraftSlot[];
  overall_rating?: number;
  notes?: string;
}

// ── Squad ─────────────────────────────────────────────────────────────────

export interface SquadMember {
  champion_id: string;
  role: Role;
}

export interface SquadAnalysis {
  ad_ratio: number;
  ap_ratio: number;
  hard_cc_count: number;
  aoe_count: number;
  frontline_count: number;
  backline_count: number;
  avg_mobility: number;
  scaling_profile: string;
  strengths: string[];
  weaknesses: string[];
  overall_score: number;
  notes?: string;
}
