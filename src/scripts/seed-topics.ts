/**
 * Seed script: pre-populate the topics collection with ~50 system design topics.
 * Run with: npx tsx src/scripts/seed-topics.ts
 *
 * Idempotent — skips topics whose slug already exists.
 */

import { MongoClient, ObjectId } from "mongodb";
import slugify from "slugify";

type Difficulty = "easy" | "medium" | "hard";

const TOPICS: { name: string; description: string; difficulty: Difficulty }[] = [
  // ── Easy ──────────────────────────────────────────────────────
  { name: "URL Shortener", description: "Design a URL shortening service like bit.ly", difficulty: "easy" },
  { name: "Rate Limiter", description: "Design a distributed rate limiting system", difficulty: "easy" },
  { name: "Typeahead / Autocomplete", description: "Design an autocomplete suggestion service", difficulty: "easy" },
  { name: "Load Balancer Design", description: "Design a load balancing system", difficulty: "easy" },
  { name: "Distributed Lock", description: "Design a distributed locking mechanism", difficulty: "easy" },
  { name: "API Gateway", description: "Design an API gateway for microservices", difficulty: "easy" },
  { name: "Notification System", description: "Design a multi-channel notification service", difficulty: "easy" },
  { name: "Key-Value Store", description: "Design a distributed key-value database", difficulty: "easy" },
  { name: "Proximity Service", description: "Design a nearby places/friends proximity service", difficulty: "easy" },
  { name: "Metrics Aggregation", description: "Design a metrics collection and aggregation system", difficulty: "easy" },
  { name: "Ad Click Aggregation", description: "Design an ad click event aggregation pipeline", difficulty: "easy" },
  { name: "Calendar System", description: "Design a shared calendar application", difficulty: "easy" },
  { name: "Email System", description: "Design a scalable email service", difficulty: "easy" },

  // ── Medium ────────────────────────────────────────────────────
  { name: "Chat System", description: "Design a real-time chat application", difficulty: "medium" },
  { name: "Instagram / Photo Sharing", description: "Design a photo sharing social network", difficulty: "medium" },
  { name: "Twitter / Social Feed", description: "Design a microblogging social feed platform", difficulty: "medium" },
  { name: "WhatsApp / Messaging", description: "Design a mobile messaging service", difficulty: "medium" },
  { name: "Dropbox / File Storage", description: "Design a cloud file storage and sync service", difficulty: "medium" },
  { name: "E-Commerce Platform", description: "Design an online marketplace like Amazon", difficulty: "medium" },
  { name: "Payment System", description: "Design a digital payment processing system", difficulty: "medium" },
  { name: "Web Crawler", description: "Design a scalable web crawler", difficulty: "medium" },
  { name: "Distributed Cache", description: "Design a distributed caching layer", difficulty: "medium" },
  { name: "Message Queue", description: "Design a distributed message queue system", difficulty: "medium" },
  { name: "Recommendation System", description: "Design a content recommendation engine", difficulty: "medium" },
  { name: "News Feed", description: "Design a personalized news feed", difficulty: "medium" },
  { name: "Ticket Booking System", description: "Design an event ticket booking platform", difficulty: "medium" },
  { name: "Hotel Booking System", description: "Design a hotel reservation platform", difficulty: "medium" },
  { name: "Food Delivery System", description: "Design a food delivery platform like DoorDash", difficulty: "medium" },
  { name: "Online Judge", description: "Design a code execution and judging platform", difficulty: "medium" },
  { name: "Code Deployment System", description: "Design a CI/CD deployment pipeline", difficulty: "medium" },
  { name: "Logging / Monitoring System", description: "Design a centralized logging and monitoring platform", difficulty: "medium" },
  { name: "Reddit / Forum", description: "Design a community forum and discussion platform", difficulty: "medium" },
  { name: "Stack Overflow / Q&A", description: "Design a Q&A knowledge-sharing platform", difficulty: "medium" },

  // ── Hard ──────────────────────────────────────────────────────
  { name: "YouTube / Video Streaming", description: "Design a video streaming and sharing platform", difficulty: "hard" },
  { name: "Uber / Ride Sharing", description: "Design a ride-sharing transportation system", difficulty: "hard" },
  { name: "Netflix", description: "Design a video-on-demand streaming service", difficulty: "hard" },
  { name: "Google Maps", description: "Design a mapping and navigation service", difficulty: "hard" },
  { name: "Search Engine", description: "Design a web search engine", difficulty: "hard" },
  { name: "Content Delivery Network", description: "Design a global CDN", difficulty: "hard" },
  { name: "Distributed Task Scheduler", description: "Design a distributed job scheduling system", difficulty: "hard" },
  { name: "Stock Exchange", description: "Design a stock trading exchange platform", difficulty: "hard" },
  { name: "Google Docs / Collaborative Editing", description: "Design a real-time collaborative document editor", difficulty: "hard" },
  { name: "Zoom / Video Conferencing", description: "Design a video conferencing platform", difficulty: "hard" },
  { name: "Spotify / Music Streaming", description: "Design a music streaming service", difficulty: "hard" },
  { name: "TikTok / Short Video", description: "Design a short-form video platform", difficulty: "hard" },
  { name: "GitHub / Version Control", description: "Design a code hosting and version control platform", difficulty: "hard" },
  { name: "Slack / Team Chat", description: "Design a team communication platform", difficulty: "hard" },
  { name: "Airbnb / Rental Platform", description: "Design a property rental marketplace", difficulty: "hard" },
  { name: "Multiplayer Online Game Matchmaking", description: "Design a multiplayer online game matchmaking system", difficulty: "hard" },
];

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

    // Ensure unique slug index
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ submissionCount: -1 });

    let inserted = 0;
    let skipped = 0;

    for (const t of TOPICS) {
      const slug = slugify(t.name, { lower: true, strict: true });
      const existing = await col.findOne({ slug });
      if (existing) {
        skipped++;
        continue;
      }

      const now = new Date();
      await col.insertOne({
        _id: new ObjectId(),
        name: t.name,
        slug,
        description: t.description,
        difficulty: t.difficulty,
        source: "official" as const,
        submissionCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }

    console.log(
      `Seeding complete: ${inserted} topics inserted, ${skipped} already existed.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
