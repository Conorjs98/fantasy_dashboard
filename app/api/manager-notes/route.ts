import { NextResponse } from "next/server";
import { apiErrorResponse, parseLeagueParams } from "@/lib/api-utils";
import { readAllManagerNotes, upsertManagerNote } from "@/lib/manager-notes-store";

function parseSeason(rawSeason: unknown): string | null {
  if (typeof rawSeason !== "string") return null;
  const season = rawSeason.trim();
  return season.length > 0 ? season : null;
}

export async function GET(request: Request) {
  try {
    const { leagueId, season } = parseLeagueParams(request);
    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }

    const notes = await readAllManagerNotes(leagueId, season);
    return NextResponse.json({ notes });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  try {
    // TODO: Add commissioner-only authentication in a future milestone.
    const { leagueId: fallbackLeagueId } = parseLeagueParams(request);
    const body = (await request.json()) as {
      leagueId?: string;
      season?: string;
      userId?: string;
      notes?: string;
    };

    const leagueId = typeof body.leagueId === "string" && body.leagueId.trim().length > 0
      ? body.leagueId.trim()
      : fallbackLeagueId;
    const season = parseSeason(body.season);
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes : "";

    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const note = await upsertManagerNote(leagueId, season, userId, notes);
    return NextResponse.json({ note });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
