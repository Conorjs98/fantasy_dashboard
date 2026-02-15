import { NextResponse } from "next/server";
import { getMatchups, getWinnersBracket, getLosersBracket } from "@/lib/sleeper";
import { getLeagueId } from "@/lib/config";
import { getLeagueContext } from "@/lib/league-context";
import { accumulateStats, computeRankings, deriveFinalPlacements } from "@/lib/rankings";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const season = searchParams.get("season") ?? undefined;
    const throughWeek = searchParams.get("week")
      ? parseInt(searchParams.get("week")!, 10)
      : null;

    const context = await getLeagueContext({ leagueId, season });
    const { league, rosters, users, rawLeague } = context;

    const maxWeek =
      throughWeek ?? league.currentWeek;

    // Fetch all matchups up to the target week in parallel
    const weekNumbers = Array.from({ length: maxWeek }, (_, i) => i + 1);
    const matchupsByWeek = await Promise.all(
      weekNumbers.map((w) => getMatchups(league.leagueId, w))
    );

    const stats = accumulateStats(rosters, matchupsByWeek, maxWeek);

    let finalPlacements: Map<number, number> | undefined;
    if (rawLeague.status === "complete" && throughWeek === null) {
      const [winnersBracket, losersBracket] = await Promise.all([
        getWinnersBracket(league.leagueId),
        getLosersBracket(league.leagueId),
      ]);
      const playoffTeams = (rawLeague.settings.playoff_teams as number) ?? 6;
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
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
