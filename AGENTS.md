# Fantasy Dashboard

Next.js 14 App Router / TypeScript / Tailwind CSS. Dark terminal aesthetic.

## Architecture

- **`lib/`** — Shared logic, never imported from client components directly
  - `sleeper.ts` — Typed fetch wrappers for Sleeper API (never call Sleeper from UI)
  - `league-context.ts` — Canonical league context resolver (league/season/week/members/team ownership)
  - `rankings.ts` — Power ranking algorithm: `(winPct * 0.5 + normalizedPF * 0.5) * 100`
  - `config.ts` — Tunable constants (ranking weights, weekly recap thresholds, league ID helper)
  - `types.ts` — All Sleeper API and app types
- **`app/api/`** — Route handlers that call `lib/sleeper.ts` and return JSON
  - `context/route.ts` — Unified context endpoint for league metadata + members + available seasons
- **`app/components/`** — Client components (`"use client"`)
- **`app/page.tsx`** — Main dashboard, manages state and fetches from `/api/*`

## Key Rules

1. All Sleeper data flows: `Sleeper API → lib/sleeper.ts → app/api/ routes → client fetch`
2. Ranking weights live in `lib/config.ts` as `POWER_RANKING_WEIGHTS`
3. `accumulateStats()` recomputes W/L/PF/PA from raw matchups for any week range
4. League ID comes from `process.env.SLEEPER_LEAGUE_ID` (server-only)
5. League context assembly lives in `lib/league-context.ts`; pages/routes should prefer `/api/context` instead of rebuilding league/member/team relationships.
6. `/api/league` is a compatibility metadata endpoint; `/api/context` is the canonical source for league + members + available seasons.
7. League history traversal is best-effort: a broken historical `previous_league_id` link should not block loading the active league context.
8. External URLs (CDN, avatars, images) must be fully resolved in `lib/` before reaching components. Components never construct external URLs — they receive ready-to-use values from the API layer.
9. Keep `AGENTS.md` in sync with code changes. After any change to routes, contracts, tabs/navigation, UI behavior, or feature status, update this file in the same task before finishing.

## Pending Features (search `// TODO:`)

- `/api/roast` — LLM matchup roasts (stub exists)
- `/api/luck` — Expected vs actual wins (stub exists)
- Multi-league — `SLEEPER_LEAGUE_IDS` env var (scaffolding in `config.ts`)

## Code comments

- Do not add comments that explain only the immediate task or implementation detail (e.g. "so that X doesn’t clip", "so tooltip shows above"). Prefer comments that help future readers understand what the code does; omit obvious or one-off rationale.

## Style

- Colors: bg `#0a0a0a`, cards `#111`, accent `#00d4ff`, gold/silver/bronze for ranks
- Font: JetBrains Mono (loaded via Google Fonts in `globals.css`)
- Labels: uppercase, `text-[9px]`/`text-[10px]`, `tracking-widest`

## Commands

```
npm run dev    # local dev server
npm run build  # production build
```

## Current State

- Canonical context endpoint: `/api/context`
- Rankings endpoint: `/api/rankings`
- Weekly recap endpoint: `/api/weekly-recap`
- Compatibility metadata endpoint: `/api/league`
- Matchups passthrough endpoint: `/api/matchups/[week]`

## UI Tabs (Current Order)

1. Weekly Recap
2. Leaderboard
3. Roast
4. Luck

## Weekly Recap (Milestone M2)

- Implemented:
  - First tab in dashboard row.
  - Week-aware matchup feed with head-to-head rows.
  - Top-of-feed Highlights strip (Game of the Week, Beatdown, High Score, Low Score) computed server-side from weekly results.
  - Highlights strip tiles are clickable and smooth-scroll to the corresponding matchup row in the feed.
  - Clicking a highlights tile now applies a brief accent flash on the destination matchup card to make the scroll target obvious.
  - Winner/loser treatment (`W`/`L`, winner highlight, loser muted, tie-safe handling).
  - Server-provided summary string per matchup (currently placeholder: `"Recap coming soon..."`).
  - Matchup chips: `Close`, `Blowout`, `Shootout`, `Snoozefest` from shared threshold constants.
  - Week navigation improvements: prev/next week buttons in Recap tab plus deep-linkable week URLs via `?week=N`.
  - Mobile-safe stacked layout without horizontal scrolling.
- Source files:
  - `lib/config.ts`
  - `app/api/weekly-recap/route.ts`
  - `app/components/WeeklyRecapFeed.tsx`
  - `app/page.tsx`
  - `lib/types.ts`

## Feature Status

- Roast API: stub (`/api/roast`)
- Luck API: stub (`/api/luck`)
- Multi-league env support: scaffolded in `lib/config.ts` TODO
