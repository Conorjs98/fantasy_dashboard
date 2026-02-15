import { POWER_RANKING_WEIGHTS, TIEBREAKER, SLEEPER_CDN_BASE } from "./config";
import type {
  SleeperRoster,
  SleeperUser,
  SleeperMatchup,
  SleeperBracketMatch,
  ManagerRanking,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a raw Sleeper avatar value to a full URL.
 * Roster/team avatars are stored as full URLs; user avatars are just IDs.
 */
function resolveAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `${SLEEPER_CDN_BASE}/avatars/thumbs/${raw}`;
}

/**
 * Derive final placements from winners and losers bracket data.
 * Bracket matches with a `p` field decide placement positions:
 * winner gets place `p`, loser gets `p + 1`.
 * Losers bracket placements are offset by the number of playoff teams.
 */
export function deriveFinalPlacements(
  winnersBracket: SleeperBracketMatch[],
  losersBracket: SleeperBracketMatch[],
  playoffTeams: number
): Map<number, number> {
  const placements = new Map<number, number>();

  for (const match of winnersBracket) {
    if (match.p != null && match.w != null && match.l != null) {
      placements.set(match.w, match.p);
      placements.set(match.l, match.p + 1);
    }
  }

  for (const match of losersBracket) {
    if (match.p != null && match.w != null && match.l != null) {
      placements.set(match.w, match.p + playoffTeams);
      placements.set(match.l, match.p + 1 + playoffTeams);
    }
  }

  return placements;
}

interface AccumulatedStats {
  rosterId: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

/**
 * Accumulate W/L/PF/PA from weekly matchups up to `throughWeek`.
 * If no matchup data is available (e.g. pre-season), falls back to roster
 * season totals.
 */
export function accumulateStats(
  rosters: SleeperRoster[],
  matchupsByWeek: SleeperMatchup[][],
  throughWeek: number
): AccumulatedStats[] {
  // If we have matchup data, compute from scratch
  if (matchupsByWeek.length > 0 && throughWeek > 0) {
    const statsMap = new Map<number, AccumulatedStats>();

    // Initialise every roster
    for (const r of rosters) {
      statsMap.set(r.roster_id, {
        rosterId: r.roster_id,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }

    for (let w = 0; w < Math.min(throughWeek, matchupsByWeek.length); w++) {
      const weekMatchups = matchupsByWeek[w];
      // Group by matchup_id to find opponents
      const byMatchupId = new Map<number, SleeperMatchup[]>();
      for (const m of weekMatchups) {
        const group = byMatchupId.get(m.matchup_id) ?? [];
        group.push(m);
        byMatchupId.set(m.matchup_id, group);
      }

      for (const [, pair] of byMatchupId) {
        if (pair.length !== 2) continue;
        const [a, b] = pair;

        const statsA = statsMap.get(a.roster_id);
        const statsB = statsMap.get(b.roster_id);
        if (!statsA || !statsB) continue;

        statsA.pointsFor += a.points ?? 0;
        statsA.pointsAgainst += b.points ?? 0;
        statsB.pointsFor += b.points ?? 0;
        statsB.pointsAgainst += a.points ?? 0;

        if ((a.points ?? 0) > (b.points ?? 0)) {
          statsA.wins++;
          statsB.losses++;
        } else if ((b.points ?? 0) > (a.points ?? 0)) {
          statsB.wins++;
          statsA.losses++;
        } else {
          statsA.ties++;
          statsB.ties++;
        }
      }
    }

    return Array.from(statsMap.values());
  }

  // Fallback: use season totals from roster objects
  return rosters.map((r) => ({
    rosterId: r.roster_id,
    wins: r.settings.wins ?? 0,
    losses: r.settings.losses ?? 0,
    ties: r.settings.ties ?? 0,
    pointsFor:
      (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100,
    pointsAgainst:
      (r.settings.fpts_against ?? 0) +
      (r.settings.fpts_against_decimal ?? 0) / 100,
  }));
}

// ---------------------------------------------------------------------------
// Power ranking calculation
// ---------------------------------------------------------------------------

export function computeRankings(
  stats: AccumulatedStats[],
  rosters: SleeperRoster[],
  users: SleeperUser[],
  options?: { finalPlacements?: Map<number, number> }
): ManagerRanking[] {
  const userMap = new Map<string, SleeperUser>();
  for (const u of users) userMap.set(u.user_id, u);

  const rosterOwnerMap = new Map<number, string>();
  const rosterMap = new Map<number, SleeperRoster>();
  for (const r of rosters) {
    rosterOwnerMap.set(r.roster_id, r.owner_id);
    rosterMap.set(r.roster_id, r);
  }

  const maxPF = Math.max(...stats.map((s) => s.pointsFor), 1);

  const scored = stats.map((s) => {
    const gamesPlayed = s.wins + s.losses + s.ties;
    const winPct = gamesPlayed > 0 ? s.wins / gamesPlayed : 0;
    const normalizedPF = s.pointsFor / maxPF;
    const powerScore =
      (winPct * POWER_RANKING_WEIGHTS.WIN_PCT +
        normalizedPF * POWER_RANKING_WEIGHTS.NORMALIZED_PF) *
      100;

    const ownerId = rosterOwnerMap.get(s.rosterId) ?? "";
    const user = userMap.get(ownerId);
    const roster = rosterMap.get(s.rosterId);
    const avatarUrl = resolveAvatarUrl(
      roster?.metadata?.avatar ??
      roster?.metadata?.team_logo ??
      user?.metadata?.avatar ??
      user?.metadata?.team_logo ??
      user?.avatar
    );

    return {
      rosterId: s.rosterId,
      userId: ownerId,
      displayName: user?.display_name ?? `Team ${s.rosterId}`,
      teamName: user?.metadata?.team_name ?? user?.display_name ?? `Team ${s.rosterId}`,
      avatar: avatarUrl,
      rank: 0,
      powerScore: Math.round(powerScore * 10) / 10,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      pointsFor: Math.round(s.pointsFor * 100) / 100,
      pointsAgainst: Math.round(s.pointsAgainst * 100) / 100,
    } satisfies ManagerRanking;
  });

  if (options?.finalPlacements && options.finalPlacements.size > 0) {
    const pm = options.finalPlacements;
    scored.sort((a, b) => {
      const placeA = pm.get(a.rosterId) ?? Infinity;
      const placeB = pm.get(b.rosterId) ?? Infinity;
      return placeA - placeB;
    });
  } else {
    // Sort: by standing (wins desc), then PF desc, then configured tiebreaker.
    scored.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      if (TIEBREAKER === "PA") return b.pointsAgainst - a.pointsAgainst;
      return 0;
    });
  }

  // Assign ranks
  scored.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scored;
}
