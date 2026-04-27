/**
 * Migration script: tag existing topics with difficulty levels.
 * Run with: npx tsx src/scripts/tag-topic-difficulty.ts
 *
 * Idempotent — only updates topics that don't already have a difficulty field.
 */

import { MongoClient } from "mongodb";
import slugify from "slugify";

type Difficulty = "easy" | "medium" | "hard";

// ── Difficulty classification ──────────────────────────────────────
// Easy   = well-scoped, single-service, commonly asked, clear boundaries
// Medium = multi-service, requires trade-off reasoning, moderate complexity
// Hard   = distributed systems, real-time, massive scale, many moving parts

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  // ── Easy (15) ──────────────────────────────────────────────────
  "URL Shortener": "easy",
  "Rate Limiter": "easy",
  "Typeahead / Autocomplete": "easy",
  "Parking Lot System": "easy",
  "Elevator System": "easy",
  "Load Balancer Design": "easy",
  "Distributed Lock": "easy",
  "API Gateway": "easy",
  "Notification System": "easy",
  "Key-Value Store": "easy",
  "Proximity Service": "easy",
  "Metrics Aggregation": "easy",
  "Ad Click Aggregation": "easy",
  "Calendar System": "easy",
  "Email System": "easy",

  // ── Medium (20) ────────────────────────────────────────────────
  "Chat System": "medium",
  "Instagram / Photo Sharing": "medium",
  "Twitter / Social Feed": "medium",
  "WhatsApp / Messaging": "medium",
  "Dropbox / File Storage": "medium",
  "E-Commerce Platform": "medium",
  "Payment System": "medium",
  "Web Crawler": "medium",
  "Distributed Cache": "medium",
  "Message Queue": "medium",
  "Recommendation System": "medium",
  "News Feed": "medium",
  "Ticket Booking System": "medium",
  "Hotel Booking System": "medium",
  "Food Delivery System": "medium",
  "Online Judge": "medium",
  "Code Deployment System": "medium",
  "Logging / Monitoring System": "medium",
  "Reddit / Forum": "medium",
  "Stack Overflow / Q&A": "medium",

  // ── Hard (15) ──────────────────────────────────────────────────
  "YouTube / Video Streaming": "hard",
  "Uber / Ride Sharing": "hard",
  "Netflix": "hard",
  "Google Maps": "hard",
  "Search Engine": "hard",
  "Content Delivery Network": "hard",
  "Distributed Task Scheduler": "hard",
  "Stock Exchange": "hard",
  "Google Docs / Collaborative Editing": "hard",
  "Zoom / Video Conferencing": "hard",
  "Spotify / Music Streaming": "hard",
  "TikTok / Short Video": "hard",
  "GitHub / Version Control": "hard",
  "Slack / Team Chat": "hard",
  "Airbnb / Rental Platform": "hard",
};

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
    const col = db.collection("topics");

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const [name, difficulty] of Object.entries(DIFFICULTY_MAP)) {
      const slug = slugify(name, { lower: true, strict: true });
      const result = await col.updateOne(
        { slug },
        { $set: { difficulty, source: "official", updatedAt: new Date() } },
      );

      if (result.matchedCount > 0) {
        updated++;
        console.log(`  ✅ ${name} → ${difficulty}`);
      } else {
        // Check if it already has difficulty
        const existing = await col.findOne({ slug });
        if (existing?.difficulty) {
          skipped++;
          console.log(`  ⏭️  ${name} — already tagged ${existing.difficulty}`);
        } else {
          notFound++;
          console.log(`  ⚠️  ${name} — topic not found in DB`);
        }
      }
    }

    console.log(
      `\nDone: ${updated} updated, ${skipped} already tagged, ${notFound} not found.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
