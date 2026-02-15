import { NextResponse } from "next/server";
import {
  getLeague,
  getRosters,
  getUsers,
  getMatchups,
  getWinnersBracket,
  getLosersBracket,
} from "@/lib/sleeper";
import { getLeagueId } from "@/lib/config";
import { accumulateStats, computeRankings, deriveFinalPlacements } from "@/lib/rankings";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const throughWeek = searchParams.get("week")
      ? parseInt(searchParams.get("week")!, 10)
      : null;

    const [league, rosters, users] = await Promise.all([
      getLeague(leagueId),
      getRosters(leagueId),
      getUsers(leagueId),
    ]);

    const maxWeek =
      throughWeek ?? league.settings.last_scored_leg ?? league.settings.leg ?? 0;

    // Fetch all matchups up to the target week in parallel
    const weekNumbers = Array.from({ length: maxWeek }, (_, i) => i + 1);
    const matchupsByWeek = await Promise.all(
      weekNumbers.map((w) => getMatchups(leagueId, w))
    );

    const stats = accumulateStats(rosters, matchupsByWeek, maxWeek);

    let finalPlacements: Map<number, number> | undefined;
    if (league.status === "complete" && throughWeek === null) {
      const [winnersBracket, losersBracket] = await Promise.all([
        getWinnersBracket(leagueId),
        getLosersBracket(leagueId),
      ]);
      const playoffTeams = (league.settings.playoff_teams as number) ?? 6;
      finalPlacements = deriveFinalPlacements(winnersBracket, losersBracket, playoffTeams);
    }

    const rankings = computeRankings(stats, rosters, users, { finalPlacements });

    return NextResponse.json({
      rankings,
      week: maxWeek,
      season: league.season,
      leagueName: league.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
