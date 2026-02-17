import { getDb } from "@/lib/db";
import type { ManagerNote } from "@/lib/types";

interface ManagerNoteRow {
  league_id: string;
  season: string;
  user_id: string;
  notes: string;
  updated_at: string;
}

function rowToManagerNote(row: ManagerNoteRow): ManagerNote {
  return {
    leagueId: row.league_id,
    season: row.season,
    userId: row.user_id,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export async function readAllManagerNotes(
  leagueId: string,
  season: string
): Promise<ManagerNote[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT league_id, season, user_id, notes, updated_at
    FROM manager_notes
    WHERE league_id = ${leagueId} AND season = ${season}
    ORDER BY user_id ASC
  `;

  return rows.map((row) => rowToManagerNote(row as unknown as ManagerNoteRow));
}

export async function upsertManagerNote(
  leagueId: string,
  season: string,
  userId: string,
  notes: string
): Promise<ManagerNote> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO manager_notes (league_id, season, user_id, notes, updated_at)
    VALUES (${leagueId}, ${season}, ${userId}, ${notes}, NOW())
    ON CONFLICT (league_id, season, user_id)
    DO UPDATE SET
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING league_id, season, user_id, notes, updated_at
  `;

  return rowToManagerNote(rows[0] as unknown as ManagerNoteRow);
}
