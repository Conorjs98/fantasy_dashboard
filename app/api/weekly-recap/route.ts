import { NextResponse } from "next/server";
import { getMatchups } from "@/lib/sleeper";
import { getLeagueId } from "@/lib/config";
import { WEEKLY_RECAP_THRESHOLDS } from "@/lib/config";
import { getLeagueContext } from "@/lib/league-context";
import type {
  WeeklyRecapHighlight,
  WeeklyRecapMatchup,
  WeeklyRecapParticipant,
  WeeklyRecapTag,
} from "@/lib/types";

function normalizeScore(points: number | null | undefined): number {
  return Math.round((points ?? 0) * 100) / 100;
}

function toParticipant(
  rosterId: number,
  score: number,
  member: {
    rosterId: number;
    userId: string;
    displayName: string;
    teamName: string;
    avatar: string | null;
  } | undefined
): WeeklyRecapParticipant {
  return {
    rosterId,
    userId: member?.userId ?? "",
    displayName: member?.displayName ?? `Team ${rosterId}`,
    teamName: member?.teamName ?? `Team ${rosterId}`,
    avatar: member?.avatar ?? null,
    score,
  };
}

function getMatchupTags(aScore: number, bScore: number): WeeklyRecapTag[] {
  const tags: WeeklyRecapTag[] = [];
  const margin = Math.abs(aScore - bScore);

  if (margin < WEEKLY_RECAP_THRESHOLDS.CLOSE_MARGIN_LT) {
    tags.push({ type: "close", label: "Close", emoji: "🔥" });
  } else if (margin > WEEKLY_RECAP_THRESHOLDS.BLOWOUT_MARGIN_GT) {
    tags.push({ type: "blowout", label: "Blowout", emoji: "💥" });
  }

  if (
    aScore > WEEKLY_RECAP_THRESHOLDS.SHOOTOUT_SCORE_GT &&
    bScore > WEEKLY_RECAP_THRESHOLDS.SHOOTOUT_SCORE_GT
  ) {
    tags.push({ type: "shootout", label: "Shootout", emoji: "🚀" });
  } else if (
    aScore < WEEKLY_RECAP_THRESHOLDS.SNOOZEFEST_SCORE_LT &&
    bScore < WEEKLY_RECAP_THRESHOLDS.SNOOZEFEST_SCORE_LT
  ) {
    tags.push({ type: "snoozefest", label: "Snoozefest", emoji: "😴" });
  }

  return tags;
}

