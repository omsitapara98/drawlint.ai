import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type { WeeklyChallenge, ChallengeSubmission, UserStreak } from "@/types/challenge";
import { getWeekId, getPreviousWeekId, getWeekBounds } from "@/types/challenge";

const DB_NAME = "drawlint-db";

/* ── Collection accessors ────────────────────────────────────── */

async function challengesCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<WeeklyChallenge>("weekly_challenges");
}

async function submissionsCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<ChallengeSubmission>("challenge_submissions");
}

async function streaksCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserStreak>("user_streaks");
}

/* ── Weekly Challenges ───────────────────────────────────────── */

/** Get the challenge for a specific week. */
export async function getChallengeByWeek(weekId: string): Promise<WeeklyChallenge | null> {
  const col = await challengesCol();
  return col.findOne({ weekId });
}

/** Get the current week's challenge. */
export async function getCurrentChallenge(): Promise<WeeklyChallenge | null> {
  return getChallengeByWeek(getWeekId());
}

/** Create a new weekly challenge. */
export async function createChallenge(
  topicId: string,
  weekId?: string,
): Promise<WeeklyChallenge> {
  const col = await challengesCol();
  const wid = weekId ?? getWeekId();
  const { start, end } = getWeekBounds(wid);

  const doc: WeeklyChallenge = {
    _id: new ObjectId(),
    weekId: wid,
    topicId: new ObjectId(topicId),
    startDate: start,
    endDate: end,
    createdAt: new Date(),
  };

  await col.insertOne(doc);
  return doc;
}

/** Get recent challenges for history, newest first. */
export async function getChallengeHistory(limit = 12): Promise<WeeklyChallenge[]> {
  const col = await challengesCol();
  try {
    return await col.find().sort({ startDate: -1 }).limit(limit).toArray();
  } catch {
    const docs = await col.find().limit(limit).toArray();
    docs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return docs;
  }
}

/** Get the last N challenge weekIds (for avoiding repeats). */
export async function getRecentChallengeTopicIds(lookback = 6): Promise<string[]> {
  const col = await challengesCol();
  try {
    const docs = await col
      .find()
      .sort({ startDate: -1 })
      .limit(lookback)
      .project({ topicId: 1 })
      .toArray();
    return docs.map((d) => d.topicId.toString());
  } catch {
    const docs = await col.find().limit(lookback).toArray();
    docs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return docs.slice(0, lookback).map((d) => d.topicId.toString());
  }
}

/* ── Challenge Submissions ───────────────────────────────────── */

/** Check if a user has already submitted for a challenge. */
export async function hasUserSubmitted(
  challengeId: string,
  userId: string,
): Promise<boolean> {
  const col = await submissionsCol();
  const count = await col.countDocuments({
    challengeId: new ObjectId(challengeId),
    userId: new ObjectId(userId),
  });
  return count > 0;
}

/** Record a challenge submission. */
export async function createChallengeSubmission(input: {
  challengeId: string;
  userId: string;
  designId: string;
  score: number;
  signal: string;
}): Promise<ChallengeSubmission> {
  const col = await submissionsCol();
  const doc: ChallengeSubmission = {
    _id: new ObjectId(),
    challengeId: new ObjectId(input.challengeId),
    userId: new ObjectId(input.userId),
    designId: new ObjectId(input.designId),
    score: input.score,
    signal: input.signal,
    submittedAt: new Date(),
  };
  await col.insertOne(doc);
  return doc;
}

/** Get leaderboard for a challenge, ranked by score desc then submittedAt asc. */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit = 20,
): Promise<ChallengeSubmission[]> {
  const col = await submissionsCol();
  try {
    return await col
      .find({ challengeId: new ObjectId(challengeId) })
      .sort({ score: -1, submittedAt: 1 })
      .limit(limit)
      .toArray();
  } catch {
    const docs = await col
      .find({ challengeId: new ObjectId(challengeId) })
      .limit(limit)
      .toArray();
    docs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
    return docs;
  }
}

/** Count submissions for a challenge. */
export async function getChallengeSubmissionCount(challengeId: string): Promise<number> {
  const col = await submissionsCol();
  return col.countDocuments({ challengeId: new ObjectId(challengeId) });
}

/* ── User Streaks ────────────────────────────────────────────── */

/** Get a user's streak data. */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
  const col = await streaksCol();
  return col.findOne({ userId: new ObjectId(userId) });
}

/** Update a user's streak after completing a challenge. */
export async function updateUserStreak(userId: string, completedWeekId: string): Promise<UserStreak> {
  const col = await streaksCol();
  const existing = await col.findOne({ userId: new ObjectId(userId) });

  if (!existing) {
    // First ever challenge
    const doc: UserStreak = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedWeek: completedWeekId,
      totalCompleted: 1,
      updatedAt: new Date(),
    };
    await col.insertOne(doc);
    return doc;
  }

  // Already counted this week
  if (existing.lastCompletedWeek === completedWeekId) {
    return existing;
  }

  const previousWeek = getPreviousWeekId(completedWeekId);
  const isConsecutive = existing.lastCompletedWeek === previousWeek;

  const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
  const newLongest = Math.max(existing.longestStreak, newStreak);

  const result = await col.findOneAndUpdate(
    { userId: new ObjectId(userId) },
    {
      $set: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCompletedWeek: completedWeekId,
        totalCompleted: existing.totalCompleted + 1,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return result ?? { ...existing, currentStreak: newStreak, longestStreak: newLongest, lastCompletedWeek: completedWeekId, totalCompleted: existing.totalCompleted + 1, updatedAt: new Date() };
}
