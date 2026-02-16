import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getLeagueId } from "@/lib/config";
import { getLeagueContext } from "@/lib/league-context";
import { readRecap } from "@/lib/recap-store";
import type { AdminRecapResponse } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawWeek = searchParams.get("week");
    const week = rawWeek ? parseInt(rawWeek, 10) : null;

    if (!week || Number.isNaN(week) || week < 1) {
      return NextResponse.json({ error: "Valid week number is required" }, { status: 400 });
    }

    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const context = await getLeagueContext({ leagueId });
    const recap = await readRecap(leagueId, context.league.season, week);

    const response: AdminRecapResponse = recap
      ? {
          state: recap.state,
          weekSummary: recap.weekSummary,
          matchupSummaries: recap.matchupSummaries,
          personalityNotes: recap.personalityNotes,
          generatedAt: recap.generatedAt,
          publishedAt: recap.publishedAt,
        }
      : {
          state: "NOT_GENERATED",
          weekSummary: "",
          matchupSummaries: [],
          personalityNotes: "",
          generatedAt: null,
          publishedAt: null,
        };

    return NextResponse.json(response);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
