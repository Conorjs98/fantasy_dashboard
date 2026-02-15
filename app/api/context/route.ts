import { NextResponse } from "next/server";
import { getLeagueContext } from "@/lib/league-context";
import { getLeagueId } from "@/lib/config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const season = searchParams.get("season") ?? undefined;

    const context = await getLeagueContext({ leagueId, season });
    return NextResponse.json({
      league: context.league,
      members: context.members,
      availableSeasons: context.availableSeasons,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
