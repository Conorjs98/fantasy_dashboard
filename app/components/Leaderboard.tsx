"use client";

import type { ManagerRanking } from "@/lib/types";
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
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end gap-1 whitespace-nowrap">
              PWR
              <span
                className="group relative inline-flex shrink-0 cursor-help rounded-full border border-text-secondary/50 w-3.5 h-3.5 items-center justify-center text-[8px] text-text-secondary hover:text-accent hover:border-accent"
                title="How to read PWR"
              >
                ?
                <span className="absolute top-full right-0 mt-1 hidden w-56 rounded border border-[#222] bg-card px-2.5 py-2 text-[9px] font-normal normal-case tracking-normal text-text-primary shadow-lg pointer-events-none z-50 leading-relaxed group-hover:block group-focus-within:block">
                  <span className="block font-medium text-accent mb-0.5">Power ranking</span>
                  Blends record and scoring strength into one score from 0 to 100. Higher means a stronger team profile.
                </span>
              </span>
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
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right whitespace-nowrap">
              All-Play %
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end gap-1 whitespace-nowrap">
              Exp Rec
              <span
                className="group relative inline-flex shrink-0 cursor-help rounded-full border border-text-secondary/50 w-3.5 h-3.5 items-center justify-center text-[8px] text-text-secondary hover:text-accent hover:border-accent"
                title="How to read Expected Record"
              >
                ?
                <span className="absolute top-full right-0 mt-1 hidden w-64 rounded border border-[#222] bg-card px-2.5 py-2 text-[9px] font-normal normal-case tracking-normal text-text-primary shadow-lg pointer-events-none z-50 leading-relaxed group-hover:block group-focus-within:block">
                  <span className="block font-medium text-accent mb-0.5">Expected record</span>
                  This is what your record would look like based on how many teams you outscored, not just your scheduled opponent.
                </span>
              </span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-secondary text-right flex items-center justify-end gap-1 whitespace-nowrap">
              Δ vs Expected
              <span
                className="group relative inline-flex shrink-0 cursor-help rounded-full border border-text-secondary/50 w-3.5 h-3.5 items-center justify-center text-[8px] text-text-secondary hover:text-accent hover:border-accent"
                title="How to read Delta vs Expected"
              >
                ?
                <span className="absolute top-full right-0 mt-1 hidden w-64 rounded border border-[#222] bg-card px-2.5 py-2 text-[9px] font-normal normal-case tracking-normal text-text-primary shadow-lg pointer-events-none z-50 leading-relaxed group-hover:block group-focus-within:block">
                  <span className="block font-medium text-accent mb-0.5">Delta vs expected</span>
                  Positive means you have more wins than expected. Negative means you have fewer wins than expected.
                </span>
              </span>
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
