import { NextResponse } from "next/server";
import { getLeagueContext } from "@/lib/league-context";
import { apiErrorResponse } from "@/lib/api-utils";
import { getLeagueId } from "@/lib/config";
import { buildManagerContextPacks, buildRecapMatchups } from "@/lib/recap-builder";
import { generateRecap } from "@/lib/recap-llm";
import { writeRecap } from "@/lib/recap-store";
import { readAllManagerNotes } from "@/lib/manager-notes-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      week?: number;
      leagueId?: string;
      season?: string;
      personalityNotes?: string;
    };

    const week = body.week;
    if (!week || typeof week !== "number" || week < 1) {
      return NextResponse.json({ error: "Valid week number is required" }, { status: 400 });
    }

    const personalityNotes = body.personalityNotes ?? "";
    const leagueId = body.leagueId ?? getLeagueId();
    const season = body.season;
    const context = await getLeagueContext({ leagueId, season });
    const { matchups, rawMatchups } = await buildRecapMatchups(context, week);

    if (matchups.length === 0) {
      return NextResponse.json({ error: "No matchups found for this week" }, { status: 404 });
    }

    const managerNotes = await readAllManagerNotes(
      context.league.leagueId,
      context.league.season
    );
    const notesByUserId = new Map(
      managerNotes.map((note) => [note.userId, note.notes])
    );
    const managerPacks = await buildManagerContextPacks(
      context,
      week,
      rawMatchups,
      notesByUserId
    );

    const result = await generateRecap(
      week,
      context.league.season,
      matchups,
      personalityNotes,
      managerPacks
    );

    await writeRecap({
      leagueId: context.league.leagueId,
      season: context.league.season,
      week,
      state: "DRAFT",
      weekSummary: result.weekSummary,
      matchupSummaries: result.matchupSummaries,
      personalityNotes,
      generatedAt: new Date().toISOString(),
      publishedAt: null,
    });

    return NextResponse.json({ ok: true, state: "DRAFT" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
