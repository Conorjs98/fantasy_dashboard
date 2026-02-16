import OpenAI from "openai";
import type { WeeklyRecapMatchup, PersistedMatchupSummary } from "@/lib/types";

interface GenerateRecapResult {
  weekSummary: string;
  matchupSummaries: PersistedMatchupSummary[];
}

interface LLMMatchupInput {
  matchupId: number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  margin: number;
  tags: string[];
}

function buildPrompt(
  week: number,
  season: string,
  matchups: LLMMatchupInput[],
  personalityNotes: string
): string {
  const matchupLines = matchups
    .map(
      (m) =>
        `- Matchup ${m.matchupId}: ${m.teamA} (${m.scoreA}) vs ${m.teamB} (${m.scoreB}) | Winner: ${m.winner ?? "Tie"} | Margin: ${m.margin.toFixed(2)} | Tags: ${m.tags.join(", ") || "none"}`
    )
    .join("\n");

  return `You are a witty, entertaining fantasy football league recap writer. Write a recap for Week ${week} of the ${season} season.

${personalityNotes ? `Personality/style notes from the commissioner: ${personalityNotes}\n` : ""}
Here are the matchups:
${matchupLines}

Respond with a JSON object containing:
1. "weekSummary": A 2-4 sentence overview of the week's action. Be engaging, reference specific results, and highlight the most interesting storylines.
2. "matchupSummaries": An array of objects, each with "matchupId" (number) and "summary" (string, 1-2 sentences about that specific matchup). Cover every matchup.

Keep the tone fun and light. Reference managers by their team names. Do not use hashtags.`;
}

export async function generateRecap(
  week: number,
  season: string,
  matchups: WeeklyRecapMatchup[],
  personalityNotes: string
): Promise<GenerateRecapResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const llmMatchups: LLMMatchupInput[] = matchups.map((m) => ({
    matchupId: m.matchupId,
    teamA: m.a.teamName || m.a.displayName,
    teamB: m.b.teamName || m.b.displayName,
    scoreA: m.a.score,
    scoreB: m.b.score,
    winner: m.winnerRosterId === m.a.rosterId
      ? (m.a.teamName || m.a.displayName)
      : m.winnerRosterId === m.b.rosterId
        ? (m.b.teamName || m.b.displayName)
        : null,
    margin: Math.abs(m.a.score - m.b.score),
    tags: m.tags.map((t) => t.label),
  }));

  const prompt = buildPrompt(week, season, llmMatchups, personalityNotes);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content) as {
    weekSummary?: string;
    matchupSummaries?: { matchupId?: number; summary?: string }[];
  };

  if (!parsed.weekSummary || !Array.isArray(parsed.matchupSummaries)) {
    throw new Error("Invalid response shape from OpenAI");
  }

  return {
    weekSummary: parsed.weekSummary,
    matchupSummaries: parsed.matchupSummaries
      .filter(
        (s): s is { matchupId: number; summary: string } =>
          typeof s.matchupId === "number" && typeof s.summary === "string"
      )
      .map((s) => ({ matchupId: s.matchupId, summary: s.summary })),
  };
}
