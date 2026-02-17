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
);

CREATE TABLE IF NOT EXISTS manager_notes (
  id          SERIAL PRIMARY KEY,
  league_id   TEXT NOT NULL,
  season      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  notes       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, season, user_id)
);
