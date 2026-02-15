import { NextResponse } from "next/server";
import { getMatchups } from "@/lib/sleeper";
import { getLeagueId } from "@/lib/config";

export async function GET(
  request: Request,
  { params }: { params: { week: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const week = parseInt(params.week, 10);

    if (isNaN(week) || week < 1) {
      return NextResponse.json(
        { error: "Invalid week number" },
        { status: 400 }
      );
    }

    const matchups = await getMatchups(leagueId, week);
    return NextResponse.json(matchups);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
