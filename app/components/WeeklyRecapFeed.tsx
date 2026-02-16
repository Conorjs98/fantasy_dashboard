"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { RecapState, WeeklyRecapHighlight, WeeklyRecapMatchup } from "@/lib/types";

interface WeeklyRecapFeedProps {
  week: number;
  matchups: WeeklyRecapMatchup[];
  highlights: WeeklyRecapHighlight[];
  recapState: RecapState;
  weekSummary: string;
}

function RecapComingSoonIndicator() {
  return (
    <div className="mt-2 rounded border border-[#2a3b40] bg-[#0b1215] p-3">
      <p className="text-sm text-text-primary leading-relaxed">Recap coming soon.</p>
      <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">
        Week summary publishes after AI processing completes
      </p>
    </div>
  );
}

function scoreLabel(score: number): string {
  return score.toFixed(2);
}

function TeamSide({
  displayName,
  teamName,
  avatar,
  result,
}: {
  displayName: string;
  teamName: string;
  avatar: string | null;
  result: "W" | "L" | "T";
}) {
  const isWinner = result === "W";
  const isLoser = result === "L";

  return (
    <div
      className={[
        "rounded border p-3 flex items-center gap-3 min-w-0",
        isWinner
          ? "border-accent bg-[#0f1d22] shadow-[0_0_18px_rgba(0,212,255,0.18)]"
          : "border-[#222] bg-[#101010]",
        isLoser ? "opacity-60" : "opacity-100",
      ].join(" ")}
    >
      {avatar ? (
        <Image src={avatar} alt={displayName} width={36} height={36} className="w-9 h-9 rounded" />
      ) : (
        <div className="w-9 h-9 rounded bg-[#1a1a1a] border border-[#2a2a2a]" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-text-secondary truncate">
          {teamName}
        </p>
        <p className="text-sm text-text-primary truncate">{displayName}</p>
      </div>

      <span
        className={[
          "text-[10px] px-2 py-1 rounded border uppercase tracking-widest",
          isWinner
            ? "border-accent text-accent"
            : isLoser
              ? "border-[#333] text-text-secondary"
              : "border-[#555] text-text-primary",
        ].join(" ")}
      >
        {result}
      </span>
    </div>
  );
}

function scrollToMatchup(matchupId: number): void {
  if (typeof document === "undefined") return;

  const target = document.getElementById(`matchup-${matchupId}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function HighlightsStrip({
  highlights,
  onHighlightClick,
}: {
  highlights: WeeklyRecapHighlight[];
  onHighlightClick: (matchupId: number) => void;
}) {
  if (highlights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {highlights.map((highlight) => (
        <button
          type="button"
          key={`${highlight.type}-${highlight.matchupId}`}
          onClick={() => onHighlightClick(highlight.matchupId)}
          className="bg-card border border-[#222] rounded p-3 text-left cursor-pointer hover:border-accent transition-colors duration-200"
        >
          <p className="text-[9px] uppercase tracking-widest text-accent mb-2">
            {highlight.emoji} {highlight.label}
          </p>
          <p className="text-sm text-text-primary leading-relaxed">
            {highlight.winnerName} {highlight.winnerScore.toFixed(2)} {"->"} {highlight.loserName}{" "}
            {highlight.loserScore.toFixed(2)}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-2">
            {highlight.valueLabel}
          </p>
        </button>
      ))}
    </div>
  );
}

export default function WeeklyRecapFeed({ week, matchups, highlights, recapState, weekSummary }: WeeklyRecapFeedProps) {
  const [flashMatchupId, setFlashMatchupId] = useState<number | null>(null);
  const clearFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPublishedWeekSummary = recapState === "PUBLISHED" && weekSummary.trim().length > 0;

  const handleHighlightClick = (matchupId: number): void => {
    scrollToMatchup(matchupId);
    setFlashMatchupId(matchupId);

    if (clearFlashTimeoutRef.current) {
      clearTimeout(clearFlashTimeoutRef.current);
    }

    clearFlashTimeoutRef.current = setTimeout(() => {
      setFlashMatchupId((current) => (current === matchupId ? null : current));
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (clearFlashTimeoutRef.current) {
        clearTimeout(clearFlashTimeoutRef.current);
      }
    };
  }, []);

  if (matchups.length === 0) {
    return (
      <div className="bg-card border border-[#222] rounded p-6">
        <h2 className="text-xs uppercase tracking-widest text-text-primary mb-2">
          Weekly Recap
        </h2>
        <p className="text-sm text-text-secondary">No completed head-to-head matchups for Week {week}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <HighlightsStrip highlights={highlights} onHighlightClick={handleHighlightClick} />
      <div className="bg-card border border-accent/30 rounded p-4">
        <p className="text-[9px] uppercase tracking-widest text-accent mb-2">Week Summary</p>
        {hasPublishedWeekSummary ? (
          <p className="text-sm text-text-primary leading-relaxed">{weekSummary}</p>
        ) : (
          <RecapComingSoonIndicator />
        )}
      </div>
      {matchups.map((matchup) => {
        const isTie = matchup.a.score === matchup.b.score;
        const aResult: "W" | "L" | "T" = isTie
          ? "T"
          : matchup.winnerRosterId === matchup.a.rosterId
            ? "W"
            : "L";
        const bResult: "W" | "L" | "T" = isTie
          ? "T"
          : matchup.winnerRosterId === matchup.b.rosterId
            ? "W"
            : "L";

        return (
          <article
            id={`matchup-${matchup.matchupId}`}
            key={matchup.matchupId}
            className={[
              "bg-card border rounded p-3 md:p-4 transition-all duration-500",
              flashMatchupId === matchup.matchupId
                ? "border-accent bg-[#0f1d22] shadow-[0_0_24px_rgba(0,212,255,0.28)]"
                : "border-[#222]",
            ].join(" ")}
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <TeamSide
                displayName={matchup.a.displayName}
                teamName={matchup.a.teamName}
                avatar={matchup.a.avatar}
                result={aResult}
              />

              <div className="text-center px-2 py-1 md:py-0">
                <p className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Score</p>
                <p className="text-base md:text-lg font-bold text-text-primary tabular-nums">
                  {scoreLabel(matchup.a.score)}
                  <span className="text-text-secondary px-2">vs</span>
                  {scoreLabel(matchup.b.score)}
                </p>
                {matchup.tags.length > 0 && (
                  <div className="mt-2 flex justify-center flex-wrap gap-1">
                    {matchup.tags.map((tag) => (
                      <span
                        key={`${matchup.matchupId}-${tag.type}`}
                        className="inline-block text-[9px] uppercase tracking-widest px-2 py-1 rounded border border-[#2a2a2a] text-text-secondary"
                      >
                        {tag.emoji} {tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <TeamSide
                displayName={matchup.b.displayName}
                teamName={matchup.b.teamName}
                avatar={matchup.b.avatar}
                result={bResult}
              />
            </div>

            {recapState === "PUBLISHED" && matchup.summary.trim().length > 0 && (
              <div className="mt-3 border border-[#222] bg-[#0d0d0d] rounded p-3">
                <p className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">Summary</p>
                <p className="text-sm text-text-primary">{matchup.summary}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
