import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getLeagueId } from "@/lib/config";
import { getLeagueContext } from "@/lib/league-context";
import { readRecap, publishRecap } from "@/lib/recap-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      week?: number;
      leagueId?: string;
      season?: string;
    };

    const week = body.week;
    if (!week || typeof week !== "number" || week < 1) {
      return NextResponse.json({ error: "Valid week number is required" }, { status: 400 });
    }

    const leagueId = body.leagueId ?? getLeagueId();
    const season = body.season;
    const context = await getLeagueContext({ leagueId, season });
    const existing = await readRecap(context.league.leagueId, context.league.season, week);

    if (!existing) {
      return NextResponse.json(
        { error: "No recap found for this week. Generate a draft first." },
        { status: 404 }
      );
    }

    if (existing.state === "PUBLISHED") {
      return NextResponse.json(
        { error: "Recap is already published. Regenerate to create a new draft." },
        { status: 409 }
      );
    }

    await publishRecap(context.league.leagueId, context.league.season, week);

    return NextResponse.json({ ok: true, state: "PUBLISHED" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
