import { NextResponse } from "next/server";
import { getLeagueContext } from "@/lib/league-context";
import { parseLeagueParams, apiErrorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { leagueId, season } = parseLeagueParams(request);
    const context = await getLeagueContext({ leagueId, season });
    return NextResponse.json({
      league: context.league,
      members: context.members,
      availableSeasons: context.availableSeasons,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
