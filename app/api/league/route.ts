import { NextResponse } from "next/server";
import { getLeagueContext } from "@/lib/league-context";
import { parseLeagueParams, apiErrorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { leagueId, season } = parseLeagueParams(request);
    const context = await getLeagueContext({ leagueId, season });
    return NextResponse.json(context.league);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
