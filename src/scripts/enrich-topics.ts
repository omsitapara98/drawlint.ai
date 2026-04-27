/**
 * Enrichment migration: update all official topics with difficulty, brief,
 * requirements, scale, hints, timeMinutes, relatedSlugs, and source.
 * Also inserts the new "Multiplayer Online Game Matchmaking" topic.
 *
 * Run with: npx tsx src/scripts/enrich-topics.ts
 *
 * Idempotent — safe to run multiple times. Updates by slug match.
 * Does NOT touch submissionCount, createdBy, or createdAt.
 */

import { MongoClient, ObjectId } from "mongodb";
import slugify from "slugify";

type Difficulty = "easy" | "medium" | "hard";

interface TopicEnrichment {
  name: string;
  description: string;
  difficulty: Difficulty;
  brief: string;
  requirements: string[];
  scale: string[];
  hints: string[];
  timeMinutes: number;
  relatedSlugs: string[];
}

// ════════════════════════════════════════════════════════════════
// EASY (15)
// ════════════════════════════════════════════════════════════════

const EASY_TOPICS: TopicEnrichment[] = [
  {
    name: "URL Shortener",
    description: "Design a URL shortening service like bit.ly",
    difficulty: "easy",
    brief: "Design a URL shortening service that converts long URLs into short, unique aliases and redirects users when the short URL is accessed.",
    requirements: [
      "Generate unique short URLs from long URLs",
      "Redirect short URLs to original URLs with low latency",
      "Support custom short aliases",
      "Track click analytics (count, referrer, geo)",
      "Handle URL expiration and deletion",
    ],
    scale: [
      "100M URLs created per month",
      "10:1 read-to-write ratio (1B redirects/month)",
      "Sub-100ms redirect latency",
    ],
    hints: [
      "Consider base62 encoding for short URL generation",
      "Think about hash collisions and how to resolve them",
      "Cache hot URLs for fast redirects",
      "Separate read and write paths for scalability",
    ],
    timeMinutes: 35,
    relatedSlugs: ["api-gateway", "distributed-cache", "key-value-store"],
  },
  {
    name: "Rate Limiter",
    description: "Design a distributed rate limiting system",
    difficulty: "easy",
    brief: "Design a distributed rate limiting system that controls the rate of requests a client can send to an API within a given time window.",
    requirements: [
      "Support multiple algorithms (token bucket, sliding window)",
      "Work across distributed servers consistently",
      "Handle different rate limits per user/API/plan",
      "Return appropriate headers (X-RateLimit-Remaining, Retry-After)",
      "Low latency — must not slow down requests significantly",
    ],
    scale: [
      "10M+ API requests per second across all clients",
      "100K+ unique clients",
      "Sub-millisecond decision latency",
    ],
    hints: [
      "Compare token bucket vs sliding window log vs fixed window",
      "Consider Redis for distributed counters",
      "Think about race conditions in concurrent environments",
      "How do you handle rate limiting at the edge vs origin?",
    ],
    timeMinutes: 30,
    relatedSlugs: ["api-gateway", "distributed-cache", "load-balancer-design"],
  },
  {
    name: "Typeahead / Autocomplete",
    description: "Design an autocomplete suggestion service",
    difficulty: "easy",
    brief: "Design a real-time autocomplete system that suggests search queries or completions as the user types each keystroke.",
    requirements: [
      "Return top suggestions within 100ms of each keystroke",
      "Rank suggestions by popularity, recency, and relevance",
      "Support personalized suggestions per user",
      "Handle misspellings and fuzzy matching",
      "Update suggestion index as new queries arrive",
    ],
    scale: [
      "10B+ search queries per day for index building",
      "500M daily active users typing queries",
      "Sub-100ms p99 latency for suggestions",
    ],
    hints: [
      "Trie data structure is the classic approach — consider memory trade-offs",
      "Think about how to aggregate and rank query frequencies",
      "Prefix-based sharding can distribute the trie",
      "Cache the top suggestions at each prefix level",
    ],
    timeMinutes: 35,
    relatedSlugs: ["search-engine", "distributed-cache", "recommendation-system"],
  },
  {
    name: "Parking Lot System",
    description: "Design an automated parking lot management system",
    difficulty: "easy",
    brief: "Design an automated parking lot management system that handles vehicle entry, exit, spot assignment, and billing.",
    requirements: [
      "Assign optimal parking spots based on vehicle size",
      "Track real-time availability across multiple floors and zones",
      "Calculate billing based on duration and vehicle type",
      "Handle entry/exit gates with ticket or license plate recognition",
      "Support reservations and VIP parking",
    ],
    scale: [
      "Multi-story lot with 5,000+ spots",
      "Peak: 100 vehicles entering/exiting per minute",
      "Real-time availability updates",
    ],
    hints: [
      "Think about different vehicle sizes (motorcycle, compact, large, handicapped)",
      "Consider a strategy pattern for spot assignment algorithms",
      "How do you handle concurrent entry at multiple gates?",
      "Data model for floors, rows, and individual spots",
    ],
    timeMinutes: 30,
    relatedSlugs: ["elevator-system", "ticket-booking-system"],
  },
  {
    name: "Elevator System",
    description: "Design an elevator scheduling system",
    difficulty: "easy",
    brief: "Design an elevator scheduling system for a high-rise building that efficiently handles requests and minimizes average wait time.",
    requirements: [
      "Handle concurrent requests from multiple floors",
      "Optimize for minimum average wait time",
      "Support multiple elevator banks with zone assignments",
      "Handle peak hours (morning rush, lunch) gracefully",
      "Emergency stop and fire safety mode",
    ],
    scale: [
      "50+ floor building with 8–12 elevators",
      "Peak: 500+ requests per minute during rush hour",
      "Target average wait: under 30 seconds",
    ],
    hints: [
      "Compare SCAN, LOOK, and destination dispatch algorithms",
      "Think about zoning — express elevators for high floors",
      "State machine: idle, moving up, moving down, door open",
      "How do you balance load across multiple elevators?",
    ],
    timeMinutes: 30,
    relatedSlugs: ["parking-lot-system", "distributed-task-scheduler"],
  },
  {
    name: "Load Balancer Design",
    description: "Design a load balancing system",
    difficulty: "easy",
    brief: "Design a load balancing system that distributes incoming traffic across backend servers for high availability and performance.",
    requirements: [
      "Support multiple algorithms (round-robin, least connections, weighted)",
      "Health checking — detect and remove unhealthy servers",
      "Session persistence (sticky sessions) when needed",
      "SSL termination at the load balancer",
      "Graceful server additions and removals",
    ],
    scale: [
      "1M+ concurrent connections",
      "100K+ requests per second throughput",
      "Sub-millisecond routing decision latency",
    ],
    hints: [
      "L4 (transport) vs L7 (application) load balancing — when to use which?",
      "Consistent hashing for cache-friendly distribution",
      "The load balancer itself is a single point of failure — how to solve?",
      "DNS-based load balancing as a complement",
    ],
    timeMinutes: 30,
    relatedSlugs: ["api-gateway", "content-delivery-network", "rate-limiter"],
  },
  {
    name: "Distributed Lock",
    description: "Design a distributed locking mechanism",
    difficulty: "easy",
    brief: "Design a distributed locking mechanism that coordinates access to shared resources across multiple machines.",
    requirements: [
      "Mutual exclusion — only one process holds the lock at a time",
      "Deadlock prevention with automatic expiration (TTL)",
      "Fault tolerance — lock released if holder crashes",
      "Optional FIFO fairness for lock acquisition",
      "Reentrant locks for the same process",
    ],
    scale: [
      "10K+ lock acquisitions per second",
      "1,000+ distributed nodes competing for locks",
      "Lock acquisition latency under 10ms",
    ],
    hints: [
      "Compare Redis-based (Redlock) vs ZooKeeper-based approaches",
      "Fencing tokens prevent stale lock holders from making changes",
      "Think about the split-brain problem in distributed lock services",
      "What happens when the lock service itself goes down?",
    ],
    timeMinutes: 30,
    relatedSlugs: ["key-value-store", "distributed-cache", "distributed-task-scheduler"],
  },
  {
    name: "API Gateway",
    description: "Design an API gateway for microservices",
    difficulty: "easy",
    brief: "Design an API gateway that serves as the single entry point for a microservices architecture, handling routing, auth, and cross-cutting concerns.",
    requirements: [
      "Route requests to appropriate backend microservices",
      "Authentication and authorization (API key, JWT, OAuth)",
      "Rate limiting and throttling per client/plan",
      "Request/response transformation and aggregation",
      "Logging, monitoring, and distributed tracing",
    ],
    scale: [
      "500K+ requests per second",
      "100+ backend microservices",
      "Sub-5ms added latency per request",
    ],
    hints: [
      "Difference between API Gateway and Load Balancer",
      "BFF (Backend for Frontend) pattern for different clients",
      "Service discovery — how does the gateway know where services are?",
      "Circuit breaker pattern for failing downstream services",
    ],
    timeMinutes: 35,
    relatedSlugs: ["load-balancer-design", "rate-limiter", "notification-system"],
  },
  {
    name: "Notification System",
    description: "Design a multi-channel notification service",
    difficulty: "easy",
    brief: "Design a multi-channel notification service that delivers push, email, SMS, and in-app notifications reliably at scale.",
    requirements: [
      "Support push, email, SMS, and in-app channels",
      "User preferences and opt-out management",
      "Template system with personalization variables",
      "Priority levels (critical alerts vs marketing)",
      "Delivery tracking and retry on failure",
    ],
    scale: [
      "1B+ notifications per day across all channels",
      "High-priority delivery within seconds",
      "99.9% delivery success rate",
    ],
    hints: [
      "Message queue per channel for independent scaling",
      "Deduplication — don't send the same notification twice",
      "Rate limiting per user to prevent notification fatigue",
      "Fan-out pattern for broadcasting to millions of users",
    ],
    timeMinutes: 35,
    relatedSlugs: ["message-queue", "email-system", "api-gateway"],
  },
  {
    name: "Key-Value Store",
    description: "Design a distributed key-value database",
    difficulty: "easy",
    brief: "Design a distributed key-value database with fast reads/writes, configurable consistency, and automatic replication.",
    requirements: [
      "Get/Put/Delete with sub-millisecond latency",
      "Data partitioning across multiple nodes",
      "Replication for fault tolerance",
      "Configurable consistency (strong vs eventual)",
      "Automatic failure detection and recovery",
    ],
    scale: [
      "Petabytes of data across thousands of nodes",
      "1M+ operations per second",
      "99.99% availability",
    ],
    hints: [
      "Consistent hashing for data partitioning",
      "CAP theorem trade-offs for your design",
      "Leader-based vs leaderless replication",
      "Merkle trees for efficient anti-entropy and repair",
    ],
    timeMinutes: 40,
    relatedSlugs: ["distributed-cache", "distributed-lock", "message-queue"],
  },
  {
    name: "Proximity Service",
    description: "Design a nearby places/friends proximity service",
    difficulty: "easy",
    brief: "Design a service that finds nearby places, friends, or points of interest within a given radius of a user's location.",
    requirements: [
      "Find all entities within X km of a coordinate",
      "Support different entity types (restaurants, friends, gas stations)",
      "Real-time location updates for moving entities",
      "Ranked results by distance, rating, or relevance",
      "Efficient spatial queries at scale",
    ],
    scale: [
      "200M+ places indexed globally",
      "1M+ location queries per second",
      "Results within 200ms for radius searches",
    ],
    hints: [
      "Compare Geohash vs QuadTree vs R-tree for spatial indexing",
      "Geohash prefix matching for proximity queries",
      "Moving entities (drivers) vs static entities (restaurants) — different strategies",
      "Caching by geohash prefix for popular areas",
    ],
    timeMinutes: 35,
    relatedSlugs: ["google-maps", "uber-ride-sharing", "food-delivery-system"],
  },
  {
    name: "Metrics Aggregation",
    description: "Design a metrics collection and aggregation system",
    difficulty: "easy",
    brief: "Design a metrics collection system that ingests, stores, and queries time-series metrics from thousands of services.",
    requirements: [
      "Ingest millions of metric data points per second",
      "Support counters, gauges, histograms, and percentiles",
      "Time-based aggregation (1min, 5min, 1hr, 1day rollups)",
      "Fast queries for dashboards and alerting",
      "Data retention policies with automatic downsampling",
    ],
    scale: [
      "10M+ data points ingested per second",
      "Petabytes of time-series data",
      "Dashboard queries return within 1 second",
    ],
    hints: [
      "Time-series databases optimize for append-heavy writes",
      "Pre-aggregate at ingestion time to speed up queries",
      "Pull vs push model for metric collection",
      "Downsampling old data saves storage while keeping trends",
    ],
    timeMinutes: 35,
    relatedSlugs: ["logging-monitoring-system", "ad-click-aggregation", "distributed-task-scheduler"],
  },
  {
    name: "Ad Click Aggregation",
    description: "Design an ad click event aggregation pipeline",
    difficulty: "easy",
    brief: "Design a real-time ad click event aggregation pipeline that tracks clicks, detects fraud, and provides analytics for advertisers.",
    requirements: [
      "Count ad clicks in real time with per-second granularity",
      "Aggregate by ad, campaign, advertiser, and time window",
      "Detect and filter click fraud (bot clicks, click farms)",
      "Real-time dashboards for advertisers",
      "Exactly-once processing — no duplicate or lost clicks",
    ],
    scale: [
      "10B+ ad click events per day",
      "Real-time aggregation within 1-minute windows",
      "Query results available within seconds of events",
    ],
    hints: [
      "Stream processing (Kafka + Flink/Spark) is the natural fit",
      "Watermarking for handling late-arriving events",
      "MapReduce: map clicks to keys, reduce to counts",
      "Lambda architecture: real-time stream + batch reconciliation",
    ],
    timeMinutes: 35,
    relatedSlugs: ["metrics-aggregation", "message-queue", "logging-monitoring-system"],
  },
  {
    name: "Calendar System",
    description: "Design a shared calendar application",
    difficulty: "easy",
    brief: "Design a shared calendar application supporting event creation, recurring events, and availability checking across teams.",
    requirements: [
      "Create, update, delete calendar events",
      "Recurring events (daily, weekly, monthly, custom RRULE)",
      "Free/busy time slot lookup across multiple users",
      "Calendar sharing with permission levels",
      "Reminders and notifications before events",
    ],
    scale: [
      "100M+ users with an average of 5 events/day",
      "Availability queries across 10+ calendars within 500ms",
      "Real-time sync across devices",
    ],
    hints: [
      "Recurring events: store the rule, expand on read — not on write",
      "Interval-based data structure for fast free/busy queries",
      "Timezone handling — store in UTC, display in local",
      "Conflict detection when booking shared resources (rooms)",
    ],
    timeMinutes: 35,
    relatedSlugs: ["notification-system", "email-system", "ticket-booking-system"],
  },
  {
    name: "Email System",
    description: "Design a scalable email service",
    difficulty: "easy",
    brief: "Design a scalable email service handling sending, receiving, storing, and searching emails for millions of users.",
    requirements: [
      "Send and receive emails with attachments",
      "Inbox, sent, drafts, spam, and custom folders",
      "Full-text search across email content",
      "Spam filtering and virus scanning",
      "Push notifications for new emails",
    ],
    scale: [
      "1B+ emails sent and received per day",
      "Average user has 10K+ stored emails",
      "Search returns results within 1 second",
    ],
    hints: [
      "SMTP for sending, IMAP/POP3 for retrieval",
      "Separate metadata storage from blob storage (attachments)",
      "Inverted index for full-text email search",
      "Email deliverability: SPF, DKIM, DMARC",
    ],
    timeMinutes: 35,
    relatedSlugs: ["notification-system", "calendar-system", "search-engine"],
  },
];

