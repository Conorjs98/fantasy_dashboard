"use client";

import type { LeagueInfo } from "@/lib/types";

function formatWeekLabel(week: number, playoffWeekStart?: number): string {
  if (playoffWeekStart && week >= playoffWeekStart) {
    return `Playoff Week ${week - playoffWeekStart + 1}`;
  }
  return `Week ${week}`;
}

interface TimeControlsProps {
  league: LeagueInfo;
  selectedWeek: number;
  selectedSeason: string;
  availableSeasons: string[];
  onWeekChange: (week: number) => void;
  onSeasonChange: (season: string) => void;
}

export default function TimeControls({
  league,
  selectedWeek,
  selectedSeason,
  availableSeasons,
  onWeekChange,
  onSeasonChange,
}: TimeControlsProps) {
  const maxWeek = Math.max(league.totalWeeks, league.currentWeek);
  const summaryLabel =
    selectedWeek === 0
      ? `${selectedSeason} — FULL SEASON`
      : `${selectedSeason} — ${formatWeekLabel(selectedWeek, league.playoffWeekStart).toUpperCase()}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[10px] uppercase tracking-widest text-text-secondary font-medium">
        {summaryLabel}
      </span>

      {/* Season dropdown */}
      <select
        value={selectedSeason}
        onChange={(e) => onSeasonChange(e.target.value)}
        className="bg-card border border-[#222] rounded px-2 py-1.5 text-[10px] uppercase text-text-primary focus:outline-none focus:border-accent"
      >
        {availableSeasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Week dropdown (includes Full Season option) */}
      <select
        value={selectedWeek}
        onChange={(e) => onWeekChange(parseInt(e.target.value, 10))}
        className="bg-card border border-[#222] rounded px-2 py-1.5 text-[10px] uppercase text-text-primary focus:outline-none focus:border-accent"
      >
        <option value={0}>Full Season</option>
        {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
          <option key={w} value={w}>
            {formatWeekLabel(w, league.playoffWeekStart)}
          </option>
        ))}
      </select>
    </div>
  );
}
