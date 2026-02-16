import { neon } from "@neondatabase/serverless";

function getDbUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL env var is required");
  return url;
}

export function getDb() {
  return neon(getDbUrl());
}

export async function initDb(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS recaps (
      id                SERIAL PRIMARY KEY,
      league_id         TEXT NOT NULL,
      season            TEXT NOT NULL,
      week              INTEGER NOT NULL,
      state             TEXT NOT NULL DEFAULT 'DRAFT',
      week_summary      TEXT NOT NULL DEFAULT '',
      matchup_summaries JSONB NOT NULL DEFAULT '[]',
      personality_notes TEXT NOT NULL DEFAULT '',
      generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at      TIMESTAMPTZ,
      UNIQUE(league_id, season, week)
    )
  `;
}
