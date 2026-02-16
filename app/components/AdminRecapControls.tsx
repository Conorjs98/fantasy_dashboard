"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdminRecapResponse, RecapState } from "@/lib/types";

interface AdminRecapControlsProps {
  week: number;
  leagueId: string;
  season: string;
  onPublished: () => void;
}

const STATE_LABELS: Record<RecapState, { text: string; className: string }> = {
  NOT_GENERATED: { text: "Not Generated", className: "border-[#333] text-text-secondary" },
  DRAFT: { text: "Draft", className: "border-yellow-600 text-yellow-400" },
  PUBLISHED: { text: "Published", className: "border-green-600 text-green-400" },
};

export default function AdminRecapControls({
  week,
  leagueId,
  season,
  onPublished,
}: AdminRecapControlsProps) {
  const [admin, setAdmin] = useState<AdminRecapResponse | null>(null);
  const [personalityNotes, setPersonalityNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAdmin = useCallback(async () => {
    try {
      const params = new URLSearchParams({ week: String(week), leagueId });
      const res = await fetch(`/api/weekly-recap/admin?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as AdminRecapResponse;
      setAdmin(data);
      setPersonalityNotes(data.personalityNotes ?? "");
    } catch {
      // Admin panel is non-critical — silently fail
    }
  }, [week, leagueId]);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/weekly-recap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, leagueId, season, personalityNotes }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Generation failed");
      }

      setStatusMessage("Draft generated successfully.");
      await fetchAdmin();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/weekly-recap/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, leagueId, season }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Publish failed");
      }

      setStatusMessage("Recap published!");
      await fetchAdmin();
      onPublished();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const state: RecapState = admin?.state ?? "NOT_GENERATED";
  const stateLabel = STATE_LABELS[state];
  const hasDraftOrPublished = state === "DRAFT" || state === "PUBLISHED";

  return (
    <div className="bg-card border border-[#222] rounded p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-widest text-text-secondary">
          Admin Controls
        </h3>
        <span
          className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded border ${stateLabel.className}`}
        >
          {stateLabel.text}
        </span>
      </div>

      <div>
        <label
          htmlFor="personality-notes"
          className="text-[9px] uppercase tracking-widest text-text-secondary block mb-1"
        >
          Personality Notes
        </label>
        <textarea
          id="personality-notes"
          value={personalityNotes}
          onChange={(e) => setPersonalityNotes(e.target.value)}
          disabled={generating || publishing}
          placeholder="e.g. Be extra sarcastic, roast the last-place team, hype up upsets..."
          className="w-full bg-[#0d0d0d] border border-[#222] rounded p-2 text-sm text-text-primary placeholder:text-text-secondary/50 resize-y min-h-[60px] focus:outline-none focus:border-accent disabled:opacity-50"
          rows={2}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || publishing}
          className="px-3 py-2 text-[10px] uppercase tracking-widest border border-accent text-accent rounded hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {generating ? (
            <span className="animate-pulse">Generating...</span>
          ) : hasDraftOrPublished ? (
            "Regenerate"
          ) : (
            "Generate Draft"
          )}
        </button>

        {state === "DRAFT" && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || generating}
            className="px-3 py-2 text-[10px] uppercase tracking-widest border border-green-600 text-green-400 rounded hover:bg-green-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <span className="animate-pulse">Publishing...</span>
            ) : (
              "Publish"
            )}
          </button>
        )}
      </div>

      {statusMessage && (
        <p className="text-[10px] uppercase tracking-widest text-green-400">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="text-[10px] uppercase tracking-widest text-red-400">
          {errorMessage}
        </p>
      )}

      {hasDraftOrPublished && admin && (
        <div className="space-y-3 border-t border-[#222] pt-3">
          <p className="text-[9px] uppercase tracking-widest text-text-secondary">
            {state === "DRAFT" ? "Draft Preview" : "Published Recap"}
          </p>

          {admin.weekSummary && (
            <div className="bg-[#0d0d0d] border border-[#222] rounded p-3">
              <p className="text-[9px] uppercase tracking-widest text-accent mb-1">
                Week Summary
              </p>
              <p className="text-sm text-text-primary">{admin.weekSummary}</p>
            </div>
          )}

          {admin.matchupSummaries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-text-secondary">
                Matchup Summaries
              </p>
              {admin.matchupSummaries.map((ms) => (
                <div
                  key={ms.matchupId}
                  className="bg-[#0d0d0d] border border-[#222] rounded p-2"
                >
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary mb-1">
                    Matchup {ms.matchupId}
                  </p>
                  <p className="text-sm text-text-primary">{ms.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
