import { NextResponse } from "next/server";

// TODO: [luck] Implement expected-vs-actual wins analysis
//
// This route should:
// 1. Accept GET ?week=N&leagueId=XXX
// 2. Fetch all matchups up to the given week
// 3. For each week, compute "all-play" record: how many teams each manager
//    would have beaten that week (based on points scored)
// 4. Sum all-play wins across weeks → expected wins
// 5. Compare expected wins to actual wins → luck index
//    luckIndex = actualWins - expectedWins (positive = lucky)
// 6. Return sorted list: { rosterId, manager, expectedWins, actualWins, luckIndex }[]
//
// This helps identify managers who have been lucky (winning despite low
// scoring) vs unlucky (losing despite high scoring).

export async function GET() {
  return NextResponse.json(
    { error: "Luck analysis not yet implemented" },
    { status: 501 }
  );
}
