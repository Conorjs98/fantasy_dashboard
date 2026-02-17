# Fantasy Dashboard

A terminal-aesthetic fantasy football leaderboard powered by the Sleeper API. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Features

- **Weekly Recap** — AI-generated matchup recaps with commissioner-controlled draft/publish flow
- **Power Rankings** — Composite score (0–100) based on win percentage and normalized points-for
- **Time Controls** — View rankings for the current week, any specific week, or the full season
- **Season History** — Switch between seasons via dropdown
- **Podium Widget** — Top 3 managers displayed in podium format
- **PF Distribution** — Horizontal bar chart showing each manager's share of total points

## Setup

1. **Clone and install:**

   ```bash
   git clone <repo-url>
   cd fantasy-dashboard
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set the required variables:

   ```
   SLEEPER_LEAGUE_ID=your_league_id_here
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://...
   RECAP_STYLE_EXAMPLES_B64=...
   ```

   - `SLEEPER_LEAGUE_ID` — Find your league ID in the Sleeper app URL or league settings
   - `OPENAI_API_KEY` — Required for AI recap generation ([platform.openai.com](https://platform.openai.com))
   - `DATABASE_URL` — Neon Postgres connection string (see Database Setup below)
   - `RECAP_STYLE_EXAMPLES_B64` — Optional private roast style examples (base64-encoded) used to steer recap voice without committing text to Git

3. **Set up the database:**

   Create a [Neon](https://neon.tech) Postgres database (free tier works), then add the connection string to `.env.local` as `DATABASE_URL`. Run the migration to create the `recaps` and `manager_notes` tables:

   ```bash
   npx -y dotenv-cli -e .env.local -- npx tsx lib/db/setup.ts
   ```

4. **Run locally:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables: `SLEEPER_LEAGUE_ID`, `OPENAI_API_KEY`
   - Optional: add `RECAP_STYLE_EXAMPLES_B64` in Vercel Project Settings -> Environment Variables for private tone examples
4. Add a Neon Postgres database via Vercel Storage (or link an existing one) — this auto-sets `DATABASE_URL`
5. Run `npx -y dotenv-cli -e .env.local -- npx tsx lib/db/setup.ts` after first deploy (or use `vercel env pull .env.local` locally and run it from there)
6. Deploy

## Power Ranking Algorithm

```
powerScore = (winPct * 0.5 + normalizedPF * 0.5) * 100
```

- `winPct` = wins / gamesPlayed
- `normalizedPF` = teamPF / maxPFInLeague
- Tiebreaker: higher PA wins (tougher schedule)

Weights are tunable in `lib/config.ts`.

## Project Structure

```
lib/
  types.ts          — Sleeper API + app types
  config.ts         — Tunable constants & env helpers
  sleeper.ts        — Typed Sleeper API fetch helpers
  rankings.ts       — Power ranking computation
  recap-builder.ts  — Matchup building logic for weekly recaps
  recap-llm.ts      — OpenAI recap generation
  recap-store.ts    — Recap persistence (Neon Postgres)
  db/
    index.ts        — Database connection & migration helper
    schema.sql      — Recaps table schema
    setup.ts        — One-time migration script
app/
  page.tsx           — Main dashboard (client component)
  layout.tsx         — Root layout with dark theme
  globals.css        — Tailwind + JetBrains Mono
  components/        — UI components
  api/
    context/         — League context endpoint
    league/          — League info endpoint (legacy)
    rankings/        — Rankings computation endpoint
    matchups/        — Weekly matchup data endpoint
    weekly-recap/    — Weekly recap + AI generate/publish/admin endpoints
    roast/           — TODO: LLM-powered matchup roasts
    luck/            — TODO: Expected vs actual wins analysis
```

## AI Recaps

The Weekly Recap tab supports AI-generated matchup summaries with a commissioner-controlled publish flow:

1. Navigate to a week in the Weekly Recap tab
2. Use the **Admin Controls** panel at the bottom to enter optional personality notes
3. Click **Generate Draft** — this calls OpenAI to write a week summary and per-matchup recaps
4. Preview the draft in the admin panel
5. Click **Publish** to make the recap visible to all users
6. To redo a recap, click **Regenerate** (resets to draft state, requires re-publishing)

## Recap Style Examples

Use private style examples to steer the recap voice without committing roast text to Git.

- Supported env vars:
  - `RECAP_STYLE_EXAMPLES` (raw text)
  - `RECAP_STYLE_EXAMPLES_B64` (base64 text; recommended for hosted env managers)
- Precedence: `RECAP_STYLE_EXAMPLES` is used first; if unset, the app falls back to `RECAP_STYLE_EXAMPLES_B64`.

### Local setup

1. Put your style corpus in a local file, for example `roast_examples.txt`.
2. Encode it and write to `.env.local`:

```bash
RECAP_STYLE_EXAMPLES_B64=$(base64 < roast_examples.txt | tr -d '\n')
```

3. Add/update this line in `.env.local`:

```bash
RECAP_STYLE_EXAMPLES_B64=...
```

### Hosted setup (Vercel)

1. Base64 encode your private examples locally.
2. In Vercel Project Settings -> Environment Variables, add:
   - `RECAP_STYLE_EXAMPLES_B64=<your_encoded_value>`
3. Redeploy so the new secret is picked up by the server runtime.

## Extensibility

The codebase is structured for easy addition of:

- **`/api/roast`** — LLM-powered weekly matchup roasts (stub in place)
- **`/api/luck`** — Expected vs actual wins analysis (stub in place)
- **Multi-league** — Support multiple leagues via `SLEEPER_LEAGUE_IDS` env var (commented scaffolding in `config.ts`)

Search for `// TODO:` comments throughout the codebase for integration points.
