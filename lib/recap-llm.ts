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

interface RecapJsonResponse {
  weekSummary?: string;
  matchupSummaries?: { matchupId?: number; summary?: string }[];
}

interface StyleGuideResponse {
  styleGuide?: unknown;
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

const MODEL_NAME = "gpt-4o";
const DRAFT_CANDIDATE_COUNT = 3;
const WRITER_TEMPERATURE = 0.68;
const JUDGE_TEMPERATURE = 0.2;
const STYLE_GUIDE_TEMPERATURE = 0.2;
const WRITER_MAX_TOKENS = 4500;
const JUDGE_MAX_TOKENS = 400;
const STYLE_GUIDE_MAX_TOKENS = 700;

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

function buildMatchupLines(matchups: LLMMatchupInput[]): string {
  return matchups
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
}

function buildOutputContract(matchupCount: number): string {
  return `Respond with a JSON object containing:
1. "weekSummary": One to two paragraphs (4-10 sentences total) covering major storylines, biggest beatdowns, and close calls with specific scores/margins.
2. "matchupSummaries": An array of exactly ${matchupCount} objects, each with "matchupId" (number) and "summary" (string, one to two paragraphs, 3-8 sentences, about that specific matchup). Cover every matchup exactly once.`;
}

function buildStyleRules(): string {
  return `Style rules:
- Target an R-rated locker-room roast tone: vulgar, ruthless, and funny.
- Roast losers aggressively; praise winners with swagger and attitude.
- No cliche jokes.
- No repeated insult patterns across matchups.
- Every matchup summary must cite concrete matchup facts from the provided data (scores, margin, winner, tags, players, trades, or manager notes).
- Reference managers by their fantasy team names.
- Mention real player names from starter/trade context when available, and never invent player names.
- Do not use hashtags.`;
}

function buildDraftPrompt(
  week: number,
  season: string,
  matchups: LLMMatchupInput[],
  personalityNotes: string,
  privateStyleExamples: string,
  styleGuide: string
): string {
  const matchupLines = buildMatchupLines(matchups);

  return `You are an R-rated fantasy football roast writer. Write a recap for Week ${week} of the ${season} season.

${personalityNotes ? `Personality/style notes from the commissioner: ${personalityNotes}\n` : ""}
${privateStyleExamples ? `Private commissioner examples to mirror in voice and cadence (do not copy lines verbatim; adapt the tone):\n${privateStyleExamples}\n` : ""}
${styleGuide ? `Distilled style guide (treat this as a hard style anchor):\n${styleGuide}\n` : ""}
Here are the matchups:
${matchupLines}

${buildOutputContract(matchups.length)}

${buildStyleRules()}`;
}

function buildRewritePrompt(
  week: number,
  season: string,
  matchups: LLMMatchupInput[],
  draftJson: string,
  styleGuide: string
): string {
  const matchupLines = buildMatchupLines(matchups);

  return `You are polishing a Week ${week} ${season} fantasy football roast recap draft.

Matchup facts (authoritative):
${matchupLines}

Draft JSON to rewrite:
${draftJson}

Task:
- Rewrite this recap to be sharper and funnier without becoming corny.
- Keep all factual claims anchored to provided matchup facts.
- Remove cliche jokes, generic sex metaphors, and repeated insult formulas.
- Strongly enforce the distilled style guide and preserve that voice consistently.
- Keep output as JSON only and preserve the same schema and matchupId mapping.

${styleGuide ? `Distilled style guide (hard style anchor):\n${styleGuide}\n` : ""}
${buildOutputContract(matchups.length)}

${buildStyleRules()}`;
}

function buildJudgePrompt(
  candidates: GenerateRecapResult[],
  matchups: LLMMatchupInput[],
  privateStyleExamples: string,
  styleGuide: string
): string {
  const matchupLines = buildMatchupLines(matchups);
  const candidateLines = candidates
    .map((candidate, idx) => `Candidate ${idx + 1}:\n${JSON.stringify(candidate)}`)
    .join("\n\n");

  return `You are judging fantasy roast recap quality. Pick the best candidate.

Matchup facts (authoritative):
${matchupLines}

${privateStyleExamples ? `Private commissioner style examples (use for voice-matching only, never copied literally):\n${privateStyleExamples}\n` : ""}
${styleGuide ? `Distilled style guide:\n${styleGuide}\n` : ""}
Candidates:
${candidateLines}

Weighted scoring rubric:
- 35% Specificity and factual grounding in matchup data.
- 30% Voice/cadence alignment with private examples and distilled style guide.
- 20% R-rated roast sharpness without corny/cliche phrasing.
- 10% Variety in insults and voice across matchups (no repetitive templates).
- 5% Readability and punch.

Return JSON only:
{
  "winnerIndex": number, // 1-based index
  "reason": string
}`;
}

function buildFallbackWeekSummary(matchups: LLMMatchupInput[]): string {
  if (matchups.length === 0) return "No matchups were available for recap generation.";

  let highest: LLMMatchupInput | null = null;
  let lowest: LLMMatchupInput | null = null;
  let closest: LLMMatchupInput | null = null;

  for (const matchup of matchups) {
    if (!highest || matchup.scoreA + matchup.scoreB > highest.scoreA + highest.scoreB) {
      highest = matchup;
    }
    if (!lowest || matchup.scoreA + matchup.scoreB < lowest.scoreA + lowest.scoreB) {
      lowest = matchup;
    }
    if (!closest || matchup.margin < closest.margin) {
      closest = matchup;
    }
  }

  return `Week action was volatile: ${closest?.teamA ?? "Team A"} vs ${closest?.teamB ?? "Team B"} was the tightest fight at a ${closest?.margin.toFixed(2) ?? "0.00"}-point margin. The highest-scoring game was ${highest?.teamA ?? "Team A"} vs ${highest?.teamB ?? "Team B"} (${(highest?.scoreA ?? 0) + (highest?.scoreB ?? 0)} total points), while ${lowest?.teamA ?? "Team A"} vs ${lowest?.teamB ?? "Team B"} stayed in the mud at ${(lowest?.scoreA ?? 0) + (lowest?.scoreB ?? 0)}.`;
}

function buildFallbackMatchupSummary(matchup: LLMMatchupInput): string {
  if (!matchup.winner) {
    return `${matchup.teamA} and ${matchup.teamB} deadlocked at ${matchup.scoreA}-${matchup.scoreB}, which means neither side had the nerve to close. A tie with ${matchup.tags.join(", ") || "no tag context"} is the fantasy version of talking loud and doing nothing.`;
  }

  const loser = matchup.winner === matchup.teamA ? matchup.teamB : matchup.teamA;
  return `${matchup.winner} handled ${loser} ${matchup.scoreA}-${matchup.scoreB} with a ${matchup.margin.toFixed(2)}-point gap. Tags: ${matchup.tags.join(", ") || "none"}. ${loser} got outplayed and has no excuses after that scoreboard.`;
}

function parseRecapResult(
  content: string,
  expectedMatchupIds: number[],
  matchupsById: Map<number, LLMMatchupInput>
): GenerateRecapResult {
  const parsed = JSON.parse(content) as RecapJsonResponse;
  if (!Array.isArray(parsed.matchupSummaries)) {
    throw new Error("Invalid response shape from OpenAI");
  }

  const summariesById = new Map<number, string>();
  for (const summary of parsed.matchupSummaries) {
    if (typeof summary.matchupId !== "number" || typeof summary.summary !== "string") continue;
    if (!summariesById.has(summary.matchupId)) {
      summariesById.set(summary.matchupId, summary.summary.trim());
    }
  }

  const orderedSummaries: PersistedMatchupSummary[] = [];
  for (const matchupId of expectedMatchupIds) {
    const summary = summariesById.get(matchupId);
    if (!summary) {
      const matchup = matchupsById.get(matchupId);
      if (!matchup) {
        orderedSummaries.push({
          matchupId,
          summary: "Recap unavailable for this matchup.",
        });
        continue;
      }
      orderedSummaries.push({
        matchupId,
        summary: buildFallbackMatchupSummary(matchup),
      });
      continue;
    }
    orderedSummaries.push({ matchupId, summary });
  }

  const weekSummary =
    typeof parsed.weekSummary === "string" && parsed.weekSummary.trim().length > 0
      ? parsed.weekSummary.trim()
      : buildFallbackWeekSummary(expectedMatchupIds.map((id) => matchupsById.get(id)).filter((m): m is LLMMatchupInput => Boolean(m)));

  return {
    weekSummary,
    matchupSummaries: orderedSummaries,
  };
}

async function callJsonCompletion(
  client: OpenAI,
  prompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}

function parseStyleGuide(content: string): string {
  const parsed = JSON.parse(content) as StyleGuideResponse;
  const raw = parsed.styleGuide;
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    return raw
      .filter((item: unknown): item is string => typeof item === "string")
      .join("\n")
      .trim();
  }
  if (raw && typeof raw === "object") {
    try {
      return JSON.stringify(raw).trim();
    } catch {
      return "";
    }
  }
  return "";
}

