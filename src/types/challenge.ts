import type { ObjectId } from "mongodb";

/* ── Weekly Challenge ────────────────────────────────────────── */

export interface WeeklyChallenge {
  _id: ObjectId;
  /** ISO week identifier, e.g. "2026-W18" */
  weekId: string;
  topicId: ObjectId;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

/* ── Challenge Submission ────────────────────────────────────── */

/** Maps hire signals to leaderboard scores */
export const SIGNAL_SCORES: Record<string, number> = {
  "strong-hire": 5,
  hire: 4,
  "lean-hire": 3,
  "lean-no-hire": 2,
  "no-hire": 1,
};

export interface ChallengeSubmission {
  _id: ObjectId;
  challengeId: ObjectId;
  userId: ObjectId;
  designId: ObjectId;
  /** Leaderboard score: 5 (Strong Hire) → 1 (No Hire) */
  score: number;
  signal: string;
  submittedAt: Date;
}

/* ── User Streak ─────────────────────────────────────────────── */

export interface UserStreak {
  _id: ObjectId;
  userId: ObjectId;
  currentStreak: number;
  longestStreak: number;
  /** ISO week of last completed challenge, e.g. "2026-W18" */
  lastCompletedWeek: string;
  totalCompleted: number;
  updatedAt: Date;
}

/* ── Helpers ──────────────────────────────────────────────────── */

/** Get ISO week identifier for a date, e.g. "2026-W18" */
export function getWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday (ISO week algorithm)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Get previous ISO week identifier */
export function getPreviousWeekId(weekId: string): string {
  // Parse weekId "2026-W18" → compute Monday of that week, subtract 7 days
  const [yearStr, weekStr] = weekId.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  // Jan 4 is always in week 1 (ISO)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  // Go back 7 days
  monday.setUTCDate(monday.getUTCDate() - 7);
  return getWeekId(monday);
}

/** Get Monday 00:00 UTC and Sunday 23:59:59 UTC for a given week */
export function getWeekBounds(weekId: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekId.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}
