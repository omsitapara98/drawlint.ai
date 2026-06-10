"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Trophy, Flame } from "lucide-react";

/* ── Types (mirror /api/drills/leaderboard) ────────────────────── */

interface DailyEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  correctCount: number;
  durationMs: number;
  submittedAt: string;
}

interface AllTimeEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
}

type Scope = "daily" | "all-time";

const cardCls =
  "rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md";

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function rankBadge(rank: number): string {
  if (rank === 1) return "bg-amber-400/20 text-amber-600 dark:text-amber-300";
  if (rank === 2) return "bg-slate-400/20 text-slate-600 dark:text-slate-300";
  if (rank === 3) return "bg-orange-500/20 text-orange-600 dark:text-orange-300";
  return "text-muted-foreground";
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={24}
        height={24}
        unoptimized
        className="h-6 w-6 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function DrillLeaderboard() {
  const [scope, setScope] = useState<Scope>("daily");
  const [daily, setDaily] = useState<DailyEntry[] | null>(null);
  const [allTime, setAllTime] = useState<AllTimeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = scope === "daily" ? daily : allTime;
    if (cached) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/drills/leaderboard?scope=${scope}`);
        if (!res.ok) throw new Error("failed");
        const payload = await res.json();
        if (cancelled) return;
        if (scope === "daily") {
          setDaily((payload.entries ?? []) as DailyEntry[]);
        } else {
          setAllTime((payload.entries ?? []) as AllTimeEntry[]);
        }
      } catch {
        if (!cancelled) {
          if (scope === "daily") setDaily([]);
          else setAllTime([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [scope, daily, allTime]);

  const entries = scope === "daily" ? daily : allTime;
  const isEmpty = entries !== null && entries.length === 0;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
      </h2>

      {/* Tabs */}
      <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/50 p-1">
        {(["daily", "all-time"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              scope === s ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {scope === s && (
              <motion.span
                layoutId="drill-lb-tab"
                className="absolute inset-0 rounded-md bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{s === "daily" ? "Daily" : "All-time"}</span>
          </button>
        ))}
      </div>

      <div className={`mt-4 ${cardCls} overflow-hidden`}>
        {loading || entries === null ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading leaderboard…
          </div>
        ) : isEmpty ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            {scope === "daily"
              ? "Be the first to play today!"
              : "No players yet — start a streak and lead the board."}
          </p>
        ) : scope === "daily" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-white/[0.06] text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                  <th className="px-4 py-3 text-right font-medium">Correct</th>
                  <th className="px-4 py-3 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {(daily ?? []).map((entry) => (
                  <tr
                    key={entry.rank}
                    className="border-b border-border/50 dark:border-white/[0.04] last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${rankBadge(entry.rank)}`}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar url={entry.avatarUrl} name={entry.displayName} />
                        <span className="max-w-[160px] truncate font-medium">
                          {entry.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {entry.score}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {entry.correctCount}/5
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatDuration(entry.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-white/[0.06] text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-right font-medium">Points</th>
                  <th className="px-4 py-3 text-right font-medium">Streak</th>
                  <th className="px-4 py-3 text-right font-medium">Drills</th>
                </tr>
              </thead>
              <tbody>
                {(allTime ?? []).map((entry) => (
                  <tr
                    key={entry.rank}
                    className="border-b border-border/50 dark:border-white/[0.04] last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${rankBadge(entry.rank)}`}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar url={entry.avatarUrl} name={entry.displayName} />
                        <span className="max-w-[160px] truncate font-medium">
                          {entry.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {entry.totalPoints}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        {entry.currentStreak}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {entry.totalCompleted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
