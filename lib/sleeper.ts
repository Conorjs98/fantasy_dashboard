import { SLEEPER_BASE_URL } from "./config";
import type {
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
  SleeperMatchup,
  SleeperBracketMatch,
  SleeperPlayer,
  SleeperTransaction,
} from "./types";

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE_URL}${path}`, {
    next: { revalidate: 120 }, // cache for 2 minutes on the edge
  });
  if (!res.ok) {
    throw new Error(`Sleeper API ${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`);
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

export async function getUsers(leagueId: string): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`);
}

export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  return sleeperFetch<SleeperMatchup[]>(
    `/league/${leagueId}/matchups/${week}`
  );
}

export async function getWinnersBracket(
  leagueId: string
): Promise<SleeperBracketMatch[]> {
  return sleeperFetch<SleeperBracketMatch[]>(
    `/league/${leagueId}/winners_bracket`
  );
}

export async function getLosersBracket(
  leagueId: string
): Promise<SleeperBracketMatch[]> {
  return sleeperFetch<SleeperBracketMatch[]>(
    `/league/${leagueId}/losers_bracket`
  );
}

/** Fetch the NFL state (current week/season) */
export async function getNflState(): Promise<{
  season: string;
  week: number;
  season_type: string;
  leg: number;
  [key: string]: unknown;
}> {
  return sleeperFetch("/state/nfl");
}

const PLAYERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cachedPlayers: Record<string, SleeperPlayer> | null = null;
let cachedPlayersTs = 0;

export async function getTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[]> {
  return sleeperFetch<SleeperTransaction[]>(
    `/league/${leagueId}/transactions/${week}`
  );
}

export async function getPlayers(): Promise<Record<string, SleeperPlayer>> {
  const now = Date.now();
  if (cachedPlayers && now - cachedPlayersTs < PLAYERS_CACHE_TTL_MS) {
    return cachedPlayers;
  }

  try {
    const players = await sleeperFetch<Record<string, SleeperPlayer>>(
      "/players/nfl"
    );
    cachedPlayers = players;
    cachedPlayersTs = now;
    return players;
  } catch (error) {
    if (cachedPlayers) {
      return cachedPlayers;
    }
    throw error;
  }
}
