import { getDb } from "@/lib/db";
import type { PersistedRecap, RecapState } from "@/lib/types";

interface RecapRow {
  league_id: string;
  season: string;
  week: number;
  state: string;
  week_summary: string;
  matchup_summaries: string;
  personality_notes: string;
  generated_at: string;
  published_at: string | null;
}

function rowToRecap(row: RecapRow): PersistedRecap {
  return {
    leagueId: row.league_id,
    season: row.season,
    week: row.week,
    state: row.state as RecapState,
    weekSummary: row.week_summary,
    matchupSummaries:
      typeof row.matchup_summaries === "string"
        ? JSON.parse(row.matchup_summaries)
        : row.matchup_summaries,
    personalityNotes: row.personality_notes,
    generatedAt: row.generated_at,
    publishedAt: row.published_at,
  };
}

export async function readRecap(
  leagueId: string,
  season: string,
  week: number
): Promise<PersistedRecap | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM recaps
    WHERE league_id = ${leagueId} AND season = ${season} AND week = ${week}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rowToRecap(rows[0] as unknown as RecapRow);
}

export async function writeRecap(recap: PersistedRecap): Promise<void> {
  const sql = getDb();
  const summariesJson = JSON.stringify(recap.matchupSummaries);
  await sql`
    INSERT INTO recaps (league_id, season, week, state, week_summary, matchup_summaries, personality_notes, generated_at, published_at)
    VALUES (${recap.leagueId}, ${recap.season}, ${recap.week}, ${recap.state}, ${recap.weekSummary}, ${summariesJson}::jsonb, ${recap.personalityNotes}, ${recap.generatedAt}, ${recap.publishedAt})
    ON CONFLICT (league_id, season, week)
    DO UPDATE SET
      state = EXCLUDED.state,
      week_summary = EXCLUDED.week_summary,
      matchup_summaries = EXCLUDED.matchup_summaries,
      personality_notes = EXCLUDED.personality_notes,
      generated_at = EXCLUDED.generated_at,
      published_at = EXCLUDED.published_at
  `;
}

export async function publishRecap(
  leagueId: string,
  season: string,
  week: number
): Promise<PersistedRecap | null> {
  const sql = getDb();
  const rows = await sql`
    UPDATE recaps
    SET state = 'PUBLISHED', published_at = NOW()
    WHERE league_id = ${leagueId} AND season = ${season} AND week = ${week}
    RETURNING *
  `;
  if (rows.length === 0) return null;
  return rowToRecap(rows[0] as unknown as RecapRow);
}