function toHighlights(matchups: WeeklyRecapMatchup[]): WeeklyRecapHighlight[] {
  if (matchups.length === 0) return [];

  const byMarginAscending = [...matchups].sort(
    (left, right) => Math.abs(left.a.score - left.b.score) - Math.abs(right.a.score - right.b.score)
  );
  const byMarginDescending = [...matchups].sort(
    (left, right) => Math.abs(right.a.score - right.b.score) - Math.abs(left.a.score - left.b.score)
  );

  const participants = matchups.flatMap((matchup) => [
    { matchupId: matchup.matchupId, player: matchup.a, opponent: matchup.b },
    { matchupId: matchup.matchupId, player: matchup.b, opponent: matchup.a },
  ]);
  const highScore = [...participants].sort((left, right) => right.player.score - left.player.score)[0];
  const lowScore = [...participants].sort((left, right) => left.player.score - right.player.score)[0];

  const gameOfTheWeekMatchup = byMarginAscending[0];
  const beatdownMatchup = byMarginDescending[0];
  const gameWinner =
    gameOfTheWeekMatchup.a.score >= gameOfTheWeekMatchup.b.score
      ? gameOfTheWeekMatchup.a
      : gameOfTheWeekMatchup.b;
  const gameLoser = gameWinner.rosterId === gameOfTheWeekMatchup.a.rosterId
    ? gameOfTheWeekMatchup.b
    : gameOfTheWeekMatchup.a;
  const beatdownWinner =
    beatdownMatchup.a.score >= beatdownMatchup.b.score ? beatdownMatchup.a : beatdownMatchup.b;
  const beatdownLoser =
    beatdownWinner.rosterId === beatdownMatchup.a.rosterId ? beatdownMatchup.b : beatdownMatchup.a;

  return [
    {
      type: "game_of_the_week",
      label: "Game of the Week",
      emoji: "🎯",
      matchupId: gameOfTheWeekMatchup.matchupId,
      winnerName: gameWinner.displayName,
      loserName: gameLoser.displayName,
      winnerScore: gameWinner.score,
      loserScore: gameLoser.score,
      value: Math.abs(gameOfTheWeekMatchup.a.score - gameOfTheWeekMatchup.b.score),
      valueLabel: `${Math.abs(gameOfTheWeekMatchup.a.score - gameOfTheWeekMatchup.b.score).toFixed(2)} margin`,
    },
    {
      type: "beatdown",
      label: "Beatdown",
      emoji: "🥊",
      matchupId: beatdownMatchup.matchupId,
      winnerName: beatdownWinner.displayName,
      loserName: beatdownLoser.displayName,
      winnerScore: beatdownWinner.score,
      loserScore: beatdownLoser.score,
      value: Math.abs(beatdownMatchup.a.score - beatdownMatchup.b.score),
      valueLabel: `${Math.abs(beatdownMatchup.a.score - beatdownMatchup.b.score).toFixed(2)} margin`,
    },
    {
      type: "high_score",
      label: "High Score",
      emoji: "🚨",
      matchupId: highScore.matchupId,
      winnerName: highScore.player.displayName,
      loserName: highScore.opponent.displayName,
      winnerScore: highScore.player.score,
      loserScore: highScore.opponent.score,
      value: highScore.player.score,
      valueLabel: `${highScore.player.score.toFixed(2)} points`,
    },
    {
      type: "low_score",
      label: "Low Score",
      emoji: "🧊",
      matchupId: lowScore.matchupId,
      winnerName: lowScore.player.displayName,
      loserName: lowScore.opponent.displayName,
      winnerScore: lowScore.player.score,
      loserScore: lowScore.opponent.score,
      value: lowScore.player.score,
      valueLabel: `${lowScore.player.score.toFixed(2)} points`,
    },
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId") ?? getLeagueId();
    const season = searchParams.get("season") ?? undefined;
    const rawWeek = searchParams.get("week");
    const requestedWeek = rawWeek ? parseInt(rawWeek, 10) : null;

    if (rawWeek && (requestedWeek === null || Number.isNaN(requestedWeek) || requestedWeek < 1)) {
      return NextResponse.json({ error: "Invalid week number" }, { status: 400 });
    }

    const context = await getLeagueContext({ leagueId, season });
    const maxWeek = Math.max(context.league.totalWeeks, context.league.currentWeek);
    const week = requestedWeek ?? context.league.currentWeek;

    if (week > maxWeek) {
      return NextResponse.json(
        { error: `Week must be between 1 and ${maxWeek}` },
        { status: 400 }
      );
    }

    const matchups = await getMatchups(context.league.leagueId, week);
    const membersByRosterId = new Map(context.members.map((member) => [member.rosterId, member]));

    const grouped = new Map<number, typeof matchups>();
    for (const matchup of matchups) {
      const group = grouped.get(matchup.matchup_id) ?? [];
      group.push(matchup);
      grouped.set(matchup.matchup_id, group);
    }

    const recapMatchups: WeeklyRecapMatchup[] = [];

    for (const [matchupId, group] of grouped) {
      if (group.length !== 2) continue;

      const [first, second] = group;
      const aScore = normalizeScore(first.points);
      const bScore = normalizeScore(second.points);
      const a = toParticipant(first.roster_id, aScore, membersByRosterId.get(first.roster_id));
      const b = toParticipant(second.roster_id, bScore, membersByRosterId.get(second.roster_id));

      const aWon = a.score > b.score;
      const bWon = b.score > a.score;

      recapMatchups.push({
        matchupId,
        a,
        b,
        winnerUserId: aWon ? a.userId : bWon ? b.userId : null,
        loserUserId: aWon ? b.userId : bWon ? a.userId : null,
        winnerRosterId: aWon ? a.rosterId : bWon ? b.rosterId : null,
        loserRosterId: aWon ? b.rosterId : bWon ? a.rosterId : null,
        summary: "Recap coming soon...",
        tags: getMatchupTags(a.score, b.score),
      });
    }

    recapMatchups.sort((left, right) => left.matchupId - right.matchupId);
    const highlights = toHighlights(recapMatchups);

    return NextResponse.json({
      leagueId: context.league.leagueId,
      season: context.league.season,
      week,
      matchups: recapMatchups,
      highlights,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