function buildStyleGuidePrompt(privateStyleExamples: string, personalityNotes: string): string {
  return `You are building a compact style guide for a fantasy football roast writer.

Commissioner personality notes:
${personalityNotes || "none"}

Private writing examples:
${privateStyleExamples}

Task:
- Distill the examples into an actionable voice guide.
- Capture cadence, sentence rhythm, insult style, humor style, and "do/don't" patterns.
- Prioritize punchy specificity over generic jokes.
- Keep it concise but concrete.

Return JSON only:
{
  "styleGuide": "..."
}`;
}

async function buildStyleGuide(
  client: OpenAI,
  privateStyleExamples: string,
  personalityNotes: string
): Promise<string> {
  if (!privateStyleExamples) return "";
  const prompt = buildStyleGuidePrompt(privateStyleExamples, personalityNotes);
  const content = await callJsonCompletion(
    client,
    prompt,
    STYLE_GUIDE_TEMPERATURE,
    STYLE_GUIDE_MAX_TOKENS
  );
  return parseStyleGuide(content);
}

async function generateRewrittenCandidate(
  client: OpenAI,
  week: number,
  season: string,
  matchups: LLMMatchupInput[],
  personalityNotes: string,
  privateStyleExamples: string,
  styleGuide: string,
  matchupsById: Map<number, LLMMatchupInput>,
  expectedMatchupIds: number[]
): Promise<GenerateRecapResult> {
  const draftPrompt = buildDraftPrompt(
    week,
    season,
    matchups,
    personalityNotes,
    privateStyleExamples,
    styleGuide
  );
  const draftContent = await callJsonCompletion(
    client,
    draftPrompt,
    WRITER_TEMPERATURE,
    WRITER_MAX_TOKENS
  );
  const rewrittenPrompt = buildRewritePrompt(
    week,
    season,
    matchups,
    draftContent,
    styleGuide
  );
  const rewrittenContent = await callJsonCompletion(
    client,
    rewrittenPrompt,
    WRITER_TEMPERATURE,
    WRITER_MAX_TOKENS
  );
  return parseRecapResult(rewrittenContent, expectedMatchupIds, matchupsById);
}