// ════════════════════════════════════════════════════════════════
// MEDIUM (20)
// ════════════════════════════════════════════════════════════════

const MEDIUM_TOPICS: TopicEnrichment[] = [
  {
    name: "Chat System",
    description: "Design a real-time chat application",
    difficulty: "medium",
    brief: "Design a real-time chat application supporting 1:1 messaging, group chats, online presence, and message history.",
    requirements: [
      "Real-time 1:1 and group messaging",
      "Online/offline presence indicators",
      "Message history with pagination",
      "Read receipts and typing indicators",
      "Media sharing (images, files)",
    ],
    scale: [
      "500M daily active users",
      "50B+ messages sent per day",
      "Message delivery within 200ms",
    ],
    hints: [
      "WebSocket or long polling for real-time delivery",
      "Message ordering guarantees in group chats",
      "Fan-out on write vs fan-out on read for group messages",
      "How do you handle users with multiple devices?",
    ],
    timeMinutes: 45,
    relatedSlugs: ["whatsapp-messaging", "slack-team-chat", "notification-system"],
  },
  {
    name: "Instagram / Photo Sharing",
    description: "Design a photo sharing social network",
    difficulty: "medium",
    brief: "Design a photo sharing social network where users upload photos, follow others, and browse a personalized feed.",
    requirements: [
      "Photo upload with filters and editing",
      "Personalized feed based on follows and interests",
      "Like, comment, and share functionality",
      "Follow/unfollow with follower counts",
      "Explore page with trending content",
    ],
    scale: [
      "1B+ users, 500M daily active",
      "100M+ photos uploaded per day",
      "Feed generation within 500ms",
    ],
    hints: [
      "CDN for serving images at scale",
      "Pre-compute feeds vs compute on request — trade-offs",
      "Celebrity problem: users with 100M+ followers",
      "Image processing pipeline: resize, compress, generate thumbnails",
    ],
    timeMinutes: 45,
    relatedSlugs: ["news-feed", "content-delivery-network", "recommendation-system"],
  },
  {
    name: "Twitter / Social Feed",
    description: "Design a microblogging social feed platform",
    difficulty: "medium",
    brief: "Design a microblogging platform where users post short messages, follow others, and browse a real-time social feed.",
    requirements: [
      "Post tweets (280 char) with media",
      "Follow/unfollow and personalized timeline",
      "Retweet, like, and reply",
      "Trending topics and hashtags",
      "Search across all tweets",
    ],
    scale: [
      "500M+ tweets per day",
      "300M daily active users",
      "Timeline loads within 300ms",
    ],
    hints: [
      "Fan-out on write for normal users, fan-out on read for celebrities",
      "Hybrid approach based on follower count thresholds",
      "Snowflake IDs for globally unique, time-sorted tweet IDs",
      "Search index separate from the main data store",
    ],
    timeMinutes: 45,
    relatedSlugs: ["news-feed", "instagram-photo-sharing", "search-engine"],
  },
  {
    name: "WhatsApp / Messaging",
    description: "Design a mobile messaging service",
    difficulty: "medium",
    brief: "Design a mobile messaging service with end-to-end encryption supporting text, media, voice/video calls, and group chats.",
    requirements: [
      "End-to-end encrypted messaging",
      "Offline message delivery (store and forward)",
      "Group chats up to 1,000+ members",
      "Voice and video calling",
      "Message status: sent, delivered, read",
    ],
    scale: [
      "2B+ users globally",
      "100B+ messages per day",
      "Delivery within 100ms when online",
    ],
    hints: [
      "Signal Protocol for end-to-end encryption",
      "Per-user message queues for offline delivery",
      "Encryption key management and exchange",
      "Message ordering and deduplication across devices",
    ],
    timeMinutes: 45,
    relatedSlugs: ["chat-system", "zoom-video-conferencing", "notification-system"],
  },
  {
    name: "Dropbox / File Storage",
    description: "Design a cloud file storage and sync service",
    difficulty: "medium",
    brief: "Design a cloud file storage and sync service that stores files, syncs across devices, and enables sharing.",
    requirements: [
      "File upload, download, and delete",
      "Automatic sync across multiple devices",
      "File versioning and conflict resolution",
      "Sharing via links with permission controls",
      "Delta sync — only transfer changed blocks",
    ],
    scale: [
      "500M+ users, 100M daily active",
      "1B+ files synced per day",
      "Average file: 1MB, max: 50GB",
    ],
    hints: [
      "Block-level deduplication and delta sync save bandwidth",
      "Chunk large files for parallel upload/download",
      "Metadata server vs block storage — separate concerns",
      "Conflict resolution when two devices edit same file offline",
    ],
    timeMinutes: 45,
    relatedSlugs: ["content-delivery-network", "key-value-store", "google-docs-collaborative-editing"],
  },
  {
    name: "E-Commerce Platform",
    description: "Design an online marketplace like Amazon",
    difficulty: "medium",
    brief: "Design an online marketplace where sellers list products, buyers search and purchase, with cart, checkout, and order tracking.",
    requirements: [
      "Product catalog with search and filtering",
      "Shopping cart and checkout flow",
      "Inventory management with stock tracking",
      "Order processing and status tracking",
      "Reviews and ratings system",
    ],
    scale: [
      "100M+ products in catalog",
      "1M+ orders per hour during flash sales",
      "Search results within 200ms",
    ],
    hints: [
      "Inventory race conditions during flash sales",
      "Database schema: products, orders, users, reviews",
      "Elasticsearch for product search with faceted filtering",
      "Event-driven architecture for order processing pipeline",
    ],
    timeMinutes: 45,
    relatedSlugs: ["payment-system", "search-engine", "recommendation-system"],
  },
  {
    name: "Payment System",
    description: "Design a digital payment processing system",
    difficulty: "medium",
    brief: "Design a digital payment processing system with exactly-once processing, multiple payment methods, and compliance.",
    requirements: [
      "Process credit card, debit, and wallet payments",
      "Exactly-once processing (no double charges)",
      "Refund and chargeback handling",
      "PCI DSS compliance for card data",
      "Transaction history and reconciliation",
    ],
    scale: [
      "10K+ transactions per second",
      "99.999% availability (five nines)",
      "Transaction completion within 2 seconds",
    ],
    hints: [
      "Idempotency keys are critical — understand why",
      "Saga pattern for distributed transactions",
      "Payment state machine: initiated → authorized → captured → settled",
      "Separate payment gateway from ledger system",
    ],
    timeMinutes: 45,
    relatedSlugs: ["e-commerce-platform", "stock-exchange", "distributed-lock"],
  },
  {
    name: "Web Crawler",
    description: "Design a scalable web crawler",
    difficulty: "medium",
    brief: "Design a scalable web crawler that systematically browses the internet and builds an index for a search engine.",
    requirements: [
      "Crawl billions of web pages efficiently",
      "Respect robots.txt and rate limits per domain",
      "Detect and handle duplicate content",
      "Prioritize important and frequently updated pages",
      "Store crawled content for indexing",
    ],
    scale: [
      "1B+ pages crawled per day",
      "Petabytes of downloaded content",
      "Re-crawl popular pages every few hours",
    ],
    hints: [
      "URL frontier with priority queue for crawl ordering",
      "Politeness — don't overwhelm any single domain",
      "Bloom filters for URL deduplication",
      "DNS resolution bottleneck at scale",
    ],
    timeMinutes: 40,
    relatedSlugs: ["search-engine", "distributed-task-scheduler", "message-queue"],
  },
  {
    name: "Distributed Cache",
    description: "Design a distributed caching layer",
    difficulty: "medium",
    brief: "Design a distributed caching layer between your application and database to reduce latency and database load.",
    requirements: [
      "In-memory key-value caching with sub-ms reads",
      "Eviction policies (LRU, LFU, TTL)",
      "Data partitioning across cache nodes",
      "Cache invalidation strategies",
      "High availability with replication",
    ],
    scale: [
      "Terabytes of cached data across hundreds of nodes",
      "10M+ cache operations per second",
      "99.99% cache hit rate for hot data",
    ],
    hints: [
      "Consistent hashing for distributing keys",
      "Cache-aside vs write-through vs write-behind",
      "Thundering herd: what happens when a popular key expires?",
      "Cache warming and pre-population strategies",
    ],
    timeMinutes: 40,
    relatedSlugs: ["key-value-store", "content-delivery-network", "load-balancer-design"],
  },
  {
    name: "Message Queue",
    description: "Design a distributed message queue system",
    difficulty: "medium",
    brief: "Design a distributed message queue enabling async communication between services with guaranteed delivery.",
    requirements: [
      "Producer-consumer messaging with topic/queue support",
      "At-least-once or exactly-once delivery",
      "Message ordering within partitions",
      "Consumer groups for parallel processing",
      "Dead letter queue for failed messages",
    ],
    scale: [
      "1M+ messages per second throughput",
      "Days of message retention",
      "Thousands of concurrent producers and consumers",
    ],
    hints: [
      "Partition-based design (like Kafka) for parallelism and ordering",
      "Offsets/acknowledgments track consumption progress",
      "Pull vs push models for consumer delivery",
      "Replication factor for durability — broker failure handling",
    ],
    timeMinutes: 40,
    relatedSlugs: ["notification-system", "distributed-task-scheduler", "logging-monitoring-system"],
  },
  {
    name: "Recommendation System",
    description: "Design a content recommendation engine",
    difficulty: "medium",
    brief: "Design a personalized recommendation engine that suggests items based on behavior, preferences, and collaborative signals.",
    requirements: [
      "Personalized recommendations per user",
      "Collaborative filtering and content-based approaches",
      "Real-time updates as user interacts",
      "Cold start handling for new users and items",
      "A/B testing framework for algorithms",
    ],
    scale: [
      "100M+ users with personalized recs",
      "10M+ items in the catalog",
      "Recommendations generated within 200ms",
    ],
    hints: [
      "Collaborative filtering: users who liked X also liked Y",
      "Matrix factorization for latent feature learning",
      "Online (real-time) vs offline (batch) pipelines",
      "Feature store for serving ML model inputs at low latency",
    ],
    timeMinutes: 45,
    relatedSlugs: ["news-feed", "e-commerce-platform", "search-engine"],
  },
  {
    name: "News Feed",
    description: "Design a personalized news feed",
    difficulty: "medium",
    brief: "Design a personalized news feed that aggregates and ranks content from followed users and interests in real time.",
    requirements: [
      "Aggregate posts from followed users and pages",
      "Rank by relevance, recency, and engagement",
      "Support text, image, video, and link posts",
      "Real-time updates for new posts",
      "Handle reshares and viral content",
    ],
    scale: [
      "1B+ users, 500M daily feed views",
      "10M+ new posts per hour",
      "Feed loads within 500ms",
    ],
    hints: [
      "Fan-out on write for normal users (pre-compute feeds)",
      "Fan-out on read for celebrities (compute at request time)",
      "Hybrid approach based on follower count thresholds",
      "Ranking: chronological vs algorithmic vs mixed",
    ],
    timeMinutes: 45,
    relatedSlugs: ["twitter-social-feed", "instagram-photo-sharing", "recommendation-system"],
  },
  {
    name: "Ticket Booking System",
    description: "Design an event ticket booking platform",
    difficulty: "medium",
    brief: "Design an event ticket booking platform handling seat selection, real-time inventory, and payment under high concurrency.",
    requirements: [
      "Browse events with seat maps and availability",
      "Real-time seat selection with temporary holds",
      "Concurrent booking without overselling",
      "Payment integration with timeout and release",
      "E-ticket generation with QR code validation",
    ],
    scale: [
      "10K+ concurrent users per popular event",
      "Seat hold decisions within 100ms",
      "Zero overselling tolerance",
    ],
    hints: [
      "Optimistic locking or distributed locks for seat reservation",
      "Temporary hold with TTL — release if payment times out",
      "Waiting room / queue pattern for high-demand events",
      "Separate read path (browsing) from write path (booking)",
    ],
    timeMinutes: 40,
    relatedSlugs: ["hotel-booking-system", "payment-system", "distributed-lock"],
  },
  {
    name: "Hotel Booking System",
    description: "Design a hotel reservation platform",
    difficulty: "medium",
    brief: "Design a hotel reservation platform for searching rooms, comparing prices, and booking stays across thousands of hotels.",
    requirements: [
      "Search by location, dates, guests, and amenities",
      "Real-time room availability and pricing",
      "Booking with confirmation and cancellation policies",
      "Price comparison across room types",
      "Reviews and ratings",
    ],
    scale: [
      "1M+ hotel listings worldwide",
      "100K+ searches per minute",
      "Booking confirmation within 5 seconds",
    ],
    hints: [
      "Room availability tracking across date ranges",
      "Overbooking strategy (common in the hotel industry)",
      "Geo-based search with date-range intersection queries",
      "Cache popular search queries and hotel data",
    ],
    timeMinutes: 40,
    relatedSlugs: ["airbnb-rental-platform", "ticket-booking-system", "e-commerce-platform"],
  },
  {
    name: "Food Delivery System",
    description: "Design a food delivery platform like DoorDash",
    difficulty: "medium",
    brief: "Design a food delivery platform connecting restaurants, delivery drivers, and customers with real-time order tracking.",
    requirements: [
      "Restaurant menu browsing and ordering",
      "Real-time order tracking with map view",
      "Driver matching and route optimization",
      "ETA estimation for prep and delivery",
      "Ratings for restaurants and drivers",
    ],
    scale: [
      "10M+ orders per day",
      "1M+ concurrent active orders at peak",
      "ETA accuracy within 5 minutes",
    ],
    hints: [
      "Three-sided marketplace: customer, restaurant, driver",
      "Location service for real-time driver tracking",
      "Order state machine: placed → accepted → preparing → picked up → delivered",
      "Surge pricing and driver incentive modeling",
    ],
    timeMinutes: 45,
    relatedSlugs: ["uber-ride-sharing", "proximity-service", "notification-system"],
  },
  {
    name: "Online Judge",
    description: "Design a code execution and judging platform",
    difficulty: "medium",
    brief: "Design a code execution platform where users submit solutions that are automatically tested against hidden test cases.",
    requirements: [
      "Support multiple programming languages",
      "Sandboxed execution with resource limits (time, memory)",
      "Compile, run, and compare output against expected results",
      "Queue management for concurrent submissions",
      "Leaderboards and contest mode",
    ],
    scale: [
      "100K+ submissions per hour during contests",
      "Execution within 5 seconds per submission",
      "Support 20+ languages",
    ],
    hints: [
      "Docker containers for sandboxed execution",
      "Security: prevent system calls, network access, fork bombs",
      "Queue-based architecture — worker pool processes submissions",
      "Pre-compiled test cases for fast comparison",
    ],
    timeMinutes: 40,
    relatedSlugs: ["code-deployment-system", "distributed-task-scheduler", "message-queue"],
  },
  {
    name: "Code Deployment System",
    description: "Design a CI/CD deployment pipeline",
    difficulty: "medium",
    brief: "Design a CI/CD pipeline that builds, tests, and deploys code to production with rollback capabilities.",
    requirements: [
      "Automated build and test on code push",
      "Staged rollout (canary → percentage → full)",
      "One-click rollback to previous version",
      "Multiple environments (dev, staging, prod)",
      "Deployment dashboard and notifications",
    ],
    scale: [
      "1,000+ deployments per day",
      "Build completion within 10 minutes",
      "Rollback within 30 seconds",
    ],
    hints: [
      "Blue-green vs canary vs rolling update — trade-offs",
      "Artifact registry for built images/packages",
      "Database migrations during deployments",
      "Feature flags complement deployment strategies",
    ],
    timeMinutes: 40,
    relatedSlugs: ["github-version-control", "online-judge", "distributed-task-scheduler"],
  },
  {
    name: "Logging / Monitoring System",
    description: "Design a centralized logging and monitoring platform",
    difficulty: "medium",
    brief: "Design a centralized logging platform that collects, indexes, and alerts on logs from thousands of services.",
    requirements: [
      "Collect logs from thousands of services",
      "Full-text search across log content",
      "Real-time log tailing and streaming",
      "Alerting rules on patterns and thresholds",
      "Configurable retention policies",
    ],
    scale: [
      "Terabytes of logs ingested per day",
      "10B+ log events per day",
      "Search within 2 seconds",
    ],
    hints: [
      "ELK stack as reference architecture",
      "Structured vs unstructured logging",
      "Log shipping: agent vs sidecar vs library",
      "Time-based index partitioning for retention",
    ],
    timeMinutes: 40,
    relatedSlugs: ["metrics-aggregation", "search-engine", "message-queue"],
  },
  {
    name: "Reddit / Forum",
    description: "Design a community forum and discussion platform",
    difficulty: "medium",
    brief: "Design a community forum with subreddits, threaded comments, voting, and content ranking algorithms.",
    requirements: [
      "Create communities with moderators",
      "Post text, links, and media",
      "Threaded comments with nested replies",
      "Upvote/downvote with hot/top/new ranking",
      "Moderation tools: remove, ban, auto-filter",
    ],
    scale: [
      "500M+ monthly active users",
      "100K+ active communities",
      "100M+ comments per day",
    ],
    hints: [
      "Hot ranking: score + time decay algorithm",
      "Deeply nested threads — performance implications",
      "Materialized views for pre-computed rankings",
      "Content moderation: automated + human review pipeline",
    ],
    timeMinutes: 45,
    relatedSlugs: ["stack-overflow-qa", "news-feed", "recommendation-system"],
  },
  {
    name: "Stack Overflow / Q&A",
    description: "Design a Q&A knowledge-sharing platform",
    difficulty: "medium",
    brief: "Design a Q&A platform where users ask questions, get answers, and build reputation through community voting.",
    requirements: [
      "Questions with tags and rich formatting",
      "Answers with code blocks and markdown",
      "Voting, accepting answers, reputation system",
      "Full-text search across Q&A content",
      "Duplicate detection and question linking",
    ],
    scale: [
      "50M+ questions in knowledge base",
      "10M+ monthly active users",
      "Search within 500ms",
    ],
    hints: [
      "Reputation system: upvotes, accepted answers, badges — gamification",
      "Data model: questions, answers, comments, votes, tags",
      "Full-text search with relevance ranking",
      "NLP similarity scoring for duplicate detection",
    ],
    timeMinutes: 40,
    relatedSlugs: ["reddit-forum", "search-engine", "recommendation-system"],
  },
];

