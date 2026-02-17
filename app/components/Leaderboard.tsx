"use client";

import type { ManagerRanking } from "@/lib/types";
import HeaderHelpTooltip from "./HeaderHelpTooltip";
import LeaderboardRow from "./LeaderboardRow";

export default function Leaderboard({
  rankings,
}: {
  rankings: ManagerRanking[];
}) {
  const hasExpectedData = rankings.some((manager) => !!manager.expectedRecord);

  return (
    <div className="bg-card border border-[#222] rounded overflow-visible">
      <div className="overflow-x-auto overflow-y-visible rounded">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[48px_1fr_100px_80px_80px_80px_92px_102px_118px] items-center gap-2 px-4 py-2.5 border-b border-[#222] rounded-t">
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-center whitespace-nowrap">
              #
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary whitespace-nowrap">
              Manager
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end whitespace-nowrap">
              <HeaderHelpTooltip
                label="PWR"
                title="Power ranking"
                text="Blends record and scoring strength into one score from 0 to 100. Higher means a stronger team profile."
              />
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right whitespace-nowrap">
              W-L
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right whitespace-nowrap">
              PF
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right whitespace-nowrap">
              PA
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end whitespace-nowrap">
              <HeaderHelpTooltip
                label="All-Play %"
                title="All-play percentage"
                text="Shows how often your team would win if it played every other team each week."
              />
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end whitespace-nowrap">
              <HeaderHelpTooltip
                label="Exp Rec"
                title="Expected record"
                text="This is what your record would look like based on how many teams you outscored, not just your scheduled opponent."
              />
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end whitespace-nowrap">
              <HeaderHelpTooltip
                label="Δ vs Expected"
                title="Delta vs expected"
                text="Positive means you have more wins than expected. Negative means you have fewer wins than expected."
              />
            </span>
          </div>

          {!hasExpectedData && (
            <div className="px-4 py-2 border-b border-[#222]">
              <span className="text-[10px] text-text-secondary">
                Expected metrics unavailable for the selected view.
              </span>
            </div>
          )}

          <div className="divide-y divide-[#222] overflow-hidden rounded-b">
            {rankings.map((manager) => (
              <LeaderboardRow
                key={manager.rosterId}
                manager={manager}
                isFirst={manager.rank === 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
