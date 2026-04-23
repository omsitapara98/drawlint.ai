/**
 * Seed script: pre-populate the topics collection with ~50 system design topics.
 * Run with: npx tsx src/scripts/seed-topics.ts
 *
 * Idempotent — skips topics whose slug already exists.
 */

import { MongoClient, ObjectId } from "mongodb";
import slugify from "slugify";

const TOPICS = [
  { name: "URL Shortener", description: "Design a URL shortening service like bit.ly" },
  { name: "Chat System", description: "Design a real-time chat application" },
  { name: "Instagram / Photo Sharing", description: "Design a photo sharing social network" },
  { name: "Twitter / Social Feed", description: "Design a microblogging social feed platform" },
  { name: "YouTube / Video Streaming", description: "Design a video streaming and sharing platform" },
  { name: "Uber / Ride Sharing", description: "Design a ride-sharing transportation system" },
  { name: "WhatsApp / Messaging", description: "Design a mobile messaging service" },
  { name: "Netflix", description: "Design a video-on-demand streaming service" },
  { name: "Dropbox / File Storage", description: "Design a cloud file storage and sync service" },
  { name: "Google Maps", description: "Design a mapping and navigation service" },
  { name: "Search Engine", description: "Design a web search engine" },
  { name: "E-Commerce Platform", description: "Design an online marketplace like Amazon" },
  { name: "Payment System", description: "Design a digital payment processing system" },
  { name: "Notification System", description: "Design a multi-channel notification service" },
  { name: "Rate Limiter", description: "Design a distributed rate limiting system" },
  { name: "Web Crawler", description: "Design a scalable web crawler" },
  { name: "Typeahead / Autocomplete", description: "Design an autocomplete suggestion service" },
  { name: "API Gateway", description: "Design an API gateway for microservices" },
  { name: "Load Balancer Design", description: "Design a load balancing system" },
  { name: "Distributed Cache", description: "Design a distributed caching layer" },
  { name: "Message Queue", description: "Design a distributed message queue system" },
  { name: "Key-Value Store", description: "Design a distributed key-value database" },
  { name: "Distributed Lock", description: "Design a distributed locking mechanism" },
  { name: "Content Delivery Network", description: "Design a global CDN" },
  { name: "Recommendation System", description: "Design a content recommendation engine" },
  { name: "News Feed", description: "Design a personalized news feed" },
  { name: "Ticket Booking System", description: "Design an event ticket booking platform" },
  { name: "Hotel Booking System", description: "Design a hotel reservation platform" },
  { name: "Food Delivery System", description: "Design a food delivery platform like DoorDash" },
  { name: "Parking Lot System", description: "Design an automated parking lot management system" },
  { name: "Elevator System", description: "Design an elevator scheduling system" },
  { name: "Online Judge", description: "Design a code execution and judging platform" },
  { name: "Code Deployment System", description: "Design a CI/CD deployment pipeline" },
  { name: "Logging / Monitoring System", description: "Design a centralized logging and monitoring platform" },
  { name: "Metrics Aggregation", description: "Design a metrics collection and aggregation system" },
  { name: "Distributed Task Scheduler", description: "Design a distributed job scheduling system" },
  { name: "Email System", description: "Design a scalable email service" },
  { name: "Calendar System", description: "Design a shared calendar application" },
  { name: "Stock Exchange", description: "Design a stock trading exchange platform" },
  { name: "Ad Click Aggregation", description: "Design an ad click event aggregation pipeline" },
  { name: "Proximity Service", description: "Design a nearby places/friends proximity service" },
  { name: "Google Docs / Collaborative Editing", description: "Design a real-time collaborative document editor" },
  { name: "Zoom / Video Conferencing", description: "Design a video conferencing platform" },
  { name: "Spotify / Music Streaming", description: "Design a music streaming service" },
  { name: "TikTok / Short Video", description: "Design a short-form video platform" },
  { name: "Reddit / Forum", description: "Design a community forum and discussion platform" },
  { name: "Stack Overflow / Q&A", description: "Design a Q&A knowledge-sharing platform" },
  { name: "GitHub / Version Control", description: "Design a code hosting and version control platform" },
  { name: "Slack / Team Chat", description: "Design a team communication platform" },
  { name: "Airbnb / Rental Platform", description: "Design a property rental marketplace" },
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
