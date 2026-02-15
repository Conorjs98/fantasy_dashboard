"use client";

import Image from "next/image";

import type { ManagerRanking } from "@/lib/types";

const podiumConfig = [
  { place: 2, height: "h-20", color: "bg-silver", label: "text-silver", delay: "delay-100" },
  { place: 1, height: "h-28", color: "bg-gold", label: "text-gold", delay: "delay-0" },
  { place: 3, height: "h-14", color: "bg-bronze", label: "text-bronze", delay: "delay-200" },
];

export default function Podium({ rankings }: { rankings: ManagerRanking[] }) {
  const top3 = rankings.slice(0, 3);
  if (top3.length < 3) return null;

  // Reorder: 2nd, 1st, 3rd for podium layout
  const ordered = [top3[1], top3[0], top3[2]];

  return (
    <div className="bg-card border border-[#222] rounded p-4">
      <h3 className="text-[9px] uppercase tracking-widest text-text-secondary mb-4">
        Podium
      </h3>
      <div className="flex items-end justify-center gap-2">
        {ordered.map((manager, i) => {
          const config = podiumConfig[i];
          return (
            <div key={manager.rosterId} className="flex flex-col items-center gap-1.5 flex-1">
              {manager.avatar ? (
                <Image
                  src={manager.avatar}
                  alt=""
                  width={32}
                  height={32}
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
              <span className={`text-[10px] text-text-primary font-medium truncate max-w-full text-center`}>
                {manager.displayName}
              </span>
              <div
                className={`w-full ${config.height} ${config.color} rounded-t flex items-center justify-center podium-bar ${config.delay}`}
              >
                <span className="text-sm font-bold text-[#0a0a0a]">
                  {config.place}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