async function pickBestCandidate(
  client: OpenAI,
  candidates: GenerateRecapResult[],
  matchups: LLMMatchupInput[],
  privateStyleExamples: string,
  styleGuide: string
): Promise<GenerateRecapResult> {
  const judgePrompt = buildJudgePrompt(
    candidates,
    matchups,
    privateStyleExamples,
    styleGuide
  );
  const judgeContent = await callJsonCompletion(
    client,
    judgePrompt,
    JUDGE_TEMPERATURE,
    JUDGE_MAX_TOKENS
  );
  const parsed = JSON.parse(judgeContent) as { winnerIndex?: number };
  const winnerIndex = (parsed.winnerIndex ?? 1) - 1;
  if (winnerIndex < 0 || winnerIndex >= candidates.length) return candidates[0];
  return candidates[winnerIndex];
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
  const matchupsById = new Map(llmMatchups.map((matchup) => [matchup.matchupId, matchup]));
  const styleGuide = await buildStyleGuide(
    client,
    privateStyleExamples,
    personalityNotes
  );
  const expectedMatchupIds = llmMatchups.map((matchup) => matchup.matchupId);
  const candidates = await Promise.all(
    Array.from({ length: DRAFT_CANDIDATE_COUNT }, () =>
      generateRewrittenCandidate(
        client,
        week,
        season,
        llmMatchups,
        personalityNotes,
        privateStyleExamples,
        styleGuide,
        matchupsById,
        expectedMatchupIds
      )
    )
  );

  return pickBestCandidate(
    client,
    candidates,
    llmMatchups,
    privateStyleExamples,
    styleGuide
  );
}
