"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleCheckBig, Circle, Loader2, LogIn, X } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Module-level store: completion is shared across the sidebar, the
   hub, and the per-lesson button on a page. Source of truth is the
   database for signed-in users (cross-device); anonymous users fall
   back to localStorage and their progress migrates on sign-in.
   ────────────────────────────────────────────────────────────── */

const LS_KEY = "drawlint:learn:completed";

let completed = new Set<string>();
let authenticated = false;
let authResolved = false;
let loaded = false;
let version = 0;

const listeners = new Set<() => void>();
function emit() {
  version += 1;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => version;
const getServerSnapshot = () => 0;

function loadLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

async function init() {
  if (loaded) return;
  loaded = true;

  // Any progress saved locally before sign-in was required; migrate on auth.
  const legacyLocal = loadLocal();

  try {
    const res = await fetch("/api/learn/progress");
    if (res.ok) {
      const data = (await res.json()) as {
        authenticated: boolean;
        completed: string[];
      };
      authenticated = data.authenticated;

      if (authenticated) {
        const dbSet = new Set(data.completed ?? []);
        const localOnly = legacyLocal.filter((s) => !dbSet.has(s));
        // Merge so nothing is lost, then migrate local-only items into the DB.
        completed = new Set([...dbSet, ...legacyLocal]);
        for (const slug of localOnly) {
          void persist(slug, true);
        }
        try {
          localStorage.removeItem(LS_KEY);
        } catch {
          /* ignore */
        }
      } else {
        // Anonymous users can't save progress — keep state empty and prompt
        // them to sign in when they try to mark a lesson complete.
        completed = new Set();
      }
    }
  } catch {
    /* offline / network error — treat as anonymous */
  } finally {
    authResolved = true;
    emit();
  }
}

async function persist(slug: string, value: boolean) {
  try {
    await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, completed: value }),
    });
  } catch {
    /* best-effort; local state already updated */
  }
}

function setCompleted(slug: string, value: boolean) {
  // Progress only persists for signed-in users; anonymous toggles are gated
  // in the UI (which prompts sign-in instead of mutating state).
  if (!authenticated) return;
  if (value) completed.add(slug);
  else completed.delete(slug);
  emit();
  void persist(slug, value);
}

export type LearnProgress = {
  isCompleted: (slug: string) => boolean;
  toggle: (slug: string) => void;
  count: number;
  authenticated: boolean;
  ready: boolean;
};

export function useLearnProgress(): LearnProgress {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    void init();
  }, []);
  return {
    isCompleted: (slug: string) => completed.has(slug),
    toggle: (slug: string) => setCompleted(slug, !completed.has(slug)),
    count: completed.size,
    authenticated,
    ready: authResolved,
  };
}

/* ── UI: per-lesson completion button ──────────────────────────── */

export function MarkComplete({ slug }: { slug: string }) {
  const { isCompleted, toggle, authenticated, ready } = useLearnProgress();
  const pathname = usePathname();
  const done = isCompleted(slug);
  const [prompt, setPrompt] = useState(false);

  function handleClick() {
    if (!ready) return;
    if (!authenticated) {
      setPrompt(true);
      return;
    }
    toggle(slug);
  }

  const callbackUrl = encodeURIComponent(pathname || "/learn");

  return (
    <div className="mt-12 rounded-xl border border-border bg-card p-5">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="mb-3 sm:mb-0">
          <div className="font-semibold font-heading">
            {done ? "Lesson complete 🎉" : "Finished this lesson?"}
          </div>
          <p className="text-sm text-muted-foreground">
            {done
              ? "Nice work. Your progress is saved to your account."
              : "Mark it complete to track your progress through the workbook."}
          </p>
        </div>
        <button
          onClick={handleClick}
          aria-pressed={done}
          disabled={!ready}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
            done
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              : "bg-violet-500 text-white hover:bg-violet-600"
          }`}
        >
          {!ready ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </>
          ) : done ? (
            <>
              <CircleCheckBig className="h-4 w-4" /> Completed — undo?
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Mark as complete
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {prompt && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-violet-500/30 bg-violet-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <p className="text-sm text-foreground">
                  <span className="font-medium">Sign in to save your progress.</span>{" "}
                  <span className="text-muted-foreground">
                    Track completed lessons across all your devices.
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/signin?callbackUrl=${callbackUrl}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
                <button
                  onClick={() => setPrompt(false)}
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
    </div>
  );
}

/* ── UI: small status icon for sidebar / hub rows ──────────────── */

export function LessonStatusIcon({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const { isCompleted } = useLearnProgress();
  return isCompleted(slug) ? (
    <CircleCheckBig
      className={`h-4 w-4 shrink-0 text-emerald-500 ${className}`}
    />
  ) : (
    <Circle className={`h-4 w-4 shrink-0 text-muted-foreground/30 ${className}`} />
  );
}

/* ── UI: overall progress meter (fills the sidebar gutter) ─────── */

export function ProgressMeter({ total }: { total: number }) {
  const { count } = useLearnProgress();
  const safeCount = Math.min(count, total);
  const pct = total > 0 ? Math.round((safeCount / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          Your progress
        </span>
        <span className="font-medium tabular-nums text-foreground">
          {safeCount}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">
        {pct === 100
          ? "All lessons complete — legend. 🏆"
          : `${pct}% of the workbook done`}
      </div>
    </div>
  );
}

export { Loader2 as ProgressSpinner };
