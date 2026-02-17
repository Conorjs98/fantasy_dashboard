"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  AdminRecapResponse,
  LeagueMember,
  ManagerNote,
  RecapState,
} from "@/lib/types";

interface AdminRecapControlsProps {
  week: number;
  leagueId: string;
  season: string;
  members: LeagueMember[];
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
  members,
  onPublished,
}: AdminRecapControlsProps) {
  const [admin, setAdmin] = useState<AdminRecapResponse | null>(null);
  const [personalityNotes, setPersonalityNotes] = useState("");
  const [managerNoteDrafts, setManagerNoteDrafts] = useState<Record<string, string>>({});
  const [managerSaveState, setManagerSaveState] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});
  const [notesExpanded, setNotesExpanded] = useState(false);
  const saveVersionRef = useRef<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mergeManagerNotes = useCallback((notes: ManagerNote[]) => {
    const next: Record<string, string> = {};
    for (const note of notes) {
      next[note.userId] = note.notes;
    }
    setManagerNoteDrafts(next);
  }, []);

  const fetchAdmin = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        week: String(week),
        leagueId,
        season,
      });
      const res = await fetch(`/api/weekly-recap/admin?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as AdminRecapResponse;
      setAdmin(data);
      setPersonalityNotes(data.personalityNotes ?? "");
      mergeManagerNotes(data.managerNotes ?? []);
    } catch {
      // Admin panel is non-critical — silently fail
    }
  }, [week, leagueId, season, mergeManagerNotes]);

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

  const handleManagerNoteBlur = async (userId: string) => {
    const nextVersion = (saveVersionRef.current[userId] ?? 0) + 1;
    saveVersionRef.current[userId] = nextVersion;
    setManagerSaveState((prev) => ({ ...prev, [userId]: "saving" }));

    try {
      const res = await fetch("/api/manager-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId,
          season,
          userId,
          notes: managerNoteDrafts[userId] ?? "",
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save manager note");
      }

      if (saveVersionRef.current[userId] !== nextVersion) return;
      setManagerSaveState((prev) => ({ ...prev, [userId]: "saved" }));
      setTimeout(() => {
        if (saveVersionRef.current[userId] !== nextVersion) return;
        setManagerSaveState((prev) => ({ ...prev, [userId]: "idle" }));
      }, 1200);
    } catch {
      if (saveVersionRef.current[userId] !== nextVersion) return;
      setManagerSaveState((prev) => ({ ...prev, [userId]: "error" }));
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

      <div className="border border-[#222] rounded bg-[#0d0d0d]">
        <button
          type="button"
          onClick={() => setNotesExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 text-[9px] uppercase tracking-widest text-text-secondary hover:text-text-primary"
        >
          <span>Manager Notes</span>
          <span>{notesExpanded ? "▼" : "▶"}</span>
        </button>

        {notesExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-[#222]">
            {[...members]
              .sort((a, b) => a.rosterId - b.rosterId)
              .map((member) => {
                const saveState = managerSaveState[member.userId] ?? "idle";
                const label = member.teamName || member.displayName;

                return (
                  <div key={member.userId} className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor={`manager-note-${member.userId}`}
                        className="text-[9px] uppercase tracking-widest text-text-secondary"
                      >
                        {label}
                      </label>
                      <span
                        className={[
                          "text-[9px] uppercase tracking-widest",
                          saveState === "saving"
                            ? "text-accent"
                            : saveState === "saved"
                              ? "text-green-400"
                              : saveState === "error"
                                ? "text-red-400"
                                : "text-text-secondary",
                        ].join(" ")}
                      >
                        {saveState === "saving"
                          ? "Saving"
                          : saveState === "saved"
                            ? "Saved"
                            : saveState === "error"
                              ? "Retry"
                              : "Idle"}
                      </span>
                    </div>
                    <textarea
                      id={`manager-note-${member.userId}`}
                      value={managerNoteDrafts[member.userId] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setManagerNoteDrafts((prev) => ({
                          ...prev,
                          [member.userId]: value,
                        }));
                        setManagerSaveState((prev) => ({
                          ...prev,
                          [member.userId]: "idle",
                        }));
                      }}
                      onBlur={() => handleManagerNoteBlur(member.userId)}
                      placeholder="Add manager-specific roast/personality notes..."
                      className="w-full bg-[#090909] border border-[#222] rounded p-2 text-sm text-text-primary placeholder:text-text-secondary/50 resize-y min-h-[48px] focus:outline-none focus:border-accent"
                      rows={2}
                    />
                  </div>
                );
              })}
          </div>
        )}
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
