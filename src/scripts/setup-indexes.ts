/**
 * Setup script: create required Cosmos DB MongoDB API indexes.
 * Run with: npx tsx src/scripts/setup-indexes.ts
 *
 * Idempotent — Cosmos DB silently skips duplicate index creation.
 */

import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("drawlint-db");

    // ── Topics ──────────────────────────────────────────────────
    const topics = db.collection("topics");
    await topics.createIndex({ slug: 1 }, { unique: true });
    await topics.createIndex({ submissionCount: -1 });
    await topics.createIndex({ createdAt: -1 });
    console.log("✓ topics indexes created");

    // ── Designs ─────────────────────────────────────────────────
    const designs = db.collection("designs");
    await designs.createIndex({ topicId: 1, createdAt: -1 });
    await designs.createIndex({ userId: 1, createdAt: -1 });
    await designs.createIndex({ topicId: 1, userId: 1, version: -1 });
    console.log("✓ designs indexes created");

    // ── Reviews ─────────────────────────────────────────────────
    const reviews = db.collection("reviews");
    await reviews.createIndex({ designId: 1, version: -1 });
    console.log("✓ reviews indexes created");

    // ── Users ────────────────────────────────────────────────────
    const users = db.collection("users");
    await users.createIndex(
      { emailVerificationTokenHash: 1 },
      { sparse: true, name: "emailVerificationTokenHash_sparse" },
    );
    console.log("✓ users indexes created");

    // ── Weekly Challenges ────────────────────────────────────────
    const challenges = db.collection("weekly_challenges");
    try {
      await challenges.createIndex({ weekId: 1 }, { unique: true });
    } catch (e) {
      console.log("  ⚠ weekly_challenges unique weekId index skipped (may need cleanup):", (e as Error).message);
    }
    await challenges.createIndex({ startDate: -1 });
    console.log("✓ weekly_challenges indexes created");

    // ── Challenge Submissions ────────────────────────────────────
    const submissions = db.collection("challenge_submissions");
    try {
      await submissions.createIndex(
        { challengeId: 1, userId: 1 },
        { unique: true, name: "one_submission_per_user_per_challenge" },
      );
    } catch (e) {
      console.log("  ⚠ challenge_submissions unique index skipped:", (e as Error).message);
    }
    await submissions.createIndex({ challengeId: 1, score: -1, submittedAt: 1 });
    console.log("✓ challenge_submissions indexes created");

    // ── User Streaks ─────────────────────────────────────────────
    const streaks = db.collection("user_streaks");
    try {
      await streaks.createIndex({ userId: 1 }, { unique: true });
    } catch (e) {
      console.log("  ⚠ user_streaks unique index skipped:", (e as Error).message);
    }
    console.log("✓ user_streaks indexes created");

    // ── Daily Drills ─────────────────────────────────────────────
    const dailyDrills = db.collection("daily_drills");
    try {
      await dailyDrills.createIndex({ dayId: 1, category: 1 }, { unique: true });
    } catch (e) {
      console.log("  ⚠ daily_drills unique index skipped:", (e as Error).message);
    }
    console.log("✓ daily_drills indexes created");

    // ── Drill Attempts ───────────────────────────────────────────
    const drillAttempts = db.collection("drill_attempts");
    try {
      await drillAttempts.createIndex(
        { userId: 1, dayId: 1, category: 1 },
        { unique: true, name: "one_attempt_per_user_per_day" },
      );
    } catch (e) {
      console.log("  ⚠ drill_attempts unique index skipped:", (e as Error).message);
    }
    await drillAttempts.createIndex({ dayId: 1, category: 1, score: -1, durationMs: 1 });
    console.log("✓ drill_attempts indexes created");

    // ── User Drill Stats ─────────────────────────────────────────
    const drillStats = db.collection("user_drill_stats");
    try {
      await drillStats.createIndex({ userId: 1 }, { unique: true });
    } catch (e) {
      console.log("  ⚠ user_drill_stats unique index skipped:", (e as Error).message);
    }
    await drillStats.createIndex({ totalPoints: -1 });
    console.log("✓ user_drill_stats indexes created");

    console.log("Index setup complete.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Setup script failed:", err);
  process.exit(1);
});
