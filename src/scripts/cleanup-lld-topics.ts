/**
 * One-off cleanup: remove LLD-shaped topics from the official catalog.
 *
 * Why this exists
 * ───────────────
 * drawlint.ai is positioned as a system design (HLD) review tool. Two seed
 * topics — "Parking Lot System" and "Elevator System" — are actually LLD
 * (object-oriented design) problems and produce poor AI review output because
 * the reviewer prompts are tuned for distributed systems (NFR / Capacity / API
 * / HLD sections). We removed them from `seed-topics.ts`; this script removes
 * them from any pre-existing prod database.
 *
 * Safety
 * ──────
 *   1. Refuses to delete a topic with `submissionCount > 0`.
 *   2. Belt-and-suspenders: also queries `weekly_challenges` and `designs`
 *      collections directly for any docs referencing the topic's `_id`.
 *      If any reference exists, skips the delete (counter could be lying).
 *   3. TOCTOU guard: counts are re-verified immediately before each
 *      `deleteOne`, and the delete itself uses a guarded filter so MongoDB
 *      atomically refuses to delete a topic whose `submissionCount` became
 *      non-zero between check and delete.
 *   4. Prints a dry-run summary, then prompts on stdin for explicit "yes"
 *      before performing any deletes.
 *   5. Idempotent — safe to re-run. Topics already gone are reported as
 *      "not in DB" and skipped.
 *
 * Run with:
 *   MONGODB_URI=... npx tsx src/scripts/cleanup-lld-topics.ts
 */

import { createInterface } from "node:readline";
import { MongoClient, ObjectId } from "mongodb";
import type { Topic } from "@/types/library";

const TARGET_SLUGS = ["parking-lot-system", "elevator-system"] as const;
const DB_NAME = "drawlint-db";

interface PlanEntry {
  slug: string;
  topicId: ObjectId;
  name: string;
  submissionCount: number;
  refCounts: Record<string, number>;
  totalRefs: number;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const topicsCol = db.collection<Topic>("topics");
    const challengesCol = db.collection("weekly_challenges");
    const designsCol = db.collection("designs");

    const toDelete: PlanEntry[] = [];
    let notPresent = 0;
    let skippedWithRefs = 0;

    console.log("── Dry run ──");

    for (const slug of TARGET_SLUGS) {
      const topic = await topicsCol.findOne({ slug });
      if (!topic) {
        console.log(`⏭  ${slug}: not in DB, skipping`);
        notPresent++;
        continue;
      }

      const submissionCount = topic.submissionCount ?? 0;

      // Direct reference checks (belt-and-suspenders against a stale counter).
      const challengeRefs = await challengesCol.countDocuments({ topicId: topic._id });
      const designRefs = await designsCol.countDocuments({ topicId: topic._id });
      const refCounts = {
        weekly_challenges: challengeRefs,
        designs: designRefs,
      };
      const totalRefs = challengeRefs + designRefs;

      if (submissionCount > 0 || totalRefs > 0) {
        if (submissionCount > 0) {
          console.log(
            `⛔ ${slug}: has ${submissionCount} submissions (counter), skipping (manual review required)`,
          );
        }
        if (totalRefs > 0) {
          console.log(
            `⛔ ${slug}: has ${totalRefs} live references, skipping (manual review required)`,
          );
          for (const [col, n] of Object.entries(refCounts)) {
            if (n > 0) console.log(`     • ${col}: ${n}`);
          }
        }
        skippedWithRefs++;
        continue;
      }

      console.log(`🟢 ${slug}: clean (counter=0, no refs) — eligible for delete`);
      toDelete.push({
        slug,
        topicId: topic._id,
        name: topic.name ?? slug,
        submissionCount,
        refCounts,
        totalRefs,
      });
    }

    console.log("");
    console.log(
      `Plan: would delete ${toDelete.length}, skip ${skippedWithRefs} (had refs), ${notPresent} not present.`,
    );
    console.log(
      "Note: counts above are a snapshot. Actual delete will re-verify counts atomically before each deleteOne.",
    );

    let deleted = 0;
    let raceSkipped = 0;

    if (toDelete.length === 0) {
      console.log("Nothing to delete. Exiting.");
    } else {
      const answer = (await prompt("\nProceed with deletes? (yes/no) ")).trim().toLowerCase();
      if (answer !== "yes") {
        console.log("Aborted by user. No deletes performed.");
      } else {
        for (const entry of toDelete) {
          const _id = entry.topicId;

          // Re-verify refs immediately before delete (TOCTOU guard).
          const [freshTopic, freshChallengeRefs, freshDesignRefs] = await Promise.all([
            topicsCol.findOne({ _id }, { projection: { submissionCount: 1 } }),
            challengesCol.countDocuments({ topicId: _id }),
            designsCol.countDocuments({ topicId: _id }),
          ]);

          const freshSubmissionCount = freshTopic?.submissionCount ?? 0;

          if (freshSubmissionCount > 0 || freshChallengeRefs > 0 || freshDesignRefs > 0) {
            console.log(
              `⛔ ${entry.slug}: refs appeared since dry-run ` +
                `({weekly_challenges: ${freshChallengeRefs}, designs: ${freshDesignRefs}, ` +
                `submissionCount: ${freshSubmissionCount}}) — skipped`,
            );
            raceSkipped++;
            continue;
          }

          // Guarded deleteOne: MongoDB enforces submissionCount==0 atomically.
          const result = await topicsCol.deleteOne({
            _id,
            $or: [
              { submissionCount: { $exists: false } },
              { submissionCount: 0 },
            ],
          });

          if (result.deletedCount === 1) {
            console.log(`✅ ${entry.slug}: deleted`);
            deleted++;
          } else {
            console.log(
              `⚠️  ${entry.slug}: counter changed between check and delete — skipped (safe)`,
            );
            raceSkipped++;
          }
        }
      }
    }

    const skippedTotal = skippedWithRefs + raceSkipped;
    console.log(
      `\nDeleted: ${deleted}, Skipped (had refs): ${skippedTotal}, Not present: ${notPresent}`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Cleanup script failed:", err);
  process.exit(1);
});