// ════════════════════════════════════════════════════════════════
// HARD (16 — includes the new Matchmaking topic)
// ════════════════════════════════════════════════════════════════

const HARD_TOPICS: TopicEnrichment[] = [
  {
    name: "YouTube / Video Streaming",
    description: "Design a video streaming and sharing platform",
    difficulty: "hard",
    brief: "Design a video streaming platform where users upload, transcode, and stream videos to millions of concurrent viewers.",
    requirements: [
      "Video upload with transcoding pipeline (multiple resolutions)",
      "Adaptive bitrate streaming (HLS/DASH)",
      "Video recommendations and search",
      "Like, comment, subscribe, notifications",
      "Live streaming support",
    ],
    scale: [
      "500 hours of video uploaded per minute",
      "1B+ hours watched per day",
      "4K streaming with sub-second startup",
    ],
    hints: [
      "Transcoding pipeline: multiple resolutions + codecs in parallel",
      "CDN edge servers for low-latency delivery",
      "Adaptive bitrate: client switches quality based on bandwidth",
      "Video metadata storage separate from video blobs",
    ],
    timeMinutes: 55,
    relatedSlugs: ["netflix", "tiktok-short-video", "content-delivery-network"],
  },
  {
    name: "Uber / Ride Sharing",
    description: "Design a ride-sharing transportation system",
    difficulty: "hard",
    brief: "Design a ride-sharing system matching riders with nearby drivers in real time, with dynamic pricing and route optimization.",
    requirements: [
      "Real-time driver-rider matching by proximity",
      "Dynamic/surge pricing based on supply-demand",
      "ETA calculation and route optimization",
      "Real-time trip tracking on map",
      "Payment processing and driver payouts",
    ],
    scale: [
      "20M+ rides per day globally",
      "5M+ concurrent active drivers",
      "Match within 10 seconds",
    ],
    hints: [
      "Geo-spatial indexing: Geohash or S2 cells",
      "Matching: nearest vs ETA-based vs batch matching",
      "Supply-demand modeling for surge pricing",
      "Driver going offline mid-trip — failover handling",
    ],
    timeMinutes: 55,
    relatedSlugs: ["google-maps", "food-delivery-system", "proximity-service"],
  },
  {
    name: "Netflix",
    description: "Design a video-on-demand streaming service",
    difficulty: "hard",
    brief: "Design a VOD streaming service with a massive library, personalized recommendations, and global delivery.",
    requirements: [
      "Stream content across devices (web, mobile, TV)",
      "Personalized recommendations per user",
      "Regional licensing and availability",
      "Offline downloads",
      "Multiple profiles with parental controls",
    ],
    scale: [
      "200M+ subscribers globally",
      "Hundreds of petabytes of content",
      "100M+ concurrent streams at peak",
    ],
    hints: [
      "Open Connect CDN — custom content delivery at ISP level",
      "Pre-position content at ISPs during off-peak",
      "Microservices for independent scaling of recommendation, playback, billing",
      "Chaos engineering for resilience",
    ],
    timeMinutes: 55,
    relatedSlugs: ["youtube-video-streaming", "spotify-music-streaming", "content-delivery-network"],
  },
  {
    name: "Google Maps",
    description: "Design a mapping and navigation service",
    difficulty: "hard",
    brief: "Design a mapping and navigation service with real-time directions, traffic data, and points of interest.",
    requirements: [
      "Map rendering with zoom levels and tile-based loading",
      "Turn-by-turn navigation with real-time rerouting",
      "Real-time traffic data from user devices",
      "POI search and reviews",
      "Offline map downloads",
    ],
    scale: [
      "1B+ monthly active users",
      "Petabytes of map data globally",
      "Route calculation within 2 seconds",
    ],
    hints: [
      "Map tiling: pre-render at multiple zoom levels",
      "Dijkstra's or A* for route finding",
      "Crowdsourced real-time traffic aggregation",
      "Road network as weighted graph with dynamic edges",
    ],
    timeMinutes: 55,
    relatedSlugs: ["uber-ride-sharing", "proximity-service", "food-delivery-system"],
  },
  {
    name: "Search Engine",
    description: "Design a web search engine",
    difficulty: "hard",
    brief: "Design a web search engine that crawls, indexes, and ranks billions of pages to return relevant results.",
    requirements: [
      "Crawl and index billions of web pages",
      "Rank by relevance (PageRank + content signals)",
      "Results within 500ms",
      "Phrase matching, filters, and operators",
      "Auto-suggest and spell correction",
    ],
    scale: [
      "100B+ indexed pages",
      "10B+ searches per day",
      "Results within 200ms at p99",
    ],
    hints: [
      "Inverted index: mapping words to document IDs",
      "PageRank: link analysis for authority",
      "Index sharding: partition by document or by term?",
      "Query pipeline: tokenize → expand → search → rank → serve",
    ],
    timeMinutes: 55,
    relatedSlugs: ["web-crawler", "typeahead-autocomplete", "recommendation-system"],
  },
  {
    name: "Content Delivery Network",
    description: "Design a global CDN",
    difficulty: "hard",
    brief: "Design a global CDN that caches and delivers content from edge servers close to end users.",
    requirements: [
      "Cache static content at edge locations",
      "Dynamic content acceleration and origin shielding",
      "Cache invalidation and purging",
      "SSL/TLS termination at the edge",
      "DDoS protection and WAF",
    ],
    scale: [
      "200+ edge locations globally",
      "100+ Tbps aggregate bandwidth",
      "Sub-50ms delivery from nearest edge",
    ],
    hints: [
      "Pull vs push caching — when to use each",
      "Cache key design: URL + headers + query params",
      "Cache stampede on popular content expiry",
      "Anycast routing to direct users to nearest PoP",
    ],
    timeMinutes: 50,
    relatedSlugs: ["load-balancer-design", "youtube-video-streaming", "distributed-cache"],
  },
  {
    name: "Distributed Task Scheduler",
    description: "Design a distributed job scheduling system",
    difficulty: "hard",
    brief: "Design a distributed job scheduling system that executes tasks at specified times or intervals across a worker fleet.",
    requirements: [
      "One-time and recurring tasks (cron-like)",
      "Distributed execution across worker nodes",
      "Exactly-once execution guarantee",
      "Task dependencies and DAG workflows",
      "Retry policies and dead letter handling",
    ],
    scale: [
      "10M+ scheduled tasks per day",
      "1,000+ worker nodes",
      "Execution within 1 second of scheduled time",
    ],
    hints: [
      "Partition tasks by time bucket",
      "Leader election for the scheduler itself",
      "Prevent duplicate execution on scheduler restart",
      "Pull model (workers poll) vs push model (scheduler assigns)",
    ],
    timeMinutes: 50,
    relatedSlugs: ["message-queue", "code-deployment-system", "distributed-lock"],
  },
  {
    name: "Stock Exchange",
    description: "Design a stock trading exchange platform",
    difficulty: "hard",
    brief: "Design a stock trading exchange that matches buy/sell orders in real time with sub-millisecond latency.",
    requirements: [
      "Order matching engine (limit and market orders)",
      "Real-time order book with bid/ask spread",
      "Price-time priority matching",
      "Real-time market data feed",
      "Audit trail and regulatory compliance",
    ],
    scale: [
      "1M+ orders per second at peak",
      "Microsecond matching latency",
      "Zero tolerance for data loss",
    ],
    hints: [
      "In-memory order book with price-time priority queues",
      "Strong consistency is non-negotiable here",
      "Sequencer pattern: single-threaded matching for determinism",
      "Market data fan-out: multicast to thousands of subscribers",
    ],
    timeMinutes: 55,
    relatedSlugs: ["payment-system", "message-queue", "metrics-aggregation"],
  },
  {
    name: "Google Docs / Collaborative Editing",
    description: "Design a real-time collaborative document editor",
    difficulty: "hard",
    brief: "Design a real-time collaborative editor where multiple users simultaneously edit the same document with instant sync.",
    requirements: [
      "Multiple concurrent editors in real time",
      "Conflict resolution for concurrent edits",
      "Cursor presence (see where others are editing)",
      "Version history with point-in-time restore",
      "Offline editing with sync on reconnect",
    ],
    scale: [
      "100+ concurrent editors per document",
      "Character-level sync within 100ms",
      "Millions of documents with full history",
    ],
    hints: [
      "OT (Operational Transformation) vs CRDT — understand both",
      "Operation log and concurrent operation transforms",
      "WebSocket for real-time client-server sync",
      "Operation log compaction for long-lived documents",
    ],
    timeMinutes: 55,
    relatedSlugs: ["slack-team-chat", "dropbox-file-storage", "chat-system"],
  },
  {
    name: "Zoom / Video Conferencing",
    description: "Design a video conferencing platform",
    difficulty: "hard",
    brief: "Design a video conferencing platform for multi-party calls, screen sharing, recording, and real-time collaboration.",
    requirements: [
      "Multi-party video/audio (up to 1,000 participants)",
      "Screen sharing and virtual backgrounds",
      "Recording and transcription",
      "Chat and reactions during meetings",
      "Breakout rooms and waiting room",
    ],
    scale: [
      "300M+ daily meeting participants",
      "1,000-person meetings with gallery view",
      "Sub-200ms end-to-end audio latency",
    ],
    hints: [
      "SFU vs MCU for multi-party — trade-offs",
      "WebRTC for small calls, SFU for larger meetings",
      "Bandwidth adaptation: reduce quality vs drop frames",
      "Media server placement near participants",
    ],
    timeMinutes: 55,
    relatedSlugs: ["whatsapp-messaging", "slack-team-chat", "content-delivery-network"],
  },
  {
    name: "Spotify / Music Streaming",
    description: "Design a music streaming service",
    difficulty: "hard",
    brief: "Design a music streaming service with personalized playlists, offline playback, and social features.",
    requirements: [
      "Gapless music playback with quality selection",
      "Personalized playlists (Discover Weekly, Daily Mix)",
      "Offline download and playback",
      "Social: follow artists, share playlists",
      "Lyrics and podcast support",
    ],
    scale: [
      "500M+ users, 200M premium",
      "100M+ tracks in catalog",
      "50M+ concurrent streams at peak",
    ],
    hints: [
      "OGG Vorbis at multiple quality levels",
      "Audio buffering and pre-fetching next track",
      "Collaborative filtering + audio analysis for recs",
      "P2P delivery to reduce bandwidth costs",
    ],
    timeMinutes: 50,
    relatedSlugs: ["netflix", "youtube-video-streaming", "recommendation-system"],
  },
  {
    name: "TikTok / Short Video",
    description: "Design a short-form video platform",
    difficulty: "hard",
    brief: "Design a short-form video platform with an AI-driven For You page, creation tools, and viral content distribution.",
    requirements: [
      "Video upload with editing tools (filters, music, effects)",
      "AI-powered For You feed recommendation",
      "Duet, stitch, and remix features",
      "Like, comment, share, follow",
      "Creator analytics dashboard",
    ],
    scale: [
      "1B+ monthly active users",
      "500M+ videos watched per day per user",
      "Recommendations in under 100ms",
    ],
    hints: [
      "Content-based + collaborative recommendation for FYP",
      "Cold start: ranking content from new creators",
      "Video processing: transcode, effects, thumbnails",
      "Regional content moderation and compliance",
    ],
    timeMinutes: 55,
    relatedSlugs: ["youtube-video-streaming", "instagram-photo-sharing", "recommendation-system"],
  },
  {
    name: "GitHub / Version Control",
    description: "Design a code hosting and version control platform",
    difficulty: "hard",
    brief: "Design a code hosting platform with Git repositories, pull requests, CI/CD, and developer collaboration.",
    requirements: [
      "Git repository hosting (push/pull/clone)",
      "Pull request workflow with code review",
      "Branch protection and merge strategies",
      "CI/CD pipeline integration",
      "Issue tracking and project boards",
    ],
    scale: [
      "200M+ repositories",
      "100M+ developers",
      "Repos up to 10GB with fast clone",
    ],
    hints: [
      "Git object model: blobs, trees, commits, refs",
      "Efficient storage and serving of large repos",
      "Pack files and delta compression",
      "Webhooks for CI/CD on push events",
    ],
    timeMinutes: 55,
    relatedSlugs: ["code-deployment-system", "slack-team-chat", "online-judge"],
  },
  {
    name: "Slack / Team Chat",
    description: "Design a team communication platform",
    difficulty: "hard",
    brief: "Design a team communication platform with channels, threads, file sharing, integrations, and cross-workspace search.",
    requirements: [
      "Channels (public/private) and DMs",
      "Threaded conversations within channels",
      "File sharing and rich media previews",
      "App integrations and bot framework",
      "Full-text search across messages and files",
    ],
    scale: [
      "20M+ daily active users",
      "10B+ messages per day",
      "Delivery within 200ms",
    ],
    hints: [
      "Channel-based partitioning for horizontal scaling",
      "Workspace isolation vs cross-workspace features",
      "WebSocket per user with reconnection handling",
      "Separate search cluster with near-real-time indexing",
    ],
    timeMinutes: 55,
    relatedSlugs: ["chat-system", "google-docs-collaborative-editing", "notification-system"],
  },
  {
    name: "Airbnb / Rental Platform",
    description: "Design a property rental marketplace",
    difficulty: "hard",
    brief: "Design a property rental marketplace where hosts list properties and guests search, book, and pay for stays.",
    requirements: [
      "Property listing with photos, pricing, availability",
      "Search by location, dates, guests, price, amenities",
      "Booking with payment and host confirmation",
      "Reviews and ratings for hosts and guests",
      "Host-guest messaging",
    ],
    scale: [
      "10M+ active listings worldwide",
      "100K+ concurrent searches per second",
      "Booking confirmation within 10 seconds",
    ],
    hints: [
      "Geo-indexing for location search (Elasticsearch geo queries)",
      "Availability calendar: interval-based date range queries",
      "Trust and safety: ID verification, fraud detection",
      "Dynamic pricing: supply-demand signals for host suggestions",
    ],
    timeMinutes: 55,
    relatedSlugs: ["hotel-booking-system", "uber-ride-sharing", "proximity-service"],
  },
  {
    name: "Multiplayer Online Game Matchmaking",
    description: "Design a multiplayer online game matchmaking system",
    difficulty: "hard",
    brief: "Design a matchmaking system that groups players into balanced matches based on skill rating, latency, and preferences.",
    requirements: [
      "Skill-based matchmaking (ELO/MMR rating system)",
      "Low-latency server selection based on player geography",
      "Queue management with estimated wait times",
      "Party/group matching (friends queue together)",
      "Anti-cheat integration and smurf detection",
    ],
    scale: [
      "10M+ concurrent players in queue",
      "Match creation within 30 seconds for 95% of players",
      "Support 5v5, battle royale (100 players), and custom modes",
    ],
    hints: [
      "ELO/Glicko-2 rating system for skill measurement",
      "Trade-off between match quality and wait time",
      "Expanding search radius over time if no match found",
      "Region-based sharding of the matchmaking pool",
    ],
    timeMinutes: 50,
    relatedSlugs: ["distributed-task-scheduler", "proximity-service", "stock-exchange"],
  },
];

