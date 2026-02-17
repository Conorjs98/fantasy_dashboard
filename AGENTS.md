# Fantasy Dashboard

Next.js 14 App Router / TypeScript / Tailwind CSS. Dark terminal aesthetic.

## Architecture

- **`lib/`** — Shared logic, never imported from client components directly
  - `sleeper.ts` — Typed fetch wrappers for Sleeper API (never call Sleeper from UI)
  - `league-context.ts` — Canonical league context resolver (league/season/week/members/team ownership)
  - `rankings.ts` — Power ranking algorithm: `(winPct * 0.5 + normalizedPF * 0.5) * 100`
  - `config.ts` — Tunable constants (ranking weights, weekly recap thresholds, league ID helper)
  - `types.ts` — All Sleeper API and app types
  - `api-utils.ts` — Shared API route helpers (param parsing, error responses)
  - `db/index.ts` — Neon Postgres connection helper (`sql()` function) and `initDb()` for schema migration
  - `recap-builder.ts` — Matchup building logic extracted from weekly-recap route (`buildRecapMatchups`, `buildHighlights`)
  - `recap-store.ts` — Recap persistence layer (CRUD for `recaps` table via Neon Postgres)
  - `recap-llm.ts` — OpenAI (gpt-4o) recap generation (`generateRecap()`)
- **`app/api/`** — Route handlers that call `lib/sleeper.ts` and return JSON
  - `context/route.ts` — Unified context endpoint for league metadata + members + available seasons
  - `weekly-recap/route.ts` — GET: matchups + highlights + published AI recap state
  - `weekly-recap/generate/route.ts` — POST: generate AI recap draft via LLM
  - `weekly-recap/publish/route.ts` — POST: publish a DRAFT recap
  - `weekly-recap/admin/route.ts` — GET: admin preview of draft/published recap
- **`app/components/`** — Client components (`"use client"`)
  - `AdminRecapControls.tsx` — Commissioner controls: generate, preview, publish AI recaps
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

- Do not add comments that explain only the immediate task or implementation detail (e.g. "so that X doesn't clip", "so tooltip shows above"). Prefer comments that help future readers understand what the code does; omit obvious or one-off rationale.

## Style

- Colors: bg `#0a0a0a`, cards `#111`, accent `#00d4ff`, gold/silver/bronze for ranks
- Font: JetBrains Mono (loaded via Google Fonts in `globals.css`)
- Labels: uppercase, `text-[9px]`/`text-[10px]`, `tracking-widest`

## Commands

```
npm run dev          # local dev server
npm run build        # production build (do NOT run while dev server is running — overwrites .next)
npx tsc --noEmit     # type-check without a full build
npx tsx lib/db/setup.ts  # run database migration (creates recaps table)
```

## Environment Variables

```
SLEEPER_LEAGUE_ID    # required — Sleeper league ID
OPENAI_API_KEY       # required for AI recap generation
DATABASE_URL         # Neon Postgres connection string (or POSTGRES_URL)
```

## Current State

- Canonical context endpoint: `/api/context`
- Rankings endpoint: `/api/rankings`
- Weekly recap endpoint: `/api/weekly-recap`
- Compatibility metadata endpoint: `/api/league`
- Matchups passthrough endpoint: `/api/matchups/[week]`
- Mobile navigation: dashboard tabs wrap to multiple lines on smaller screens
- Mobile leaderboard: preserved desktop table columns with horizontal scroll on narrow viewports
- Leaderboard PWR tooltip: opens below the header icon to avoid clipping and explains what the score indicates for users
- Weekly recap summary card always renders; unpublished states show a single "Recap coming soon" waiting indicator with an in-card retro 8-bit QB-to-WR loading animation
- Recap waiting animation uses site accent palette, stepped stop-motion timing, a brief catch hold, subtle camera jitter, and a short ball-motion trail
- Recap waiting animation is left-aligned in a frameless strip (no extra inner rectangle around the animation scene)

## UI Tabs (Current Order)

1. Weekly Recap
2. Leaderboard
3. Roast
4. Luck

## Weekly Recap (Milestone M2 + AI Recap v1)

- Implemented:
  - First tab in dashboard row.
  - Week-aware matchup feed with head-to-head rows.
  - Top-of-feed Highlights strip (Game of the Week, Beatdown, High Score, Low Score) computed server-side from weekly results.
  - Highlights strip tiles are clickable and smooth-scroll to the corresponding matchup row in the feed.
  - Clicking a highlights tile now applies a brief accent flash on the destination matchup card to make the scroll target obvious.
  - Winner/loser treatment (`W`/`L`, winner highlight, loser muted, tie-safe handling).
  - AI-generated per-matchup summaries and week summary via OpenAI gpt-4o.
  - Unpublished recap states now show one Week Summary waiting card instead of repeating per-matchup unpublished placeholders.
  - Waiting state uses an animated "Recap coming soon" card while recap generation is pending (retro 8-bit QB throw to WR, accent-cyan palette, catch pause, subtle jitter/trail effects, reduced-motion fallback).
  - Commissioner-controlled draft/publish lifecycle: generate draft → preview → publish.
  - Matchup chips: `Close`, `Blowout`, `Shootout`, `Snoozefest` from shared threshold constants.
  - Week navigation improvements: prev/next week buttons in Recap tab plus deep-linkable week URLs via `?week=N`.
  - Mobile-safe stacked layout without horizontal scrolling.
- Source files:
  - `lib/config.ts`
  - `lib/recap-builder.ts`
  - `lib/recap-llm.ts`
  - `lib/recap-store.ts`
  - `lib/db/index.ts`
  - `app/api/weekly-recap/route.ts`
  - `app/api/weekly-recap/generate/route.ts`
  - `app/api/weekly-recap/publish/route.ts`
  - `app/api/weekly-recap/admin/route.ts`
  - `app/components/RetroFootballLoader.tsx`
  - `app/components/WeeklyRecapFeed.tsx`
  - `app/components/AdminRecapControls.tsx`
  - `app/page.tsx`
  - `lib/types.ts`

## AI Recap Lifecycle

```
NOT_GENERATED → [POST /generate] → DRAFT → [POST /publish] → PUBLISHED
                                      ↑                          |
                                      └── [POST /generate] ──────┘ (regenerate resets to DRAFT)
```

- `RecapState`: `"NOT_GENERATED" | "DRAFT" | "PUBLISHED"`
- One recap per league/season/week (UNIQUE constraint in DB)
- Regenerating an existing recap overwrites it and resets state to DRAFT
- Public GET endpoint only shows AI summaries when state is PUBLISHED
- Admin GET endpoint shows draft content for preview regardless of state
- No auth in v1 — admin controls always visible

## API Contracts

| Method | Route | Body / Params | Response |
|--------|-------|---------------|----------|
| GET | `/api/weekly-recap` | `?leagueId&week&season` | `WeeklyRecapResponse` (+ `recapState`, `weekSummary`) |
| GET | `/api/weekly-recap/admin` | `?leagueId&week` | `AdminRecapResponse` |
| POST | `/api/weekly-recap/generate` | `{ week, leagueId?, season?, personalityNotes? }` | `{ ok, state: "DRAFT" }` |
| POST | `/api/weekly-recap/publish` | `{ week, leagueId?, season? }` | `{ ok, state: "PUBLISHED" }` |

## Feature Status

- AI Recap: implemented (v1 — no auth, commissioner controls always visible)
- Roast API: stub (`/api/roast`)
- Luck API: stub (`/api/luck`)
- Multi-league env support: scaffolded in `lib/config.ts` TODO
