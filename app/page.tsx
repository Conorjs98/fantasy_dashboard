"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type {
  LeagueContext,
  LeagueInfo,
  ManagerRanking,
  WeeklyRecapHighlight,
  WeeklyRecapMatchup,
  WeeklyRecapResponse,
} from "@/lib/types";
import TimeControls from "./components/TimeControls";
import Leaderboard from "./components/Leaderboard";
import Podium from "./components/Podium";
import DistributionChart from "./components/DistributionChart";
import WeeklyRecapFeed from "./components/WeeklyRecapFeed";

interface RankingsResponse {
  rankings: ManagerRanking[];
  week: number;
  season: string;
  leagueName: string;
}

const DASHBOARD_TABS = [
  { id: "weekly-recap", label: "Weekly Recap" },
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
  const [activeTab, setActiveTab] = useState<DashboardTab>("weekly-recap");
  const [recapMatchups, setRecapMatchups] = useState<WeeklyRecapMatchup[]>([]);
  const [recapHighlights, setRecapHighlights] = useState<WeeklyRecapHighlight[]>([]);
  const [recapWeek, setRecapWeek] = useState<number>(1);

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

  const fetchWeeklyRecap = useCallback(
    async (leagueId: string, week?: number) => {
      const params = new URLSearchParams({ leagueId });
      if (week !== undefined) params.set("week", String(week));
      const res = await fetch(`/api/weekly-recap?${params}`);
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to load weekly recap"));
      }
      return (await res.json()) as WeeklyRecapResponse;
    },
    [readErrorMessage]
  );

  const fetchAndApplyData = useCallback(
    async (leagueId: string, week?: number) => {
      const [rankingsData, recapData] = await Promise.all([
        fetchRankings(leagueId, week),
        fetchWeeklyRecap(leagueId, week),
      ]);
      setRankings(rankingsData.rankings);
      setRecapMatchups(recapData.matchups);
      setRecapHighlights(recapData.highlights);
      setRecapWeek(recapData.week);
    },
    [fetchRankings, fetchWeeklyRecap]
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
      const initialSearchParams = new URLSearchParams(window.location.search);
      const rawWeek = initialSearchParams.get("week");
      const parsedWeekFromUrl = rawWeek ? parseInt(rawWeek, 10) : NaN;

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
        const maxWeek = Math.max(initialLeague.totalWeeks, initialLeague.currentWeek);
        const initialWeek =
          Number.isInteger(parsedWeekFromUrl) &&
          parsedWeekFromUrl >= 1 &&
          parsedWeekFromUrl <= maxWeek
            ? parsedWeekFromUrl
            : 0;
        const requestedWeek = initialWeek === 0 ? undefined : initialWeek;

        setSelectedWeek(initialWeek);
        setSelectedSeason(initialLeague.season);
        setAvailableSeasons(seasons);

        await fetchAndApplyData(initialLeague.leagueId, requestedWeek);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchLeagueContext, fetchLeague, fetchAndApplyData]);

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
        await fetchAndApplyData(targetLeague.leagueId, week);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, selectedSeason]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedWeek > 0) {
      params.set("week", String(selectedWeek));
    } else {
      params.delete("week");
    }
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [selectedWeek]);

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
              <Image
                src={league.avatar}
                alt={league.name}
                width={32}
                height={32}
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
        <div className="flex flex-wrap items-center gap-2">
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
            Loading dashboard...
          </div>
        </div>
      ) : activeTab === "weekly-recap" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary">
              {selectedWeek === 0
                ? `Showing latest completed week: Week ${recapWeek}`
                : `Showing selected week: Week ${selectedWeek}`}
            </p>
            {league && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWeek(Math.max(1, (selectedWeek === 0 ? recapWeek : selectedWeek) - 1))
                  }
                  disabled={(selectedWeek === 0 ? recapWeek : selectedWeek) <= 1}
                  className="px-2 py-1 text-[10px] uppercase tracking-widest border border-[#333] rounded text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-secondary"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWeek(
                      Math.min(
                        Math.max(league.totalWeeks, league.currentWeek),
                        (selectedWeek === 0 ? recapWeek : selectedWeek) + 1
                      )
                    )
                  }
                  disabled={
                    (selectedWeek === 0 ? recapWeek : selectedWeek) >=
                    Math.max(league.totalWeeks, league.currentWeek)
                  }
                  className="px-2 py-1 text-[10px] uppercase tracking-widest border border-[#333] rounded text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          <WeeklyRecapFeed week={recapWeek} matchups={recapMatchups} highlights={recapHighlights} />
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
            {activeTab === "roast" ? "Roast" : activeTab === "luck" ? "Luck" : "Tab"}
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