const ALL_TOPICS = [...EASY_TOPICS, ...MEDIUM_TOPICS, ...HARD_TOPICS];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  console.log(`\n🔧 Enriching ${ALL_TOPICS.length} topics...\n`);

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("drawlint-db");
    const col = db.collection("topics");

    let updated = 0;
    let created = 0;
    let failed = 0;

    for (const t of ALL_TOPICS) {
      const slug = slugify(t.name, { lower: true, strict: true });

      // Check if topic exists
      const existing = await col.findOne({ slug });

      if (existing) {
        // Update existing topic — only set enrichment fields
        const result = await col.updateOne(
          { slug },
          {
            $set: {
              description: t.description,
              difficulty: t.difficulty,
              source: "official",
              brief: t.brief,
              requirements: t.requirements,
              scale: t.scale,
              hints: t.hints,
              timeMinutes: t.timeMinutes,
              relatedSlugs: t.relatedSlugs,
              updatedAt: new Date(),
            },
          },
        );
        if (result.modifiedCount > 0 || result.matchedCount > 0) {
          updated++;
          console.log(`  ✅ Updated: ${t.name} (${t.difficulty})`);
        } else {
          failed++;
          console.log(`  ❌ Failed to update: ${t.name}`);
        }
      } else {
        // Insert new topic
        const now = new Date();
        await col.insertOne({
          _id: new ObjectId(),
          name: t.name,
          slug,
          description: t.description,
          difficulty: t.difficulty,
          source: "official",
          brief: t.brief,
          requirements: t.requirements,
          scale: t.scale,
          hints: t.hints,
          timeMinutes: t.timeMinutes,
          relatedSlugs: t.relatedSlugs,
          submissionCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        created++;
        console.log(`  🆕 Created: ${t.name} (${t.difficulty})`);
      }
    }

    console.log(`\n✨ Done: ${updated} updated, ${created} created, ${failed} failed.`);
    console.log(`   Total official topics: ${updated + created}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Enrichment migration failed:", err);
  process.exit(1);
});
