import { NextResponse } from "next/server";
import { getLeague, getNflState } from "@/lib/sleeper";
import { getLeagueId, SLEEPER_CDN_BASE } from "@/lib/config";
import type { LeagueInfo } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // TODO: [multi-league] Accept leagueId as a query param, default to env
    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const season = searchParams.get("season");

    let targetLeagueId = leagueId;

    // If a specific season is requested, we need to traverse league history
    if (season) {
      let league = await getLeague(targetLeagueId);
      // Walk backward or forward to find the right season
      while (league.season !== season && league.previous_league_id) {
        targetLeagueId = league.previous_league_id as string;
        league = await getLeague(targetLeagueId);
      }
      if (league.season !== season) {
        return NextResponse.json(
          { error: `Season ${season} not found` },
          { status: 404 }
        );
      }
    }

    const [league, nflState] = await Promise.all([
      getLeague(targetLeagueId),
      getNflState(),
    ]);

    const currentWeek = league.settings.last_scored_leg ?? nflState.leg ?? 1;

    const leagueAvatar = (league as Record<string, unknown>).avatar as
      | string
      | null;

    const info: LeagueInfo = {
      leagueId: targetLeagueId,
      name: league.name,
      season: league.season,
      currentWeek,
      totalWeeks: league.settings.playoff_week_start
        ? league.settings.playoff_week_start - 1
        : 17,
      playoffWeekStart: league.settings.playoff_week_start ?? undefined,
      status: league.status,
      avatar: leagueAvatar
        ? `${SLEEPER_CDN_BASE}/avatars/thumbs/${leagueAvatar}`
        : null,
    };

    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
