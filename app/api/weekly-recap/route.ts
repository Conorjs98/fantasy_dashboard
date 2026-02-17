import { NextResponse } from "next/server";
import { getLeagueContext } from "@/lib/league-context";
import { parseLeagueParams, apiErrorResponse } from "@/lib/api-utils";
import { buildRecapMatchups, buildHighlights } from "@/lib/recap-builder";
import { readRecap } from "@/lib/recap-store";
import type { RecapState } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { leagueId, season, searchParams } = parseLeagueParams(request);
    const rawWeek = searchParams.get("week");
    const requestedWeek = rawWeek ? parseInt(rawWeek, 10) : null;

    if (rawWeek && (requestedWeek === null || Number.isNaN(requestedWeek) || requestedWeek < 1)) {
      return NextResponse.json({ error: "Invalid week number" }, { status: 400 });
    }

    const context = await getLeagueContext({ leagueId, season });
    const maxWeek = Math.max(context.league.totalWeeks, context.league.currentWeek);
    const week = requestedWeek ?? context.league.currentWeek;

    if (week > maxWeek) {
      return NextResponse.json(
        { error: `Week must be between 1 and ${maxWeek}` },
        { status: 400 }
      );
    }

    const { matchups: recapMatchups } = await buildRecapMatchups(context, week);
    const highlights = buildHighlights(recapMatchups);

    let recapState: RecapState = "NOT_GENERATED";
    let weekSummary = "";

    try {
      const persisted = await readRecap(context.league.leagueId, context.league.season, week);
      if (persisted) {
        recapState = persisted.state as RecapState;
        if (persisted.state === "PUBLISHED") {
          weekSummary = persisted.weekSummary;
          const summaryMap = new Map(
            persisted.matchupSummaries.map((s) => [s.matchupId, s.summary])
          );
          for (const matchup of recapMatchups) {
            const aiSummary = summaryMap.get(matchup.matchupId);
            if (aiSummary) matchup.summary = aiSummary;
          }
        }
      }
    } catch {
      // DB not available — fall through with NOT_GENERATED state
    }

    return NextResponse.json({
      leagueId: context.league.leagueId,
      season: context.league.season,
      week,
      matchups: recapMatchups,
      highlights,
      recapState,
      weekSummary,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
