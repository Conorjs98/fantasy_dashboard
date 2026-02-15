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
