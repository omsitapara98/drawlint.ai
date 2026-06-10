"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  LogIn,
  Flame,
  Trophy,
  RotateCcw,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { POINTS_PER_CORRECT, MAX_SPEED_BONUS } from "@/types/drills";

/* ── Types (mirror the /api/drills contract) ───────────────────── */

interface DrillQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface PreviousAttempt {
  score: number;
  correctCount: number;
}

interface TodayPayload {
  dayId: string;
  category: string;
  questions: DrillQuestion[];
  alreadyPlayed: boolean;
  previousAttempt: PreviousAttempt | null;
}

interface QuestionResult {
  correctIndex: number;
  explanation: string;
  userAnswer: number;
  correct: boolean;
}

interface DrillStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalPoints: number;
  lastCompletedDay?: string | null;
  alreadyPlayedToday?: boolean;
}

interface SubmitResponse {
  recorded: boolean;
  alreadyPlayed?: boolean;
  requiresSignIn?: boolean;
  correctCount: number;
  score: number;
  results: QuestionResult[];
  stats?: DrillStats;
}

const cardCls =
  "rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md";

export function DrillRunner() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  // Signed-in user already scored today; null until today's payload resolves.
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/drills/today");
        if (!res.ok) throw new Error("Failed to load today's drill");
        const payload = (await res.json()) as TodayPayload;
        if (cancelled) return;
        setData(payload);
        setAnswers(new Array(payload.questions.length).fill(-1));
        setStartTime(Date.now());
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function selectOption(qIdx: number, optIdx: number) {
    if (result) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  }

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    try {
      const durationMs = Date.now() - startTime;
      const res = await fetch("/api/drills/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, durationMs }),
      });
      const payload = (await res.json()) as SubmitResponse;
      setResult(payload);
    } catch {
      setError("Failed to submit your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startPractice() {
    if (!data) return;
    setPracticeMode(true);
    setAnswers(new Array(data.questions.length).fill(-1));
    setCurrentIdx(0);
    setResult(null);
    setStartTime(Date.now());
  }

  /* ── Loading / error ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className={`${cardCls} flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading today&apos;s drill…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${cardCls} px-6 py-12 text-center text-sm text-muted-foreground`}>
        {error ?? "No drill available right now. Check back soon."}
      </div>
    );
  }

  /* ── Already played (signed-in) — show previous result ───────── */

  if (data.alreadyPlayed && !practiceMode && !result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`${cardCls} px-6 py-10 text-center`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <Trophy className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold tracking-tight">You&apos;ve completed today&apos;s drill</h3>
        {data.previousAttempt && (
          <p className="mt-2 text-sm text-muted-foreground">
            You scored{" "}
            <span className="font-semibold text-foreground">
              {data.previousAttempt.correctCount * POINTS_PER_CORRECT}/
              {data.questions.length * POINTS_PER_CORRECT}
            </span>{" "}
            points +{" "}
            <span className="font-semibold text-foreground">
              {data.previousAttempt.score - data.previousAttempt.correctCount * POINTS_PER_CORRECT}/
              {MAX_SPEED_BONUS}
            </span>{" "}
            speed points, with{" "}
            <span className="font-semibold text-foreground">
              {data.previousAttempt.correctCount}/{data.questions.length}
            </span>{" "}
            correct.
          </p>
        )}
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3.5 py-2 text-sm font-medium text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> Come back tomorrow for a new drill
          </span>
          <button
            onClick={startPractice}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
          >
            <RotateCcw className="h-4 w-4" /> Practice again (not scored)
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── Results view ────────────────────────────────────────────── */

  if (result) {
    return (
      <DrillResults
        questions={data.questions}
        result={result}
        practiceMode={practiceMode}
        onPractice={startPractice}
      />
    );
  }

  /* ── Quiz (one question at a time) ───────────────────────────── */

  const total = data.questions.length;
  const q = data.questions[currentIdx];
  const selected = answers[currentIdx];
  const allAnswered = answers.every((a) => a >= 0);
  const isLast = currentIdx === total - 1;

  return (
    <div className={`${cardCls} overflow-hidden`}>
      {practiceMode && (
        <div className="border-b border-border bg-violet-500/[0.06] px-5 py-2.5 text-center text-xs font-medium text-violet-600 dark:text-violet-300">
          Practice mode — this run won&apos;t affect the leaderboard
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <span className="text-xs font-medium text-muted-foreground">
          Question {currentIdx + 1} of {total}
        </span>
        <div className="flex flex-1 items-center gap-1.5">
          {data.questions.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentIdx || answers[i] >= 0
                  ? "bg-gradient-to-r from-violet-500 to-cyan-500"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="px-5 py-6"
        >
          <p className="text-base font-medium leading-relaxed">{q.prompt}</p>

          <div className="mt-5 grid gap-2.5">
            {q.options.map((opt, optIdx) => {
              const isSel = selected === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => selectOption(currentIdx, optIdx)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                    isSel
                      ? "border-violet-500 bg-violet-500/10 text-foreground shadow-[0_0_0_1px_oklch(0.72_0.25_285_/_30%)]"
                      : "border-border bg-card hover:border-violet-500/40 hover:bg-muted/60"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      isSel
                        ? "border-violet-500 bg-violet-500 text-white"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Grading…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Submit answers
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
            disabled={selected < 0}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Results sub-view ──────────────────────────────────────────── */

function DrillResults({
  questions,
  result,
  practiceMode,
  onPractice,
}: {
  questions: DrillQuestion[];
  result: SubmitResponse;
  practiceMode: boolean;
  onPractice: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const total = questions.length;
  const scored = result.recorded && !practiceMode;

  return (
    <div className="grid gap-4">
      {/* Score header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${cardCls} px-6 py-7 text-center`}
      >
        <div className="text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            {result.score}
          </span>
          <span className="text-2xl text-muted-foreground"> / 110</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.correctCount}/{total} correct
          {practiceMode ? " · practice run" : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {result.correctCount * POINTS_PER_CORRECT}/{total * POINTS_PER_CORRECT}
          </span>{" "}
          points
          <span className="mx-1 text-muted-foreground/50">+</span>
          <span className="font-medium text-foreground">
            {result.score - result.correctCount * POINTS_PER_CORRECT}/{MAX_SPEED_BONUS}
          </span>{" "}
          speed points
        </p>

        {scored && result.stats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-sm font-semibold text-orange-600 dark:text-orange-300"
          >
            <Flame className="h-4 w-4" />
            {result.stats.currentStreak}-day streak
            {result.stats.currentStreak > 0 && result.stats.currentStreak === result.stats.longestStreak && (
              <Sparkles className="h-4 w-4 text-amber-400" />
            )}
          </motion.div>
        )}

        {result.alreadyPlayed && !practiceMode && (
          <p className="mt-3 text-xs text-muted-foreground">
            You already played today — this run wasn&apos;t recorded again.
          </p>
        )}
      </motion.div>

      {/* Anonymous sign-in flash (mirrors learn progress card) */}
      <AnimatePresence>
        {result.requiresSignIn && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-violet-500/30 bg-violet-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <p className="text-sm text-foreground">
                  <span className="font-medium">Sign in to save your score.</span>{" "}
                  <span className="text-muted-foreground">
                    Build your streak and climb the leaderboard.
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/signin?callbackUrl=/drills"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
                <button
                  onClick={() => setDismissed(true)}
                  aria-label="Dismiss"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-question breakdown */}
      <div className="grid gap-3">
        {questions.map((q, i) => {
          const r = result.results[i];
          return (
            <div key={q.id} className={`${cardCls} px-5 py-4`}>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    r.correct
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {r.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <p className="text-sm font-medium leading-relaxed">{q.prompt}</p>
              </div>

              <div className="mt-3 grid gap-2 pl-9">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === r.correctIndex;
                  const isUserWrong = optIdx === r.userAnswer && !r.correct;
                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                        isCorrect
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : isUserWrong
                            ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[0.65rem] font-bold">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                      {isCorrect && <Check className="ml-auto h-3.5 w-3.5" />}
                      {isUserWrong && <X className="ml-auto h-3.5 w-3.5" />}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 pl-9 text-xs leading-relaxed text-muted-foreground">
                {r.explanation}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <button
          onClick={onPractice}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" /> Practice again (not scored)
        </button>
      </div>
    </div>
  );
}
