import OpenAI from "openai";
import type {
  WeeklyRecapMatchup,
  PersistedMatchupSummary,
  ManagerContextPack,
} from "@/lib/types";

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
  teamAContext: ManagerContextPack | null;
  teamBContext: ManagerContextPack | null;
}

function resolvePrivateStyleExamples(): string {
  const direct = process.env.RECAP_STYLE_EXAMPLES?.trim();
  if (direct) return direct;

  const base64 = process.env.RECAP_STYLE_EXAMPLES_B64?.trim();
  if (!base64) return "";

  try {
    return Buffer.from(base64, "base64").toString("utf8").trim();
  } catch {
    return "";
  }
}

function buildPrompt(
  week: number,
  season: string,
  matchups: LLMMatchupInput[],
  personalityNotes: string,
  privateStyleExamples: string
): string {
  const matchupLines = matchups
    .map((m) => {
      const teamALine = m.teamAContext
        ? `A context: notes="${m.teamAContext.personalityNotes || "none"}"; weeklyScore=${m.teamAContext.weeklyScore}; starterCount=${m.teamAContext.starterCount}; topStarter=${m.teamAContext.topStarterName} (${m.teamAContext.topStarterScore.toFixed(2)}); bottomStarter=${m.teamAContext.bottomStarterName} (${m.teamAContext.bottomStarterScore.toFixed(2)}); trades=${m.teamAContext.trades.map((trade) => `(+ ${trade.acquiredPlayers.join(", ") || "none"} | - ${trade.droppedPlayers.join(", ") || "none"})`).join("; ") || "none"}`
        : "A context: unavailable";
      const teamBLine = m.teamBContext
        ? `B context: notes="${m.teamBContext.personalityNotes || "none"}"; weeklyScore=${m.teamBContext.weeklyScore}; starterCount=${m.teamBContext.starterCount}; topStarter=${m.teamBContext.topStarterName} (${m.teamBContext.topStarterScore.toFixed(2)}); bottomStarter=${m.teamBContext.bottomStarterName} (${m.teamBContext.bottomStarterScore.toFixed(2)}); trades=${m.teamBContext.trades.map((trade) => `(+ ${trade.acquiredPlayers.join(", ") || "none"} | - ${trade.droppedPlayers.join(", ") || "none"})`).join("; ") || "none"}`
        : "B context: unavailable";

      return `- Matchup ${m.matchupId}: ${m.teamA} (${m.scoreA}) vs ${m.teamB} (${m.scoreB}) | Winner: ${m.winner ?? "Tie"} | Margin: ${m.margin.toFixed(2)} | Tags: ${m.tags.join(", ") || "none"}\n  ${teamALine}\n  ${teamBLine}`;
    })
    .join("\n");

  return `You are an R-rated fantasy football roast writer. Write a recap for Week ${week} of the ${season} season.

${personalityNotes ? `Personality/style notes from the commissioner: ${personalityNotes}\n` : ""}
${privateStyleExamples ? `Private commissioner examples to mirror in voice and cadence (do not copy lines verbatim; adapt the tone):\n${privateStyleExamples}\n` : ""}
Here are the matchups:
${matchupLines}

Respond with a JSON object containing:
1. "weekSummary": One to two paragraphs (4-10 sentences total) covering major storylines, biggest beatdowns, and close calls with specific scores/margins.
2. "matchupSummaries": An array of objects, each with "matchupId" (number) and "summary" (string, one to two paragraphs, 3-8 sentences, about that specific matchup). Cover every matchup.

Style rules:
- Target an R-rated locker-room roast tone: vulgar, ruthless, and funny.
- Roast losers aggressively; praise winners with swagger and attitude.
- Use manager notes and context details as fuel. Keep it specific, not generic.
- Reference managers by their fantasy team names.
- Mention real player names from starter/trade context when available, and never invent player names.
- Do not use hashtags.
- Do not include slurs targeting protected classes, sexual content involving minors, or threats of violence.`;
}

export async function generateRecap(
  week: number,
  season: string,
  matchups: WeeklyRecapMatchup[],
  personalityNotes: string,
  managerPacks: Map<number, ManagerContextPack>
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
    teamAContext: managerPacks.get(m.a.rosterId) ?? null,
    teamBContext: managerPacks.get(m.b.rosterId) ?? null,
  }));

  const privateStyleExamples = resolvePrivateStyleExamples();
  const prompt = buildPrompt(
    week,
    season,
    llmMatchups,
    personalityNotes,
    privateStyleExamples
  );

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 1,
    presence_penalty: 0.5,
    frequency_penalty: 0.2,
    max_tokens: 4500,
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
