import { NextResponse } from "next/server";

// TODO: [roast] Implement LLM-powered matchup roasts
//
// This route should:
// 1. Accept POST { week: number, leagueId?: string }
// 2. Fetch matchup data for the given week via getMatchups()
// 3. Map roster_ids to manager names via getUsers() + getRosters()
// 4. Build a prompt with matchup results (winner/loser, scores, margins)
// 5. Call an LLM (e.g. Anthropic Claude) with the prompt
// 6. Return the generated roast text
//
// Env vars needed: LLM_API_KEY, LLM_MODEL (optional)
//
// Example request body:
// { "week": 5, "leagueId": "123456789" }
//
// Example response:
// { "roast": "...", "week": 5 }

export async function POST() {
  return NextResponse.json(
    { error: "Roast feature not yet implemented" },
    { status: 501 }
  );
}
