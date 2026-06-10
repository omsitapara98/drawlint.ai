import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type {
  DailyDrill,
  DrillAttempt,
  DrillQuestion,
  UserDrillStats,
} from "@/types/drills";
import { getPreviousDayId } from "@/types/drills";

const DB_NAME = "drawlint-db";

/* ── Custom Errors ───────────────────────────────────────────── */

export class DuplicateDrillAttemptError extends Error {
  constructor() {
    super("duplicate drill attempt");
    this.name = "DuplicateDrillAttemptError";
  }
}

/* ── Collection accessors ────────────────────────────────────── */

async function dailyDrillsCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<DailyDrill>("daily_drills");
}

async function attemptsCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<DrillAttempt>("drill_attempts");
}

async function statsCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDrillStats>("user_drill_stats");
}

/* ── Index bootstrap ─────────────────────────────────────────── */

let indexesEnsured = false;

/**
 * Idempotent index creation for the drills collections. Safe to call repeatedly;
 * only runs the createIndex calls once per process. Mirrors the index strategy in
 * src/scripts/setup-indexes.ts so the two stay in sync.
 */
export async function ensureDrillIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const attempts = await attemptsCol();
  const drills = await dailyDrillsCol();
  const stats = await statsCol();

  try {
    await attempts.createIndex(
      { userId: 1, dayId: 1, category: 1 },
      { unique: true, name: "one_attempt_per_user_per_day" },
    );
  } catch {
    // Index may already exist with different options; ignore.
  }
  await attempts.createIndex({ dayId: 1, category: 1, score: -1, durationMs: 1 });

  try {
    await drills.createIndex({ dayId: 1, category: 1 }, { unique: true });
  } catch {
    // Index may already exist; ignore.
  }

  try {
    await stats.createIndex({ userId: 1 }, { unique: true });
  } catch {
    // Index may already exist; ignore.
  }
  await stats.createIndex({ totalPoints: -1 });

  indexesEnsured = true;
}

/* ── Daily Drills (cached question sets) ─────────────────────── */

/** Get the cached drill for a specific day + category. */
export async function getDailyDrill(
  dayId: string,
  category: string,
): Promise<DailyDrill | null> {
  const col = await dailyDrillsCol();
  return col.findOne({ dayId, category });
}

/**
 * Persist the day's drill questions. Uses an upsert keyed on {dayId, category}
 * with $setOnInsert so two simultaneous first-requests cannot create duplicates;
 * the first writer wins and both callers read back the same stored document.
 */
export async function saveDailyDrill(
  dayId: string,
  category: string,
  questions: DrillQuestion[],
): Promise<DailyDrill> {
  const col = await dailyDrillsCol();
  await col.updateOne(
    { dayId, category },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        dayId,
        category,
        questions,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  const stored = await col.findOne({ dayId, category });
  if (!stored) throw new Error("failed to persist daily drill");
  return stored;
}

/* ── Drill Attempts ──────────────────────────────────────────── */

/** Get a user's attempt for a given day + category, if any. */
export async function getUserAttemptForDay(
  userId: string,
  dayId: string,
  category: string,
): Promise<DrillAttempt | null> {
  const col = await attemptsCol();
  return col.findOne({ userId: new ObjectId(userId), dayId, category });
}

/** Record a drill attempt. Throws DuplicateDrillAttemptError on repeat for the day. */
export async function recordAttempt(
  userId: string,
  dayId: string,
  category: string,
  answers: number[],
  correctCount: number,
  score: number,
  durationMs: number,
): Promise<DrillAttempt> {
  const col = await attemptsCol();
  const doc: DrillAttempt = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    dayId,
    category,
    answers,
    correctCount,
    score,
    durationMs,
    submittedAt: new Date(),
  };
  try {
    await col.insertOne(doc);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw new DuplicateDrillAttemptError();
    throw err;
  }
  return doc;
}

/**
 * Get the daily leaderboard rows for a day + category, ranked by score desc,
 * then fastest, then earliest. Returns raw attempt rows — user enrichment is the
 * route's responsibility (mirrors the challenges DB/route split).
 */
export async function getDailyLeaderboard(
  dayId: string,
  category: string,
  limit = 50,
): Promise<DrillAttempt[]> {
  const col = await attemptsCol();
  try {
    return await col
      .find({ dayId, category })
      .sort({ score: -1, durationMs: 1, submittedAt: 1 })
      .limit(limit)
      .toArray();
  } catch {
    const docs = await col.find({ dayId, category }).limit(limit).toArray();
    docs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
    return docs;
  }
}

/**
 * Get the all-time leaderboard rows, ranked by total points then longest streak.
 * Returns raw stats rows — user enrichment is the route's responsibility.
 */
export async function getAllTimeLeaderboard(limit = 50): Promise<UserDrillStats[]> {
  const col = await statsCol();
  try {
    return await col
      .find()
      .sort({ totalPoints: -1, longestStreak: -1 })
      .limit(limit)
      .toArray();
  } catch {
    const docs = await col.find().limit(limit).toArray();
    docs.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.longestStreak - a.longestStreak;
    });
    return docs.slice(0, limit);
  }
}

/* ── User Drill Stats ────────────────────────────────────────── */

/** Get a user's drill stats. */
export async function getUserDrillStats(userId: string): Promise<UserDrillStats | null> {
  const col = await statsCol();
  return col.findOne({ userId: new ObjectId(userId) });
}

/**
 * Update a user's drill stats after completing a drill. Idempotent per day: if the
 * day is already counted, returns the existing stats unchanged. Otherwise updates the
 * streak (consecutive if the previous calendar day was the last completed day),
 * longest streak, totals, and points.
 */
export async function updateDrillStats(
  userId: string,
  dayId: string,
  pointsEarned: number,
): Promise<UserDrillStats> {
  const col = await statsCol();
  const existing = await col.findOne({ userId: new ObjectId(userId) });

  if (!existing) {
    const doc: UserDrillStats = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDay: dayId,
      totalCompleted: 1,
      totalPoints: pointsEarned,
      updatedAt: new Date(),
    };
    await col.insertOne(doc);
    return doc;
  }

  // Already counted this day — idempotent guard.
  if (existing.lastCompletedDay === dayId) {
    return existing;
  }

  const isConsecutive = getPreviousDayId(dayId) === existing.lastCompletedDay;
  const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
  const newLongest = Math.max(existing.longestStreak, newStreak);
  const newTotalCompleted = existing.totalCompleted + 1;
  const newTotalPoints = existing.totalPoints + pointsEarned;

  const result = await col.findOneAndUpdate(
    { userId: new ObjectId(userId) },
    {
      $set: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCompletedDay: dayId,
        totalCompleted: newTotalCompleted,
        totalPoints: newTotalPoints,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return (
    result ?? {
      ...existing,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCompletedDay: dayId,
      totalCompleted: newTotalCompleted,
      totalPoints: newTotalPoints,
      updatedAt: new Date(),
    }
  );
}
