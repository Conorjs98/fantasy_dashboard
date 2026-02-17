import { NextResponse } from "next/server";
import { getMatchups, getWinnersBracket, getLosersBracket } from "@/lib/sleeper";
import { getLeagueContext } from "@/lib/league-context";
import {
  accumulateStats,
  computeExpectedRecords,
  computeRankings,
  deriveFinalPlacements,
} from "@/lib/rankings";
import { parseLeagueParams, apiErrorResponse } from "@/lib/api-utils";
import type { ManagerRanking } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { leagueId, season, searchParams } = parseLeagueParams(request);
    const throughWeek = searchParams.get("week")
      ? parseInt(searchParams.get("week")!, 10)
      : null;

    const context = await getLeagueContext({ leagueId, season });
    const { league, rosters, users, rawLeague } = context;

    const maxWeek = throughWeek ?? league.currentWeek;
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
    let rankingsWithExpected: ManagerRanking[] = rankings;

    try {
      const expected = computeExpectedRecords(
        rosters,
        matchupsByWeek,
        maxWeek,
        "season_to_date"
      );

      rankingsWithExpected = rankings.map((manager) => {
        const expectedData = expected.byRoster.get(manager.rosterId);
        if (!expectedData || !expected.available) return manager;
        return {
          ...manager,
          expectedRecord: expectedData.expectedRecord,
          deltaVsExpected: expectedData.deltaVsExpected,
          allPlayWinPct: expectedData.allPlayWinPct,
        };
      });
    } catch {}

    return NextResponse.json({
      rankings: rankingsWithExpected,
      week: maxWeek,
      season: league.season,
      leagueName: league.name,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
