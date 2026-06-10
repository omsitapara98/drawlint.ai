"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  BookOpen,
  Sparkles,
  ChevronDown,
  Play,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";
import {
  MODULES,
  lessonGroups,
  LESSONS,
  type ModuleId,
} from "@/app/learn/_content/registry";
import { useLearnProgress, LessonStatusIcon } from "./progress";
import { LessonSearch } from "./LessonSearch";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const TOTAL_LESSONS = LESSONS.length;

// Module-ordered flat list of lessons (drives "continue" + per-module counts).
const ORDERED = MODULES.flatMap((m) =>
  lessonGroups(m.id).flatMap((g) => g.lessons),
);

function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function LearnHub() {
  const { isCompleted, count } = useLearnProgress();

  // First lesson the user hasn't finished — where "Continue" should land.
  const continueLesson =
    ORDERED.find((l) => !isCompleted(l.slug)) ?? ORDERED[0];
  const continueModuleId = continueLesson?.module;
  const started = count > 0;
  const allDone = count >= TOTAL_LESSONS && TOTAL_LESSONS > 0;
  const overallPct = pct(Math.min(count, TOTAL_LESSONS), TOTAL_LESSONS);

  // Expanded module cards — default-open the module you'd continue in.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isOpen = (id: ModuleId) => overrides[id] ?? id === continueModuleId;
  const toggle = (id: ModuleId) =>
    setOverrides((o) => ({ ...o, [id]: !(o[id] ?? id === continueModuleId) }));

  return (
    <>
      <ParticleBackground />
      <div className="relative min-h-screen">
        <Header />

        <main className="container mx-auto max-w-5xl px-4 py-14">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/30 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Beginner-friendly
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-heading mb-4 tracking-tight">
              System Design{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Workbook
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Learn system design from the ground up — clear explanations, real
              examples, and plain-English analogies. No prior experience needed.
            </p>
          </motion.div>

          {/* Global search */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto mb-12 max-w-xl"
          >
            <LessonSearch shortcut placeholder="Search any topic — caching, CAP, Kafka…" />
          </motion.div>

          {/* Primary actions: Workbook + Cheatsheet, side by side up top */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12 grid gap-4 sm:grid-cols-2"
          >
            {/* Workbook / continue card */}
            <Link
              href={`/learn/${continueLesson?.slug ?? ""}`}
              className="group relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.12] to-cyan-500/[0.06] p-6 transition-colors hover:border-violet-500/50"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                <BookOpen className="h-4 w-4" />
                The Workbook
              </div>
              <div className="mt-3 text-xl font-bold font-heading">
                {allDone
                  ? "Review the lessons"
                  : started
                    ? "Continue where you left off"
                    : "Start with the fundamentals"}
              </div>
              {continueLesson && !allDone && (
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {started ? "Up next: " : "First lesson: "}
                  {continueLesson.title}
                </div>
              )}

              {/* Overall progress */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    {Math.min(count, TOTAL_LESSONS)} of {TOTAL_LESSONS} lessons
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {overallPct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-violet-600">
                {started && !allDone ? (
                  <>
                    <Play className="h-4 w-4" /> Continue learning
                  </>
                ) : allDone ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> All complete — revisit
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Start the workbook
                  </>
                )}
              </div>
            </Link>

            {/* Cheatsheet card */}
            <Link
              href="/learn/cheatsheet"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-cyan-500/40"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                <Zap className="h-4 w-4" />
                Quick reference
              </div>
              <div className="mt-3 text-xl font-bold font-heading">
                The Cheatsheet
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Already know the basics? Jump to the condensed, scannable
                reference of every pattern, number, and trade-off.
              </p>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {["Patterns", "Capacity numbers", "Trade-offs", "Templates"].map(
                  (t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ),
                )}
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors group-hover:border-cyan-500/50 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                Open the cheatsheet
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </motion.div>

          {/* Module overview heading */}
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Browse the curriculum
          </div>

          {/* Modules — compact cards with progress + collapsible lessons */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {MODULES.map((mod) => {
              const groups = lessonGroups(mod.id);
              const modLessons = groups.flatMap((g) => g.lessons);
              const modDone = modLessons.filter((l) =>
                isCompleted(l.slug),
              ).length;
              const modPct = pct(modDone, modLessons.length);
              const open = isOpen(mod.id);
              const firstSlug =
                modLessons.find((l) => !isCompleted(l.slug))?.slug ??
                modLessons[0]?.slug;
              let counter = 0;
              return (
                <motion.section
                  key={mod.id}
                  variants={item}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {/* Card header — toggles the lesson list */}
                  <div className="flex items-start gap-4 p-5 sm:p-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xl">
                      {mod.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-lg font-bold font-heading">
                          {mod.title}
                        </h2>
                        <span className="text-xs font-medium text-muted-foreground">
                          {modDone}/{modLessons.length} done
                        </span>
                        {modPct === 100 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mod.description}
                      </p>

                      {/* Per-module progress bar */}
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500"
                          style={{ width: `${modPct}%` }}
                        />
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <Link
                          href={`/learn/${firstSlug ?? ""}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
                        >
                          {modDone > 0 ? (
                            <>
                              <Play className="h-3.5 w-3.5" /> Continue
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" /> Start
                            </>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggle(mod.id)}
                          aria-expanded={open}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {open ? "Hide" : "View"} lessons
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              open ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible lesson list */}
                  {open && (
                    <div className="border-t border-border/60 px-5 pb-5 pt-4 sm:px-6">
                      <div className="space-y-4">
                        {groups.map((grp, gi) => (
                          <div key={grp.group ?? gi}>
                            {grp.group && (
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-600/80 dark:text-violet-400/80">
                                {grp.group}
                              </div>
                            )}
                            <ol className="space-y-1.5">
                              {grp.lessons.map((l) => {
                                counter += 1;
                                const n = counter;
                                return (
                                  <li key={l.slug}>
                                    <Link
                                      href={`/learn/${l.slug}`}
                                      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
                                    >
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground group-hover:bg-violet-500 group-hover:text-white transition-colors">
                                        {n}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                          {l.title}
                                        </span>
                                        <span className="block truncate text-sm text-muted-foreground">
                                          {l.summary}
                                        </span>
                                      </span>
                                      <span className="hidden sm:flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {l.estReadMin}m
                                      </span>
                                      <LessonStatusIcon slug={l.slug} />
                                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                                    </Link>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        ))}
                        {mod.id === "patterns" && (
                          <Link
                            href="/learn/cheatsheet"
                            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            Prefer a quick reference? Open the Cheatsheet
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </motion.section>
              );
            })}
          </motion.div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <BookOpen className="h-4 w-4" />
            {TOTAL_LESSONS} lessons available · more on the way
          </motion.div>
        </main>
      </div>
    </>
  );
}
