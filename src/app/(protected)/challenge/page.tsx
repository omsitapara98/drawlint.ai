"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import {
  Flame,
  Clock,
  Trophy,
  ArrowRight,
  Loader2,
  Lock,
  ChevronRight,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */

interface ChallengeTopic {
  _id: string;
  name: string;
  slug: string;
  difficulty?: "easy" | "medium" | "hard";
  brief?: string;
  requirements?: string[];
  timeMinutes?: number;
}

interface CurrentChallenge {
  challenge: {
    _id: string;
    weekId: string;
    startDate: string;
    endDate: string;
  };
  topic: ChallengeTopic | null;
  userSubmitted: boolean;
  userDraftDesignId: string | null;
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

interface PastChallenge {
  _id: string;
  weekId: string;
  startDate: string;
  endDate: string;
  submissionCount: number;
  topic: { _id: string; name: string; slug: string; difficulty?: string } | null;
}

interface Streak {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  lastCompletedWeek: string | null;
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

function shortDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const mo: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", mo)}-${e.toLocaleDateString("en-US", mo)}`;
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

export default function ChallengePage() {
  const router = useRouter();
  const [current, setCurrent] = useState<CurrentChallenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<PastChallenge[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChallenge, setStartingChallenge] = useState(false);

  /** Start or continue a challenge — creates a draft design, then opens canvas */
  const handleStartChallenge = useCallback(async () => {
    if (!current?.topic) return;
    setStartingChallenge(true);
    try {
      const res = await fetch("/api/challenge/start", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to start challenge");
        return;
      }
      const data = (await res.json()) as { designId: string };
      router.push(`/canvas?edit=${data.designId}&topic=${current.topic.slug}&challenge=${current.challenge.weekId}`);
    } catch {
      setError("Failed to start challenge");
    } finally {
      setStartingChallenge(false);
    }
  }, [current, router]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [curRes, streakRes, histRes] = await Promise.all([
          fetch("/api/challenge/current"),
          fetch("/api/challenge/streak"),
          fetch("/api/challenge/history?limit=12"),
        ]);

        if (!curRes.ok) throw new Error("Failed to load current challenge");

        const curData = await curRes.json();
        const streakData = streakRes.ok ? await streakRes.json() : { streak: null };
        const histData = histRes.ok ? await histRes.json() : { challenges: [] };

        if (cancelled) return;

        setCurrent(curData);
        setStreak(streakData.streak);
        setHistory(histData.challenges ?? []);

        // Fetch leaderboard if user submitted
        if (curData.userSubmitted && curData.challenge?.weekId) {
          const lbRes = await fetch(
            `/api/challenge/leaderboard?weekId=${curData.challenge.weekId}`,
          );
          if (lbRes.ok) {
            const lbData = await lbRes.json();
            if (!cancelled) setLeaderboard(lbData.leaderboard ?? []);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Loading state ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────────── */

  if (error || !current?.challenge) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-lg font-semibold text-destructive">
            {error ?? "No active challenge this week."}
          </p>
          <Link
            href="/library"
            className="text-sm text-violet-500 hover:underline"
          >
            Browse the design library →
          </Link>
        </div>
      </div>
    );
  }

  const { challenge, topic, userSubmitted, userDraftDesignId, submissionCount } = current;
  const diff = topic?.difficulty ? DIFFICULTY_CONFIG[topic.difficulty] : null;
  const remaining = countdown(challenge.endDate);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-br from-violet-500/8 via-background to-cyan-500/5 dark:from-violet-500/10 dark:via-background dark:to-cyan-500/5 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-orange-500">
              <Flame className="h-4 w-4" /> Weekly Challenge
            </span>
            {streak && streak.currentStreak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                <Flame className="h-3.5 w-3.5" /> {streak.currentStreak}
              </span>
            )}
          </div>

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

          {/* CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {userSubmitted ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  ✅ Submitted this week
                </span>
                <Link
                  href={`/library/${topic?.slug}`}
                  className="text-sm font-medium text-violet-500 hover:underline"
                >
                  View your submission <ChevronRight className="inline h-3.5 w-3.5" />
                </Link>
              </>
            ) : userDraftDesignId ? (
              <button
                onClick={handleStartChallenge}
                disabled={startingChallenge}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400 disabled:opacity-50"
              >
                {startingChallenge ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                Continue Challenge <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleStartChallenge}
                disabled={startingChallenge}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-500 disabled:opacity-50"
              >
                {startingChallenge ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Start Challenge
              </button>
            )}
          </div>

          {/* Countdown + submissions */}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {remaining}
            </span>
            <span>{submissionCount} submission{submissionCount !== 1 && "s"}</span>
          </div>
        </div>
      </section>

      {/* ── Leaderboard Section ────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
        </h2>

        <div className={`mt-4 ${cardCls} overflow-hidden`}>
          {!userSubmitted ? (
            /* Gated / blurred state */
            <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="pointer-events-none absolute inset-0 backdrop-blur-sm" />
              <Lock className="relative h-8 w-8 text-muted-foreground/60" />
              <p className="relative text-sm font-medium text-muted-foreground">
                Submit your design to view the leaderboard
              </p>
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No submissions yet this week.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-white/[0.06] text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Signal</th>
                    <th className="px-4 py-3 text-right font-medium">Submitted</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Past Challenges Section ────────────────────────────────── */}
      {history.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-4 pb-16">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            📚 Past Challenges
          </h2>

          <div className={`mt-4 divide-y divide-border dark:divide-white/[0.06] ${cardCls}`}>
            {history.map((c) => {
              const d = c.topic?.difficulty
                ? DIFFICULTY_CONFIG[c.topic.difficulty]
                : null;
              return (
                <Link
                  key={c._id}
                  href={c.topic?.slug ? `/library/${c.topic.slug}` : "#"}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="font-semibold">
                    {weekNumber(c.weekId)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {shortDateRange(c.startDate, c.endDate)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium">
                    {c.topic?.name ?? "Unknown"}
                  </span>
                  {d && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${d.color}`}
                    >
                      {d.label}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.submissionCount} submission{c.submissionCount !== 1 && "s"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
