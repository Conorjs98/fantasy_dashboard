// ---------------------------------------------------------------------------
// Power ranking weights — tune these to change how rankings are calculated.
// All weights should sum to 1.0.
// ---------------------------------------------------------------------------

export const POWER_RANKING_WEIGHTS = {
  /** Weight for win percentage (wins / gamesPlayed) */
  WIN_PCT: 0.5,
  /** Weight for normalised points-for (teamPF / maxPFInLeague) */
  NORMALIZED_PF: 0.5,
} as const;

// PA is stored but only used as a tiebreaker (higher PA wins tie — means
// the manager succeeded despite a tougher schedule).
export const TIEBREAKER: "PA" = "PA";

// ---------------------------------------------------------------------------
// Sleeper API
// ---------------------------------------------------------------------------

export const SLEEPER_BASE_URL = "https://api.sleeper.app/v1";
export const SLEEPER_CDN_BASE = "https://sleepercdn.com";

/** Default league ID from env — will be overridden when multi-league is active */
export function getLeagueId(): string {
  const id = process.env.SLEEPER_LEAGUE_ID;
  if (!id) throw new Error("SLEEPER_LEAGUE_ID env var is required");
  return id;
}

// TODO: [multi-league] Parse SLEEPER_LEAGUE_IDS (comma-separated) and return
// an array of league IDs. Fall back to SLEEPER_LEAGUE_ID for single-league.
// export function getLeagueIds(): string[] {
//   const multi = process.env.SLEEPER_LEAGUE_IDS;
//   if (multi) return multi.split(",").map((s) => s.trim());
//   return [getLeagueId()];
// }

// ---------------------------------------------------------------------------
// NFL season helpers
// ---------------------------------------------------------------------------

export const NFL_REGULAR_SEASON_WEEKS = 17;
