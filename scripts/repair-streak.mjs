/**
 * One-off repair script: backfill missing challenge_submission + user_streak
 * for a user who completed the challenge but whose records were not created
 * due to the stale-closure bug (now fixed in canvas/page.tsx).
 *
 * Usage:
 *   node scripts/repair-streak.mjs <userEmail>
 *
 * Requires MONGODB_URI in .env.local (auto-loaded via dotenv if present).
 */

import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local manually (no dotenv dep needed) ──────────────
function loadEnv(filePath) {
  try {
    const lines = readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on real env vars
  }
}
loadEnv(resolve(__dirname, "../.env.local"));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set. Add it to .env.local or export it.");
  process.exit(1);
}

const DB_NAME = "drawlint-db";

// ── ISO week helpers (mirrors src/types/challenge.ts) ────────────
function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getPreviousWeekId(weekId) {
  const [yearStr, weekStr] = weekId.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  monday.setUTCDate(monday.getUTCDate() - 7);
  return getWeekId(monday);
}

const SIGNAL_SCORES = {
  "strong-hire": 5,
  hire: 4,
  "lean-hire": 3,
  "lean-no-hire": 2,
  "no-hire": 1,
};

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.error("Usage: node scripts/repair-streak.mjs <userEmail>");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    // 1. Find user
    const user = await db.collection("users").findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }
    const userId = user._id;
    console.log(`✅ Found user: ${user.email} (${userId})`);

    // 2. Get current week's challenge
    const weekId = getWeekId();
    console.log(`📅 Current week: ${weekId}`);

    const challenge = await db.collection("weekly_challenges").findOne({ weekId });
    if (!challenge) {
      console.error(`❌ No challenge found for week ${weekId}`);
      process.exit(1);
    }
    console.log(`✅ Challenge: ${challenge._id} (topic: ${challenge.topicId})`);

    // 3. Find the user's reviewed challenge design for this week
    const design = await db.collection("designs").findOne({
      userId,
      submissionType: "challenge",
      topicId: challenge.topicId,
      status: "reviewed",
    });
    if (!design) {
      console.error(
        `❌ No reviewed challenge design found for user ${userEmail} matching this week's topic.`
      );
      process.exit(1);
    }
    console.log(`✅ Design: ${design._id} (status: ${design.status})`);

    // 4. Get the AI review signal
    const review = await db.collection("reviews").findOne({ designId: design._id });
    if (!review?.leadReviewer?.signal) {
      console.error(`❌ No AI review with leadReviewer.signal found for design ${design._id}`);
      process.exit(1);
    }
    const signal = review.leadReviewer.signal;
    const score = SIGNAL_SCORES[signal] ?? 1;
    console.log(`✅ Review signal: ${signal} → score ${score}`);

    // 5. Check / create challenge_submission
    const existingSubmission = await db.collection("challenge_submissions").findOne({
      challengeId: challenge._id,
      userId,
    });

    if (existingSubmission) {
      console.log(`ℹ️  challenge_submissions record already exists — skipping insert.`);
    } else {
      const submission = {
        _id: new ObjectId(),
        challengeId: challenge._id,
        userId,
        designId: design._id,
        score,
        signal,
        submittedAt: new Date(),
      };
      await db.collection("challenge_submissions").insertOne(submission);
      console.log(`✅ Inserted challenge_submission: ${submission._id}`);

      // Also set challengeId on the design if not already set
      if (!design.challengeId) {
        await db.collection("designs").updateOne(
          { _id: design._id },
          { $set: { challengeId: challenge._id, updatedAt: new Date() } }
        );
        console.log(`✅ Updated design.challengeId`);
      }
    }

    // 6. Check / upsert user_streak
    const existing = await db.collection("user_streaks").findOne({ userId });

    if (existing?.lastCompletedWeek === weekId) {
      console.log(`ℹ️  user_streaks already up-to-date for week ${weekId} — nothing to do.`);
    } else if (existing) {
      const previousWeek = getPreviousWeekId(weekId);
      const isConsecutive = existing.lastCompletedWeek === previousWeek;
      const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
      const newLongest = Math.max(existing.longestStreak, newStreak);

      await db.collection("user_streaks").updateOne(
        { userId },
        {
          $set: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastCompletedWeek: weekId,
            totalCompleted: existing.totalCompleted + 1,
            updatedAt: new Date(),
          },
        }
      );
      console.log(
        `✅ Updated streak: currentStreak=${newStreak}, longestStreak=${newLongest}, totalCompleted=${existing.totalCompleted + 1}`
      );
    } else {
      // First ever streak
      const doc = {
        _id: new ObjectId(),
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedWeek: weekId,
        totalCompleted: 1,
        updatedAt: new Date(),
      };
      await db.collection("user_streaks").insertOne(doc);
      console.log(`✅ Created new streak record: currentStreak=1, totalCompleted=1`);
    }

    console.log("\n🎉 Repair complete.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
