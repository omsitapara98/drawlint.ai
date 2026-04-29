"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout";
import {
  Clock,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";

/* ── Types ────────────────────────────────────────────────────── */

interface ChallengeTopic {
  _id: string;
  name: string;
  slug: string;
  difficulty?: "easy" | "medium" | "hard";
  brief?: string;
  timeMinutes?: number;
}

interface ChallengeDetail {
  challenge: {
    _id: string;
    weekId: string;
    startDate: string;
    endDate: string;
  };
  topic: ChallengeTopic | null;
  submissionCount: number;
}

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  signal: string;
  signalLabel: string;
  designId: string;
  submittedAt: string;
}

/* ── Style maps ───────────────────────────────────────────────── */

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: {
    label: "Easy",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  },
  medium: {
    label: "Medium",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
  hard: {
    label: "Hard",
    color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
  },
};

const SIGNAL_STYLES: Record<string, string> = {
  "strong-hire":
    "bg-emerald-500 text-white shadow-[0_0_8px_oklch(0.7_0.2_160_/_30%)]",
  hire: "bg-emerald-400 text-white shadow-[0_0_8px_oklch(0.7_0.2_160_/_30%)]",
  "lean-hire":
    "bg-yellow-400 text-yellow-900 shadow-[0_0_8px_oklch(0.8_0.15_90_/_30%)]",
  "lean-no-hire":
    "bg-orange-400 text-white shadow-[0_0_8px_oklch(0.65_0.2_25_/_30%)]",
  "no-hire":
    "bg-red-500 text-white shadow-[0_0_8px_oklch(0.65_0.2_25_/_30%)]",
};

/* ── Helpers ───────────────────────────────────────────────────── */

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`;
}

function countdown(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Challenge ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h remaining`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function weekNumber(weekId: string): string {
  const n = weekId.split("-W")[1];
  return n ? `Week ${parseInt(n, 10)}` : weekId;
}

/* ── Card wrapper ──────────────────────────────────────────────── */

const cardCls =
  "rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md";

/* ── Page component ────────────────────────────────────────────── */

export default function ChallengeWeekPage() {
  const params = useParams();
  const weekId = params.weekId as string;

  const [data, setData] = useState<ChallengeDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weekId) return;
    let cancelled = false;

    async function load() {
      try {
        const [detailRes, lbRes] = await Promise.all([
          fetch(`/api/challenge/${weekId}`),
          fetch(`/api/challenge/leaderboard?weekId=${weekId}`),
        ]);

        if (!detailRes.ok) {
          throw new Error(
            detailRes.status === 404
              ? "Challenge not found"
              : "Failed to load challenge",
          );
        }

        const detail = await detailRes.json();
        const lbData = lbRes.ok ? await lbRes.json() : { leaderboard: [] };

        if (cancelled) return;
        setData(detail);
        setLeaderboard(lbData.leaderboard ?? []);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [weekId]);

  /* ── Loading state ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner message="Loading challenge…" />
        </div>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────────── */

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-lg font-semibold text-destructive">
            {error ?? "Challenge not found."}
          </p>
          <Link href="/challenge" className="text-sm text-violet-500 hover:underline">
            ← All Challenges
          </Link>
        </div>
      </div>
    );
  }

  const { challenge, topic, submissionCount } = data;
  const diff = topic?.difficulty ? DIFFICULTY_CONFIG[topic.difficulty] : null;
  const remaining = countdown(challenge.endDate);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-br from-violet-500/8 via-background to-cyan-500/5 dark:from-violet-500/10 dark:via-background dark:to-cyan-500/5 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/challenge"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> All Challenges
          </Link>

          {/* Week + date range */}
          <p className="mt-2 text-sm text-muted-foreground">
            {weekNumber(challenge.weekId)} ·{" "}
            {formatDateRange(challenge.startDate, challenge.endDate)}
          </p>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {diff && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${diff.color}`}
              >
                {diff.label}
              </span>
            )}
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
              ✦ Official
            </span>
          </div>

          {/* Topic name + brief */}
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl font-heading">
            {topic?.name ?? "Challenge Topic"}
          </h1>
          {topic?.brief && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {topic.brief}
            </p>
          )}

          {/* Estimated time */}
          {topic?.timeMinutes && (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {topic.timeMinutes} min estimated
            </p>
          )}

          {topic?.slug && (
            <Link
              href={`/library/${topic.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-xs text-violet-500 hover:underline"
            >
              View this topic in Library <ChevronRight className="h-3 w-3" />
            </Link>
          )}

          {/* Countdown + submissions */}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {remaining}
            </span>
            <span>
              {submissionCount} submission{submissionCount !== 1 && "s"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Leaderboard Section ────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
        </h2>

        <div className={`mt-4 ${cardCls} overflow-hidden`}>
          {leaderboard.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No submissions recorded for this week.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-white/[0.06] text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Signal</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-right font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.rank}
                      className="border-b border-border/50 dark:border-white/[0.04] last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {entry.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {entry.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium truncate max-w-[160px]">
                            {entry.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${SIGNAL_STYLES[entry.signal] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {entry.signalLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {timeAgo(entry.submittedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/canvas?view=${entry.designId}`}
                          className="text-xs font-medium text-violet-500 hover:underline"
                        >
                          View <ChevronRight className="inline h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
