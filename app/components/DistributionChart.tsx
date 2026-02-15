"use client";

import Image from "next/image";

import type { ManagerRanking } from "@/lib/types";

export default function DistributionChart({
  rankings,
}: {
  rankings: ManagerRanking[];
}) {
  const totalPF = rankings.reduce((sum, m) => sum + m.pointsFor, 0);
  if (totalPF === 0) return null;

  const data = rankings.map((m) => ({
    rosterId: m.rosterId,
    name: m.displayName,
    avatar: m.avatar,
    pf: m.pointsFor,
    pct: (m.pointsFor / totalPF) * 100,
    rank: m.rank,
  }));

  // Sort by PF descending for the chart
  data.sort((a, b) => b.pf - a.pf);

  return (
    <div className="bg-card border border-[#222] rounded p-4">
      <h3 className="text-[9px] uppercase tracking-widest text-text-secondary mb-3">
        Distribution
      </h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.rosterId} className="flex items-center gap-2">
            {d.avatar ? (
              <Image
                src={d.avatar}
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 rounded-full shrink-0 bg-[#222] object-cover"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full shrink-0 bg-[#222] flex items-center justify-center text-[8px] font-medium text-text-secondary"
                aria-hidden
              >
                {d.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-[9px] text-text-secondary w-20 truncate text-right">
              {d.name}
            </span>
            <div className="flex-1 h-2 bg-[#1a1a1a] rounded-sm overflow-hidden min-w-0">
              <div
                className="h-full bg-accent rounded-sm transition-all duration-500"
                style={{ width: `${d.pct}%` }}
              />
            </div>
            <span className="text-[9px] text-text-secondary w-10 tabular-nums text-right">
              {d.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
