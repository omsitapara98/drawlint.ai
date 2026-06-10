import type { ObjectId } from "mongodb";

/* ── Daily Drill ─────────────────────────────────────────────── */

export interface DrillQuestion {
  id: string;
  prompt: string;
  /** Exactly 4 answer options */
  options: string[];
  /** Index of the correct option, 0-3 */
  correctIndex: number;
  explanation: string;
}

/** Cached shared question set for a day — includes correct answers (server-only). */
export interface DailyDrill {
  _id: ObjectId;
  /** UTC day identifier, e.g. "2026-06-10" */
  dayId: string;
  category: string;
  questions: DrillQuestion[];
  createdAt: Date;
}

/* ── Drill Attempt ───────────────────────────────────────────── */

export interface DrillAttempt {
  _id: ObjectId;
  userId: ObjectId;
  dayId: string;
  category: string;
  /** Selected option index per question */
  answers: number[];
  correctCount: number;
  score: number;
  durationMs: number;
  submittedAt: Date;
}

/* ── User Drill Stats ────────────────────────────────────────── */

export interface UserDrillStats {
  _id: ObjectId;
  userId: ObjectId;
  currentStreak: number;
  longestStreak: number;
  /** UTC day of last completed drill, e.g. "2026-06-10" */
  lastCompletedDay: string;
  totalCompleted: number;
  totalPoints: number;
  updatedAt: Date;
}

/* ── Scoring ─────────────────────────────────────────────────── */

/** 20 points per correct answer → 100 max for 5 questions. */
export const POINTS_PER_CORRECT = 20;

/** Cap used for the speed bonus calculation (2 minutes). */
const SPEED_BONUS_WINDOW_MS = 120000;

/** Maximum speed bonus awarded for a perfect, instant run. */
export const MAX_SPEED_BONUS = 10;

/**
 * Compute a drill score: 20 points per correct answer plus a small speed bonus
 * (up to +10) that scales with how fast the drill was completed. The bonus is
 * awarded proportionally to correctCount/5, so a fast-but-wrong run earns little.
 */
export function computeScore(correctCount: number, durationMs: number): number {
  const base = correctCount * POINTS_PER_CORRECT;
  const speedFactor = 1 - Math.min(durationMs, SPEED_BONUS_WINDOW_MS) / SPEED_BONUS_WINDOW_MS;
  const accuracyFactor = correctCount / 5;
  const speedBonus = Math.max(0, Math.round(MAX_SPEED_BONUS * speedFactor * accuracyFactor));
  return base + speedBonus;
}

/* ── Categories ──────────────────────────────────────────────── */

export const DRILL_CATEGORY_STORAGE = "storage";
/** All system-design patterns (the full Design Patterns module). */
export const DRILL_CATEGORY_PATTERNS = "patterns";
export const DEFAULT_DRILL_CATEGORY = DRILL_CATEGORY_PATTERNS;

/* ── Helpers ──────────────────────────────────────────────────── */

/** Get the UTC day identifier for a date, e.g. "2026-06-10". */
export function getDayId(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Get the previous calendar day identifier (UTC). */
export function getPreviousDayId(dayId: string): string {
  const [yearStr, monthStr, dayStr] = dayId.split("-");
  const d = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)));
  d.setUTCDate(d.getUTCDate() - 1);
  return getDayId(d);
}
