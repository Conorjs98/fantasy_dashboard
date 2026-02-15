# Fantasy Dashboard

A terminal-aesthetic fantasy football leaderboard powered by the Sleeper API. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Features

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

   Edit `.env.local` and set your Sleeper league ID:

   ```
   SLEEPER_LEAGUE_ID=your_league_id_here
   ```

   Find your league ID in the Sleeper app URL or league settings.

3. **Run locally:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add `SLEEPER_LEAGUE_ID` as an environment variable
4. Deploy

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
  types.ts       — Sleeper API + app types
  config.ts      — Tunable constants & env helpers
  sleeper.ts     — Typed Sleeper API fetch helpers
  rankings.ts    — Power ranking computation
app/
  page.tsx        — Main dashboard (client component)
  layout.tsx      — Root layout with dark theme
  globals.css     — Tailwind + JetBrains Mono
  components/     — UI components
  api/
    league/       — League info endpoint
    rankings/     — Rankings computation endpoint
    matchups/     — Weekly matchup data endpoint
    roast/        — TODO: LLM-powered matchup roasts
    luck/         — TODO: Expected vs actual wins analysis
```

## Extensibility

The codebase is structured for easy addition of:

- **`/api/roast`** — LLM-powered weekly matchup roasts (stub in place)
- **`/api/luck`** — Expected vs actual wins analysis (stub in place)
- **Multi-league** — Support multiple leagues via `SLEEPER_LEAGUE_IDS` env var (commented scaffolding in `config.ts`)

Search for `// TODO:` comments throughout the codebase for integration points.
