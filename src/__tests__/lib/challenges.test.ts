import { ObjectId } from "mongodb";
import { vi, describe, it, expect } from "vitest";
import { mongoMock, useMongoFixture } from "../_helpers/mongo";

vi.mock("@/lib/db/mongodb", () => ({ default: mongoMock.deferred }));

import {
  createChallengeSubmission,
  hasUserSubmitted,
  updateUserStreak,
} from "@/lib/db/challenges";

const fixture = useMongoFixture({
  collections: ["challenge_submissions", "user_streaks"],
  indexes: [
    (db) =>
      db
        .collection("challenge_submissions")
        .createIndex({ challengeId: 1, userId: 1 }, { unique: true })
        .then(() => undefined),
    (db) =>
      db
        .collection("user_streaks")
        .createIndex({ userId: 1 }, { unique: true })
        .then(() => undefined),
  ],
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIds() {
  return {
    userId: new ObjectId().toString(),
    challengeId: new ObjectId().toString(),
    designId: new ObjectId().toString(),
  };
}

// ── createChallengeSubmission ─────────────────────────────────────────────────

describe("createChallengeSubmission", () => {
  it("creates a submission with correct fields", async () => {
    const { userId, challengeId, designId } = makeIds();
    const result = await createChallengeSubmission({
      challengeId,
      userId,
      designId,
      score: 4,
      signal: "hire",
    });

    expect(result._id).toBeDefined();
    expect(result.challengeId.toString()).toBe(challengeId);
    expect(result.userId.toString()).toBe(userId);
    expect(result.designId.toString()).toBe(designId);
    expect(result.score).toBe(4);
    expect(result.signal).toBe("hire");
    expect(result.submittedAt).toBeInstanceOf(Date);
  });

  it("persists to the database", async () => {
    const { userId, challengeId, designId } = makeIds();
    const created = await createChallengeSubmission({
      challengeId,
      userId,
      designId,
      score: 5,
      signal: "strong-hire",
    });

    const doc = await fixture
      .getDb()
      .collection("challenge_submissions")
      .findOne({ _id: created._id });
    expect(doc).not.toBeNull();
    expect(doc?.signal).toBe("strong-hire");
  });

  // T4 — duplicate-submission test: locks in the unique-index contract from setup-indexes.ts
  it("rejects a duplicate submission for the same {challengeId, userId}", async () => {
    const { userId, challengeId, designId } = makeIds();
    await createChallengeSubmission({
      challengeId,
      userId,
      designId,
      score: 4,
      signal: "hire",
    });

    await expect(
      createChallengeSubmission({
        challengeId,
        userId,
        designId: new ObjectId().toString(),
        score: 5,
        signal: "strong-hire",
      }),
    ).rejects.toThrow();

    // Confirm only one submission exists
    const count = await fixture
      .getDb()
      .collection("challenge_submissions")
      .countDocuments({});
    expect(count).toBe(1);
  });
});

// ── hasUserSubmitted ──────────────────────────────────────────────────────────

describe("hasUserSubmitted", () => {
  it("returns false when no submission exists", async () => {
    const { userId, challengeId } = makeIds();
    const result = await hasUserSubmitted(challengeId, userId);
    expect(result).toBe(false);
  });

  it("returns true after a submission is created", async () => {
    const { userId, challengeId, designId } = makeIds();
    await createChallengeSubmission({ challengeId, userId, designId, score: 3, signal: "lean-hire" });
    const result = await hasUserSubmitted(challengeId, userId);
    expect(result).toBe(true);
  });

  it("returns false for a different user on the same challenge", async () => {
    const { challengeId, designId } = makeIds();
    const userId1 = new ObjectId().toString();
    const userId2 = new ObjectId().toString();
    await createChallengeSubmission({ challengeId, userId: userId1, designId, score: 3, signal: "lean-hire" });
    expect(await hasUserSubmitted(challengeId, userId2)).toBe(false);
  });
});

// ── updateUserStreak ──────────────────────────────────────────────────────────

describe("updateUserStreak", () => {
  it("creates a streak of 1 for a brand new user", async () => {
    const { userId } = makeIds();
    const streak = await updateUserStreak(userId, "2026-W18");
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
    expect(streak.totalCompleted).toBe(1);
    expect(streak.lastCompletedWeek).toBe("2026-W18");
  });

  it("increments streak for a consecutive week", async () => {
    const { userId } = makeIds();
    await updateUserStreak(userId, "2026-W17");
    const streak = await updateUserStreak(userId, "2026-W18");
    expect(streak.currentStreak).toBe(2);
    expect(streak.longestStreak).toBe(2);
    expect(streak.totalCompleted).toBe(2);
  });

  it("resets streak to 1 for a non-consecutive week", async () => {
    const { userId } = makeIds();
    await updateUserStreak(userId, "2026-W10");
    // Skipped W11–W17, submit W18 — not consecutive
    const streak = await updateUserStreak(userId, "2026-W18");
    expect(streak.currentStreak).toBe(1);
    expect(streak.totalCompleted).toBe(2);
  });

  it("preserves longestStreak when resetting", async () => {
    const { userId } = makeIds();
    // Build a streak of 3
    await updateUserStreak(userId, "2026-W10");
    await updateUserStreak(userId, "2026-W11");
    await updateUserStreak(userId, "2026-W12");
    // Skip to W18 — streak resets but longestStreak stays 3
    const streak = await updateUserStreak(userId, "2026-W18");
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(3);
  });

  it("is idempotent — same week does not increment", async () => {
    const { userId } = makeIds();
    await updateUserStreak(userId, "2026-W18");
    const streak = await updateUserStreak(userId, "2026-W18");
    expect(streak.currentStreak).toBe(1);
    expect(streak.totalCompleted).toBe(1);
  });

  it("handles W01 → previous year rollover (consecutive)", async () => {
    const { userId } = makeIds();
    // 2025-W52 → 2026-W01 is consecutive (2025 has 52 ISO weeks)
    await updateUserStreak(userId, "2025-W52");
    const streak = await updateUserStreak(userId, "2026-W01");
    expect(streak.currentStreak).toBe(2);
  });

  it("resets streak for an out-of-order (older) week submission", async () => {
    const { userId } = makeIds();
    await updateUserStreak(userId, "2026-W18");
    // Submitting an older week is treated as a gap → reset
    const streak = await updateUserStreak(userId, "2026-W10");
    expect(streak.currentStreak).toBe(1);
  });
});
