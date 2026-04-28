"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// Versioned key — bump suffix to re-show tour to all users when content changes.
const STORAGE_KEY = "drawlint:landing-tour-v4";
const SEEN_VALUE = "seen";

type Step = {
  id: string;
  title: string;
  body: string;
  /** CSS selector to highlight. Omit for centered welcome step. */
  target?: string;
  /** Preferred tooltip placement relative to target. Auto-flips if no room. */
  placement?: "top" | "bottom" | "left" | "right";
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to DrawLint.ai",
    body: "Sketch your system design, get instant feedback from 6 specialized AI reviewers, and earn a hire signal. The DrawLint.ai logo here is also your Home button — click it any time to return to this page. Take a 30-second tour to see what each part of the header does.",
    target: '[data-tour="header-logo"]',
    placement: "bottom",
  },
  {
    id: "challenge",
    title: "Weekly Challenge",
    body: "A new problem drops every Monday. One-shot submission, global leaderboard, and a streak counter to keep you consistent.",
    target: '[data-tour="header-challenge"]',
    placement: "bottom",
  },
  {
    id: "library",
    title: "System Design Library",
    body: "Browse 50+ classic system design problems across 4 difficulty levels. Two tabs: Official (curated solutions) and Community (real submissions from other engineers).",
    target: '[data-tour="header-library"]',
    placement: "bottom",
  },
  {
    id: "guide",
    title: "Drawing Guide",
    body: "New to system design diagrams? Learn the shapes, arrows, and labels our AI reviewers expect — so your sketch gets scored fairly on the first try.",
    target: '[data-tour="header-guide"]',
    placement: "bottom",
  },
  {
    id: "ai-setup",
    title: "AI Setup — Bring Your Own Keys",
    body: "Three options: DrawLint AI (managed, best quality), or your own OpenAI / Gemini keys. Your keys stay in your browser — never on our servers.",
    target: '[data-tour="header-ai-setup"]',
    placement: "bottom",
  },
  {
    id: "support",
    title: "Support & FAQ",
    body: "Stuck or curious? Find answers about AI providers, scoring, privacy, and more. You can also email us at drawlint.ai.support@gmail.com.",
    target: '[data-tour="header-support"]',
    placement: "bottom",
  },
  {
    id: "about",
    title: "About DrawLint",
    body: "Our mission, the story behind the product, and a deeper look at how the 6-reviewer pipeline assigns your hire signal.",
    target: '[data-tour="header-about"]',
    placement: "bottom",
  },
  {
    id: "account",
    title: "Theme & Account",
    body: "Toggle dark / light mode, then sign in to save your designs, track streaks, and sync progress across devices.",
    target: '[data-tour="header-account"]',
    placement: "bottom",
  },
];

const TOOLTIP_WIDTH = 360;
const TOOLTIP_GAP = 14;
const VIEWPORT_PAD = 16;
const SPOTLIGHT_PAD = 8;
const SPOTLIGHT_RADIUS = 12;

type Rect = { top: number; left: number; width: number; height: number };

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === SEEN_VALUE;
  } catch {
    return false;
  }
}

function writeSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, SEEN_VALUE);
  } catch {
    /* private mode — silently ignore */
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export default function LandingTour() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const reducedMotion = usePrefersReducedMotion();

  const step = STEPS[stepIdx];

  // Mount + first-visit gate.
  useEffect(() => {
    setMounted(true);
    if (readSeen()) return;
    // Defer slightly so header has finished laying out / fonts settled.
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Mark seen as soon as the tour starts. Refresh-mid-tour or skip both count
  // as seen — avoids re-prompt loops on accidental reload.
  useEffect(() => {
    if (active) writeSeen();
  }, [active]);

  // Lock body scroll while tour is active + broadcast active state.
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (active) {
      document.body.style.overflow = "hidden";
      if (typeof window !== "undefined") {
        document.documentElement.dataset.landingTourActive = "true";
      }
    }
    return () => {
      document.body.style.overflow = prev;
      if (typeof window !== "undefined") {
        delete document.documentElement.dataset.landingTourActive;
      }
    };
  }, [active]);

  // Measure target on step change + on resize.
  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (!active) return;
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, measure]);

  const finish = useCallback(() => {
    writeSeen();
    setActive(false);
  }, []);

  const next = useCallback(() => {
    setStepIdx((i) => {
      if (i >= STEPS.length - 1) {
        writeSeen();
        setActive(false);
        return i;
      }
      return i + 1;
    });
  }, []);

  const back = useCallback(() => {
    setStepIdx((i) => Math.max(0, i - 1));
  }, []);

  // Esc closes.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, next, back]);

  // Spotlight rect (with padding).
  const spot = useMemo(() => {
    if (!targetRect) return null;
    return {
      x: Math.max(0, targetRect.left - SPOTLIGHT_PAD),
      y: Math.max(0, targetRect.top - SPOTLIGHT_PAD),
      w: targetRect.width + SPOTLIGHT_PAD * 2,
      h: targetRect.height + SPOTLIGHT_PAD * 2,
    };
  }, [targetRect]);

  // Tooltip placement.
  const tooltipPos = useMemo(() => {
    if (!viewport.w) return null;
    if (!targetRect) {
      // Centered (welcome / no target).
      return {
        top: Math.max(VIEWPORT_PAD, viewport.h / 2 - 140),
        left: Math.max(VIEWPORT_PAD, viewport.w / 2 - TOOLTIP_WIDTH / 2),
        arrow: null as null | { side: "top" | "bottom"; offset: number },
      };
    }
    const placement = step.placement ?? "bottom";
    const targetCenterX = targetRect.left + targetRect.width / 2;
    let top: number;
    let arrowSide: "top" | "bottom" = "top";

    if (placement === "bottom") {
      top = targetRect.top + targetRect.height + TOOLTIP_GAP;
      arrowSide = "top";
    } else {
      top = targetRect.top - TOOLTIP_GAP - 180; // approx tooltip height
      arrowSide = "bottom";
    }

    let left = targetCenterX - TOOLTIP_WIDTH / 2;
    // Clamp horizontally inside viewport with padding.
    const minLeft = VIEWPORT_PAD;
    const maxLeft = viewport.w - TOOLTIP_WIDTH - VIEWPORT_PAD;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = Math.max(minLeft, maxLeft);

    // Arrow offset relative to tooltip's left edge — keeps arrow pointing at target center.
    const rawArrowOffset = targetCenterX - left;
    const arrowOffset = Math.max(20, Math.min(TOOLTIP_WIDTH - 20, rawArrowOffset));

    return {
      top,
      left,
      arrow: { side: arrowSide, offset: arrowOffset },
    };
  }, [targetRect, viewport, step]);

  if (!mounted || !active) return null;

  const isLast = stepIdx === STEPS.length - 1;
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 30 };

  return createPortal(
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-tour-title"
    >
      {/* Click-anywhere-to-dismiss backdrop, but only the area outside the tooltip & spotlight */}
      <button
        aria-label="Skip tour"
        onClick={finish}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      {/* SVG mask: dim everything, cut a hole around the target */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <mask id="landing-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.x}
                y={spot.y}
                width={spot.w}
                height={spot.h}
                rx={SPOTLIGHT_RADIUS}
                ry={SPOTLIGHT_RADIUS}
                fill="black"
              />
            )}
          </mask>
          <linearGradient id="landing-tour-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.72 0.25 285)" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 200)" />
          </linearGradient>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.72)"
          mask="url(#landing-tour-mask)"
        />

        {/* Glowing ring around the spotlight (no transforms — pure attribute-based positioning) */}
        {spot && (
          <motion.rect
            key={step.id}
            x={spot.x}
            y={spot.y}
            width={spot.w}
            height={spot.h}
            rx={SPOTLIGHT_RADIUS}
            ry={SPOTLIGHT_RADIUS}
            fill="none"
            stroke="url(#landing-tour-ring)"
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: reducedMotion ? 1 : [0.55, 1, 0.55] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            }
            style={{
              filter:
                "drop-shadow(0 0 8px oklch(0.72 0.25 285 / 0.7)) drop-shadow(0 0 16px oklch(0.78 0.18 200 / 0.45))",
            }}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        {tooltipPos && (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transition}
            style={{
              position: "fixed",
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: TOOLTIP_WIDTH,
            }}
            className="rounded-2xl border border-violet-500/30 bg-card/90 backdrop-blur-xl shadow-[0_0_50px_oklch(0.72_0.25_285_/_30%)] overflow-hidden"
          >
            {/* Arrow */}
            {tooltipPos.arrow && (
              <span
                aria-hidden="true"
                className="absolute h-3 w-3 rotate-45 border border-violet-500/30 bg-card/90 backdrop-blur-xl"
                style={{
                  left: tooltipPos.arrow.offset - 6,
                  ...(tooltipPos.arrow.side === "top"
                    ? { top: -6, borderRight: "none", borderBottom: "none" }
                    : { bottom: -6, borderLeft: "none", borderTop: "none" }),
                }}
              />
            )}

            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-wider text-violet-400/90">
                {String(stepIdx + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </span>
              <button
                onClick={finish}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>
            </div>

            <div className="px-5 pb-4">
              <h3
                id="landing-tour-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                {step.title}
              </h3>
              <p
                className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground"
                aria-live="polite"
              >
                {step.body}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 pb-4">
              <button
                onClick={back}
                disabled={stepIdx === 0}
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-medium text-white bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 shadow-[0_0_18px_oklch(0.72_0.25_285_/_45%)] transition-all"
              >
                {isLast ? "Done" : "Next"}
                {!isLast && <span aria-hidden="true">→</span>}
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-[2px] w-full bg-violet-500/10">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
