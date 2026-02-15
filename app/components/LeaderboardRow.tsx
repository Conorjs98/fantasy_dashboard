"use client";

import type { ManagerRanking } from "@/lib/types";

const rankColors: Record<number, string> = {
  1: "text-gold",
  2: "text-silver",
  3: "text-bronze",
};

export default function LeaderboardRow({
  manager,
  isFirst = false,
}: {
  manager: ManagerRanking;
  isFirst?: boolean;
}) {
  const rankColor = rankColors[manager.rank] ?? "text-muted";
  const rankStr = String(manager.rank).padStart(2, "0");

  return (
    <div
      className={`grid grid-cols-[48px_1fr_100px_80px_80px_80px] items-center gap-2 px-4 py-3 transition-colors ${
        isFirst ? "bg-[#181818]" : "bg-card hover:bg-[#181818]"
      }`}
    >
      {/* Rank — two-digit, gold/silver/bronze for top 3 */}
      <span className={`text-base font-bold ${rankColor} text-center tabular-nums`}>
        {rankStr}
      </span>

      {/* Manager name + optional LEADER badge */}
      <div className="flex items-center gap-2 truncate min-w-0">
        {manager.avatar ? (
          <img
            src={manager.avatar}
            alt=""
            className="w-8 h-8 rounded-full shrink-0 bg-[#222] object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full shrink-0 bg-[#222] flex items-center justify-center text-[10px] font-medium text-text-secondary"
            aria-hidden
          >
            {manager.displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-text-primary font-medium truncate">
          {manager.displayName}
        </span>
        {manager.rank === 1 && (
          <span className="text-[9px] uppercase tracking-widest text-gold font-bold shrink-0">
            Leader
          </span>
        )}
        {manager.teamName !== manager.displayName && (
          <span className="text-[10px] text-text-secondary truncate hidden sm:inline">
            {manager.teamName}
          </span>
        )}
      </div>

      {/* Power ranking — primary large number in accent */}
      <span className="text-lg font-bold text-accent text-right tabular-nums">
        {manager.powerScore.toFixed(1)}
      </span>

      {/* W-L */}
      <span className="text-xs text-text-secondary text-right tabular-nums">
        {manager.wins}-{manager.losses}
        {manager.ties > 0 && `-${manager.ties}`}
      </span>

      {/* PF */}
      <span className="text-xs text-text-secondary text-right tabular-nums">
        {manager.pointsFor.toFixed(1)}
      </span>

      {/* PA */}
      <span className="text-xs text-text-secondary text-right tabular-nums">
        {manager.pointsAgainst.toFixed(1)}
      </span>
    </div>
  );
}
