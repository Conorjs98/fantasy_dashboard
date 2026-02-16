import { NextResponse } from "next/server";
import { getLeagueId } from "./config";

export function parseLeagueParams(request: Request) {
  const { searchParams } = new URL(request.url);
  return {
    leagueId: searchParams.get("leagueId") ?? getLeagueId(),
    season: searchParams.get("season") ?? undefined,
    searchParams,
  };
}

export function apiErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message.includes("not found") ? 404 : 500;
  return NextResponse.json({ error: message }, { status });
}
