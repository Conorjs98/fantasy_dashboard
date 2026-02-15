"use client";

import { useEffect, useState, useCallback } from "react";
import type { LeagueContext, LeagueInfo, ManagerRanking } from "@/lib/types";
import TimeControls from "./components/TimeControls";
import Leaderboard from "./components/Leaderboard";
import Podium from "./components/Podium";
import DistributionChart from "./components/DistributionChart";

interface RankingsResponse {
  rankings: ManagerRanking[];
  week: number;
  season: string;
  leagueName: string;
}

const DASHBOARD_TABS = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "roast", label: "Roast" },
  { id: "luck", label: "Luck" },
] as const;

type DashboardTab = (typeof DASHBOARD_TABS)[number]["id"];

export default function Home() {
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [rankings, setRankings] = useState<ManagerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("leaderboard");

  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);

  const readErrorMessage = useCallback(async (res: Response, fallback: string) => {
    try {
      const body = (await res.json()) as { error?: string };
      return body.error ?? fallback;
    } catch {
      return fallback;
    }
  }, []);

  // Fetch shared league context
  const fetchLeagueContext = useCallback(async (season?: string) => {
    const params = new URLSearchParams();
    if (season) params.set("season", season);
    const res = await fetch(`/api/context?${params}`);
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to load league context"));
    }
    return (await res.json()) as LeagueContext;
  }, [readErrorMessage]);

  // Legacy fallback for league metadata if context endpoint fails
  const fetchLeague = useCallback(async (season?: string) => {
    const params = new URLSearchParams();
    if (season) params.set("season", season);
    const res = await fetch(`/api/league?${params}`);
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to load league info"));
    }
    return (await res.json()) as LeagueInfo;
  }, [readErrorMessage]);

  // Fetch rankings
  const fetchRankings = useCallback(
    async (leagueId: string, week?: number) => {
      const params = new URLSearchParams({ leagueId });
      if (week !== undefined) params.set("week", String(week));
      const res = await fetch(`/api/rankings?${params}`);
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to load rankings"));
      }
      return (await res.json()) as RankingsResponse;
    },
    [readErrorMessage]
  );

  // Clamp selectedWeek when league changes (e.g. season switch)
  useEffect(() => {
    if (!league || selectedWeek === 0) return;
    const maxWeek = Math.max(league.totalWeeks, league.currentWeek);
    if (selectedWeek > maxWeek || selectedWeek < 1) {
      setSelectedWeek(league.currentWeek);
    }
  }, [league, selectedWeek]);

  // Initial load — default to full season view
  useEffect(() => {
    (async () => {
      try {
        let initialLeague: LeagueInfo;
        let seasons: string[];
        try {
          const context = await fetchLeagueContext();
          initialLeague = context.league;
          seasons = context.availableSeasons;
        } catch {
          const info = await fetchLeague();
          initialLeague = info;
          const currentYear = parseInt(info.season, 10);
          seasons = Array.from({ length: 6 }, (_, i) => String(currentYear - i));
        }

        setLeague(initialLeague);
        setSelectedWeek(0);
        setSelectedSeason(initialLeague.season);
        setAvailableSeasons(seasons);

        const data = await fetchRankings(initialLeague.leagueId);
        setRankings(data.rankings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchLeagueContext, fetchLeague, fetchRankings]);

  // Refetch when week or season changes
  useEffect(() => {
    if (!league) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let targetLeague = league;

        if (selectedSeason !== league.season) {
          const context = await fetchLeagueContext(selectedSeason);
          targetLeague = context.league;
          setLeague(context.league);
          setAvailableSeasons(context.availableSeasons);
        }

        const week = selectedWeek === 0 ? undefined : selectedWeek;
        const data = await fetchRankings(targetLeague.leagueId, week);
        setRankings(data.rankings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, selectedSeason]);

  if (error) {
    return (
      <div className="min-h-screen w-full bg-grid flex items-center justify-center">
        <div className="bg-card border border-red-900/50 rounded p-6 max-w-md">
          <h2 className="text-xs uppercase tracking-widest text-red-400 mb-2">
            Error
          </h2>
          <p className="text-sm text-text-secondary">{error}</p>
          <p className="text-[10px] text-muted mt-3">
            Check that SLEEPER_LEAGUE_ID is set in your .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-grid">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          {league?.avatar && (
            <>
              <img
                src={league.avatar}
                alt={league.name}
                className="w-8 h-8 rounded"
              />
              <div className="w-px h-6 bg-[#333]" />
            </>
          )}
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">
              {league?.name ?? "League"}
            </h1>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider">
              Fantasy Dashboard
            </span>
          </div>
        </div>
        <div className="h-px bg-[#222] mb-4" />

        {league && (
          <TimeControls
            league={league}
            selectedWeek={selectedWeek}
            selectedSeason={selectedSeason}
            availableSeasons={availableSeasons}
            onWeekChange={setSelectedWeek}
            onSeasonChange={setSelectedSeason}
          />
        )}
      </header>

      <nav className="mb-4 border-b border-[#222]">
        <div className="flex items-center gap-2">
          {DASHBOARD_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "px-3 py-2 text-[10px] uppercase tracking-widest border-b transition-colors",
                  isActive
                    ? "text-accent border-accent"
                    : "text-text-secondary border-transparent hover:text-text-primary",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-xs text-text-secondary uppercase tracking-widest animate-pulse">
            Loading rankings...
          </div>
        </div>
      ) : activeTab === "leaderboard" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Left: Leaderboard */}
          <Leaderboard rankings={rankings} />

          {/* Right: Sidebar widgets */}
          <div className="space-y-4">
            <Podium rankings={rankings} />
            <DistributionChart rankings={rankings} />

            {/* TODO: [roast] Add roast widget here */}
            {/* TODO: [luck] Add luck analysis widget here */}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-[#222] rounded p-6">
          <h2 className="text-xs uppercase tracking-widest text-text-primary mb-2">
            {activeTab === "roast" ? "Roast" : "Luck"}
          </h2>
          <p className="text-sm text-text-secondary">
            This tab is scaffolded and ready for the
            {activeTab === "roast" ? " /api/roast" : " /api/luck"} integration.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-[#222]">
        <p className="text-[9px] text-muted uppercase tracking-wider">
          Data from Sleeper API &middot; Rankings recalculated on each view
          {/* TODO: [multi-league] Add league switcher here */}
        </p>
      </footer>
      </div>
    </div>
  );
}
