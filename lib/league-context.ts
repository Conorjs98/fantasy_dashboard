import { NFL_REGULAR_SEASON_WEEKS, SLEEPER_CDN_BASE, getLeagueId } from "./config";
import { getLeague, getNflState, getRosters, getUsers } from "./sleeper";
import type {
  LeagueContext,
  LeagueInfo,
  LeagueMember,
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
} from "./types";

interface LeagueHistoryEntry {
  leagueId: string;
  league: SleeperLeague;
}

export interface ResolvedLeagueContext extends LeagueContext {
  rosters: SleeperRoster[];
  users: SleeperUser[];
  rawLeague: SleeperLeague;
}

function resolveAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `${SLEEPER_CDN_BASE}/avatars/thumbs/${raw}`;
}

async function getLeagueHistory(startLeagueId: string): Promise<LeagueHistoryEntry[]> {
  const history: LeagueHistoryEntry[] = [];
  const visited = new Set<string>();
  let currentLeagueId: string | null = startLeagueId;

  while (currentLeagueId && !visited.has(currentLeagueId)) {
    visited.add(currentLeagueId);
    let league: SleeperLeague;
    try {
      league = await getLeague(currentLeagueId);
    } catch (error) {
      if (history.length === 0) {
        throw error;
      }
      break;
    }
    history.push({ leagueId: currentLeagueId, league });

    const previousLeagueId = league.previous_league_id;
    currentLeagueId =
      typeof previousLeagueId === "string" && previousLeagueId.length > 0
        ? previousLeagueId
        : null;
  }

  return history;
}

function toLeagueInfo(
  leagueId: string,
  league: SleeperLeague,
  nflSeason: string,
  nflLeg: number
): LeagueInfo {
  const totalWeeks = league.settings.playoff_week_start
    ? league.settings.playoff_week_start - 1
    : NFL_REGULAR_SEASON_WEEKS;

  const liveWeek =
    league.season === nflSeason && nflLeg > 0 ? nflLeg : 1;
  const scoredWeek = league.settings.last_scored_leg ?? 0;
  const rawCurrentWeek =
    scoredWeek > 0
      ? scoredWeek
      : league.status === "complete"
        ? totalWeeks
        : liveWeek;

  const leagueAvatar = (league as Record<string, unknown>).avatar as
    | string
    | null
    | undefined;

  return {
    leagueId,
    name: league.name,
    season: league.season,
    currentWeek: Math.max(1, rawCurrentWeek),
    totalWeeks,
    playoffWeekStart: league.settings.playoff_week_start ?? undefined,
    status: league.status,
    avatar: resolveAvatarUrl(leagueAvatar),
  };
}

function buildLeagueMembers(
  rosters: SleeperRoster[],
  users: SleeperUser[]
): LeagueMember[] {
  const userMap = new Map<string, SleeperUser>();
  for (const user of users) {
    userMap.set(user.user_id, user);
  }

  return rosters.map((roster) => {
    const ownerId = roster.owner_id ?? "";
    const user = userMap.get(ownerId);
    const avatar = resolveAvatarUrl(
      roster.metadata?.avatar ??
        roster.metadata?.team_logo ??
        user?.metadata?.avatar ??
        user?.metadata?.team_logo ??
        user?.avatar
    );

    return {
      rosterId: roster.roster_id,
      userId: ownerId,
      displayName: user?.display_name ?? `Team ${roster.roster_id}`,
      teamName:
        user?.metadata?.team_name ??
        user?.display_name ??
        `Team ${roster.roster_id}`,
      avatar,
    };
  });
}

export async function getLeagueContext(options?: {
  leagueId?: string;
  season?: string;
}): Promise<ResolvedLeagueContext> {
  const startLeagueId = options?.leagueId ?? getLeagueId();
  const targetSeason = options?.season;

  const [history, nflState] = await Promise.all([
    getLeagueHistory(startLeagueId),
    getNflState(),
  ]);

  const target = targetSeason
    ? history.find((entry) => entry.league.season === targetSeason)
    : history[0];

  if (!target) {
    throw new Error(`Season ${targetSeason} not found`);
  }

  const [rosters, users] = await Promise.all([
    getRosters(target.leagueId),
    getUsers(target.leagueId),
  ]);

  const league = toLeagueInfo(
    target.leagueId,
    target.league,
    String(nflState.season ?? ""),
    Number(nflState.leg ?? 1)
  );
  const members = buildLeagueMembers(rosters, users);

  return {
    league,
    members,
    availableSeasons: history.map((entry) => entry.league.season),
    rosters,
    users,
    rawLeague: target.league,
  };
}
