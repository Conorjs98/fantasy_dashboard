import { NextResponse } from "next/server";
import { apiErrorResponse, parseLeagueParams } from "@/lib/api-utils";
import { getLeagueContext } from "@/lib/league-context";
import { readRecap } from "@/lib/recap-store";
import { readAllManagerNotes } from "@/lib/manager-notes-store";
import type { AdminRecapResponse } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { leagueId, season, searchParams } = parseLeagueParams(request);
    const rawWeek = searchParams.get("week");
    const week = rawWeek ? parseInt(rawWeek, 10) : null;

    if (!week || Number.isNaN(week) || week < 1) {
      return NextResponse.json({ error: "Valid week number is required" }, { status: 400 });
    }

    const context = await getLeagueContext({ leagueId, season });
    const [recap, managerNotes] = await Promise.all([
      readRecap(context.league.leagueId, context.league.season, week),
      readAllManagerNotes(context.league.leagueId, context.league.season),
    ]);

    const response: AdminRecapResponse = recap
      ? {
          state: recap.state,
          weekSummary: recap.weekSummary,
          matchupSummaries: recap.matchupSummaries,
          personalityNotes: recap.personalityNotes,
          managerNotes,
          generatedAt: recap.generatedAt,
          publishedAt: recap.publishedAt,
        }
      : {
          state: "NOT_GENERATED",
          weekSummary: "",
          matchupSummaries: [],
          personalityNotes: "",
          managerNotes,
          generatedAt: null,
          publishedAt: null,
        };

    return NextResponse.json(response);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
