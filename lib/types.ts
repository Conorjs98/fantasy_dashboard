// ---------------------------------------------------------------------------
// Sleeper API response types
// ---------------------------------------------------------------------------

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  /** 0-indexed current matchup period; null when offseason */
  settings: {
    leg: number; // current matchup week
    playoff_week_start: number;
    last_scored_leg: number;
    [key: string]: unknown;
  };
  status: "pre_draft" | "drafting" | "in_season" | "complete";
  total_rosters: number;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  [key: string]: unknown;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  metadata?: {
    avatar?: string;
    team_logo?: string;
    [key: string]: unknown;
  };
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    [key: string]: unknown;
  };
  players: string[] | null;
  starters: string[] | null;
  [key: string]: unknown;
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: {
    team_name?: string;
    avatar?: string;
    team_logo?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters_points: number[] | null;
  starters: string[] | null;
  players_points: Record<string, number> | null;
  [key: string]: unknown;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: "trade" | "free_agent" | "waiver";
  status: string;
  adds: Record<string, string> | null;
  drops: Record<string, string> | null;
  roster_ids: number[];
  [key: string]: unknown;
}

export interface SleeperPlayer {
  player_id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  [key: string]: unknown;
}

export interface SleeperBracketMatch {
  /** Match number within the bracket */
  m: number;
  /** Round number */
  r: number;
  /** Placement position (only present on placement-deciding matches) */
  p?: number;
  /** Winner roster_id */
  w?: number;
  /** Loser roster_id */
  l?: number;
  /** Team 1 roster_id */
  t1: number;
  /** Team 2 roster_id */
  t2: number;
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
}

// ---------------------------------------------------------------------------
// App-specific types
// ---------------------------------------------------------------------------

export interface ManagerRanking {
  rosterId: number;
  userId: string;
  displayName: string;
  teamName: string;
  /** Fully resolved avatar URL, ready to use as an img src */
  avatar: string | null;
  rank: number;
  powerScore: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface LeagueInfo {
  leagueId: string;
  name: string;
  season: string;
  currentWeek: number;
  totalWeeks: number;
  playoffWeekStart?: number;
  status: SleeperLeague["status"];
  /** Fully resolved league avatar URL */
  avatar: string | null;
}

export interface LeagueMember {
  rosterId: number;
  userId: string;
  displayName: string;
  teamName: string;
  /** Fully resolved avatar URL, ready to use as an img src */
  avatar: string | null;
}

export interface LeagueContext {
  league: LeagueInfo;
  members: LeagueMember[];
  availableSeasons: string[];
}

export interface WeeklyRecapParticipant {
  rosterId: number;
  userId: string;
  displayName: string;
  teamName: string;
  avatar: string | null;
  score: number;
}

export interface WeeklyRecapMatchup {
  matchupId: number;
  a: WeeklyRecapParticipant;
  b: WeeklyRecapParticipant;
  winnerUserId: string | null;
  loserUserId: string | null;
  winnerRosterId: number | null;
  loserRosterId: number | null;
  summary: string;
  tags: WeeklyRecapTag[];
}

export type WeeklyRecapTagType = "close" | "blowout" | "shootout" | "snoozefest";

export interface WeeklyRecapTag {
  type: WeeklyRecapTagType;
  label: string;
  emoji: string;
}

export type WeeklyRecapHighlightType =
  | "game_of_the_week"
  | "beatdown"
  | "high_score"
  | "low_score";

export interface WeeklyRecapHighlight {
  type: WeeklyRecapHighlightType;
  label: string;
  emoji: string;
  matchupId: number;
  winnerName: string;
  loserName: string;
  winnerScore: number;
  loserScore: number;
  value: number;
  valueLabel: string;
}

export interface WeeklyRecapResponse {
  leagueId: string;
  season: string;
  week: number;
  matchups: WeeklyRecapMatchup[];
  highlights: WeeklyRecapHighlight[];
  recapState: RecapState;
  weekSummary: string;
}

export interface ManagerNote {
  leagueId: string;
  season: string;
  userId: string;
  notes: string;
  updatedAt: string;
}

export interface ManagerTradeContext {
  acquiredPlayers: string[];
  droppedPlayers: string[];
}

export interface ManagerContextPack {
  rosterId: number;
  userId: string;
  displayName: string;
  teamName: string;
  personalityNotes: string;
  weeklyScore: number;
  starterCount: number;
  topStarterName: string;
  topStarterScore: number;
  bottomStarterName: string;
  bottomStarterScore: number;
  trades: ManagerTradeContext[];
}

// ---------------------------------------------------------------------------
// AI Recap lifecycle types
// ---------------------------------------------------------------------------

export type RecapState = "NOT_GENERATED" | "DRAFT" | "PUBLISHED";

export interface PersistedMatchupSummary {
  matchupId: number;
  summary: string;
}

export interface PersistedRecap {
  leagueId: string;
  season: string;
  week: number;
  state: RecapState;
  weekSummary: string;
  matchupSummaries: PersistedMatchupSummary[];
  personalityNotes: string;
  generatedAt: string;
  publishedAt: string | null;
}

export interface AdminRecapResponse {
  state: RecapState;
  weekSummary: string;
  matchupSummaries: PersistedMatchupSummary[];
  personalityNotes: string;
  managerNotes: ManagerNote[];
  generatedAt: string | null;
  publishedAt: string | null;
}

// TODO: [luck] LuckData type for expected-vs-actual wins analysis
// export interface LuckData {
//   rosterId: number;
//   expectedWins: number;
//   actualWins: number;
//   luckIndex: number;
// }

// TODO: [roast] RoastRequest / RoastResponse types
// export interface RoastRequest {
//   week: number;
//   matchups: SleeperMatchup[];
//   managers: Record<number, string>;
// }
