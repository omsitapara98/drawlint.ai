// Workbook content registry — pure metadata, no React.
// Drives the sidebar, prev/next navigation, the /learn hub, and static params.

export type ModuleId = "fundamentals" | "building-blocks" | "patterns";

export type ModuleStatus = "available" | "coming-soon";

export type ModuleMeta = {
  id: ModuleId;
  title: string;
  emoji: string;
  description: string;
  status: ModuleStatus;
  /** Where to send the user for a "coming soon" module, if anywhere. */
  href?: string;
};

export type LessonMeta = {
  slug: string;
  module: ModuleId;
  /** Optional sub-group within a module (used to organize the Patterns module by category). */
  group?: string;
  title: string;
  summary: string;
  order: number;
  estReadMin: number;
};

export const MODULES: ModuleMeta[] = [
  {
    id: "fundamentals",
    title: "Fundamentals",
    emoji: "🧱",
    description:
      "The vocabulary every system design conversation is built on. Start here.",
    status: "available",
  },
  {
    id: "building-blocks",
    title: "Core Building Blocks",
    emoji: "🧩",
    description:
      "Databases, caches, queues, CDNs — the components you wire together in a design.",
    status: "available",
  },
  {
    id: "patterns",
    title: "Design Patterns",
    emoji: "🗺️",
    description:
      "Reusable solutions to recurring problems, grouped by category. Also available as a quick-reference cheatsheet.",
    status: "available",
  },
];

export const LESSONS: LessonMeta[] = [
  {
    slug: "what-is-system-design",
    module: "fundamentals",
    title: "What Is System Design?",
    summary:
      "What the discipline actually is, why interviews test it, and how to think about trade-offs.",
    order: 1,
    estReadMin: 6,
  },
  {
    slug: "latency-vs-throughput",
    module: "fundamentals",
    title: "Latency vs Throughput",
    summary:
      "Two numbers people constantly mix up — and the difference matters in every design.",
    order: 2,
    estReadMin: 6,
  },
  {
    slug: "availability-and-slas",
    module: "fundamentals",
    title: "Availability, Reliability & SLAs",
    summary:
      'What "five nines" really means, and the promises behind SLA / SLO / SLI.',
    order: 3,
    estReadMin: 5,
  },
  {
    slug: "cap-theorem",
    module: "fundamentals",
    title: "The CAP Theorem (and PACELC)",
    summary:
      "Why a distributed system can't have it all when the network breaks — explained plainly.",
    order: 4,
    estReadMin: 5,
  },
  {
    slug: "consistency-models",
    module: "fundamentals",
    title: "Consistency Models",
    summary:
      "Strong vs eventual consistency, and the in-between guarantees that make apps feel correct.",
    order: 5,
    estReadMin: 6,
  },
  {
    slug: "scaling-vertical-horizontal",
    module: "fundamentals",
    title: "Scaling: Vertical vs Horizontal",
    summary:
      "Bigger machine vs more machines — the first fork in the road for any growing system.",
    order: 6,
    estReadMin: 5,
  },
  {
    slug: "load-balancing-basics",
    module: "fundamentals",
    title: "Load Balancing Basics",
    summary:
      "How traffic gets spread across servers, and the algorithms that decide who handles what.",
    order: 7,
    estReadMin: 5,
  },
  {
    slug: "caching-basics",
    module: "fundamentals",
    title: "Caching Basics",
    summary:
      "The single highest-leverage trick in system design — plus the traps that bite beginners.",
    order: 8,
    estReadMin: 6,
  },
  {
    slug: "capacity-estimation",
    module: "fundamentals",
    title: "Back-of-the-Envelope Estimation",
    summary:
      "Turn 'a billion users' into QPS, storage, and server counts in under five minutes.",
    order: 9,
    estReadMin: 5,
  },

  /* ── Module 2: Core Building Blocks ─────────────────────── */
  {
    slug: "sql-vs-nosql",
    module: "building-blocks",
    title: "SQL vs NoSQL Databases",
    summary:
      "Relational vs non-relational stores — what each is good at and how to choose.",
    order: 1,
    estReadMin: 7,
  },
  {
    slug: "database-replication",
    module: "building-blocks",
    title: "Database Replication",
    summary:
      "Copy data across machines for availability and read scale — and the lag it introduces.",
    order: 2,
    estReadMin: 6,
  },
  {
    slug: "sharding-partitioning",
    module: "building-blocks",
    title: "Sharding & Partitioning",
    summary:
      "Split one giant dataset across many machines when a single database can't keep up.",
    order: 3,
    estReadMin: 6,
  },
  {
    slug: "caching-systems",
    module: "building-blocks",
    title: "Caching Systems (Redis & Memcached)",
    summary:
      "The infrastructure behind caching — write strategies, data structures, and HA.",
    order: 4,
    estReadMin: 6,
  },
  {
    slug: "message-queues",
    module: "building-blocks",
    title: "Message Queues & Streams",
    summary:
      "Decouple producers from consumers, absorb spikes, and process work asynchronously.",
    order: 5,
    estReadMin: 6,
  },
  {
    slug: "content-delivery-networks",
    module: "building-blocks",
    title: "Content Delivery Networks (CDNs)",
    summary:
      "Cache static content at the edge, close to users, to cut latency and offload origins.",
    order: 6,
    estReadMin: 6,
  },
  {
    slug: "object-storage",
    module: "building-blocks",
    title: "Object / Blob Storage",
    summary:
      "Where big files live — images, videos, backups — and why not in your database.",
    order: 7,
    estReadMin: 6,
  },
  {
    slug: "search-engines",
    module: "building-blocks",
    title: "Search Engines (Elasticsearch)",
    summary:
      "Full-text and faceted search built on inverted indexes — and why it's a separate system.",
    order: 8,
    estReadMin: 7,
  },
  {
    slug: "api-gateway",
    module: "building-blocks",
    title: "API Gateways",
    summary:
      "The single front door that handles auth, routing, rate limiting, and more for your APIs.",
    order: 9,
    estReadMin: 5,
  },
  {
    slug: "rate-limiting",
    module: "building-blocks",
    title: "Rate Limiting",
    summary:
      "Protect your system from abuse and overload by capping how fast clients can call you.",
    order: 10,
    estReadMin: 6,
  },

  /* ── Module 3: Design Patterns ──────────────────────────── */
  // Storage Patterns
  {
    slug: "pattern-blob-presigned-urls",
    module: "patterns",
    group: "Storage Patterns",
    title: "Blob Storage + Presigned URLs",
    summary:
      "Let clients upload/download large files directly from object storage, bypassing your servers.",
    order: 1,
    estReadMin: 9,
  },
  {
    slug: "pattern-relational-db-replicas",
    module: "patterns",
    group: "Storage Patterns",
    title: "Relational DB + Read Replicas",
    summary:
      "A Postgres primary for writes plus replicas for reads — the workhorse of most systems.",
    order: 2,
    estReadMin: 7,
  },
  {
    slug: "pattern-cassandra",
    module: "patterns",
    group: "Storage Patterns",
    title: "Cassandra (Wide-Column)",
    summary:
      "A write-optimized NoSQL store for high-throughput, time-ordered, append-heavy data.",
    order: 3,
    estReadMin: 6,
  },
  {
    slug: "pattern-redis",
    module: "patterns",
    group: "Storage Patterns",
    title: "Redis as Cache & Data Structures",
    summary:
      "In-memory store for caching, counters, presence, rate limits, and seat holds.",
    order: 4,
    estReadMin: 6,
  },
  {
    slug: "pattern-elasticsearch",
    module: "patterns",
    group: "Storage Patterns",
    title: "Elasticsearch for Search",
    summary:
      "A search index fed from your database via CDC, for full-text, geo, and faceted queries.",
    order: 5,
    estReadMin: 6,
  },
  // Async Processing Patterns
  {
    slug: "pattern-outbox-cdc",
    module: "patterns",
    group: "Async Processing",
    title: "Outbox Pattern + CDC",
    summary:
      "Reliably publish events after a DB write — never lose a message between commit and queue.",
    order: 6,
    estReadMin: 6,
  },
  {
    slug: "pattern-kafka",
    module: "patterns",
    group: "Async Processing",
    title: "Kafka: Partitioned Log",
    summary:
      "A durable, replayable, ordered-per-key log for high-throughput event streaming.",
    order: 7,
    estReadMin: 6,
  },
  {
    slug: "pattern-stream-processing",
    module: "patterns",
    group: "Async Processing",
    title: "Stream Processing (Flink)",
    summary:
      "Stateful, windowed aggregations over event streams — like counts, trending, metrics.",
    order: 8,
    estReadMin: 6,
  },
  {
    slug: "pattern-two-stage-fanout",
    module: "patterns",
    group: "Async Processing",
    title: "Two-Stage Fanout",
    summary:
      "Separate ordering from delivery parallelism for group messaging and social feeds.",
    order: 9,
    estReadMin: 6,
  },
  // Scalability Patterns
  {
    slug: "pattern-consistent-hashing",
    module: "patterns",
    group: "Scalability",
    title: "Consistent Hashing",
    summary:
      "Map keys to nodes so that adding/removing a node only remaps a small fraction of keys.",
    order: 10,
    estReadMin: 7,
  },
  {
    slug: "pattern-cdn",
    module: "patterns",
    group: "Scalability",
    title: "CDN for Static Content",
    summary:
      "Serve static assets from edge nodes near users to slash latency and origin load.",
    order: 11,
    estReadMin: 6,
  },
  {
    slug: "pattern-fanout-write-read",
    module: "patterns",
    group: "Scalability",
    title: "Fan-out on Write vs Read",
    summary:
      "How social feeds are built — and the hybrid that handles celebrities with millions of followers.",
    order: 12,
    estReadMin: 6,
  },
  {
    slug: "pattern-hot-key",
    module: "patterns",
    group: "Scalability",
    title: "Hot Key / Hot Partition Mitigation",
    summary:
      "Tame viral content and celebrity traffic with replication, local caches, and single-flight.",
    order: 13,
    estReadMin: 6,
  },
  {
    slug: "pattern-geospatial-indexing",
    module: "patterns",
    group: "Scalability",
    title: "Geospatial Indexing (H3 / Geohash)",
    summary:
      "Turn 'find things near me' into fast cell lookups instead of expensive distance scans.",
    order: 14,
    estReadMin: 5,
  },
  // Reliability Patterns
  {
    slug: "pattern-idempotency-keys",
    module: "patterns",
    group: "Reliability",
    title: "Idempotency Keys",
    summary:
      "Make retries safe so a duplicated request never creates a second order or payment.",
    order: 15,
    estReadMin: 8,
  },
  {
    slug: "pattern-distributed-locking",
    module: "patterns",
    group: "Reliability",
    title: "Distributed Locking / Seat Holds",
    summary:
      "Grant temporary exclusive access to a resource to prevent double-booking and oversell.",
    order: 16,
    estReadMin: 6,
  },
  {
    slug: "pattern-circuit-breaker",
    module: "patterns",
    group: "Reliability",
    title: "Circuit Breaker",
    summary:
      "Fail fast when a dependency is sick, so one slow service doesn't drag down the whole system.",
    order: 17,
    estReadMin: 6,
  },
  {
    slug: "pattern-saga",
    module: "patterns",
    group: "Reliability",
    title: "Saga Pattern",
    summary:
      "Coordinate a multi-service workflow with compensating actions instead of one big transaction.",
    order: 18,
    estReadMin: 6,
  },
  {
    slug: "pattern-wal-quorum",
    module: "patterns",
    group: "Reliability",
    title: "WAL + Quorum",
    summary:
      "How distributed databases stay durable and tune consistency with write/read quorums.",
    order: 19,
    estReadMin: 7,
  },
  // Communication Patterns
  {
    slug: "pattern-websockets-presence",
    module: "patterns",
    group: "Communication",
    title: "WebSockets + Presence",
    summary:
      "Persistent connections for real-time chat, notifications, and live collaboration.",
    order: 20,
    estReadMin: 7,
  },
  {
    slug: "pattern-adaptive-streaming",
    module: "patterns",
    group: "Communication",
    title: "HLS / DASH Adaptive Streaming",
    summary:
      "Stream video as small multi-bitrate chunks so quality adapts to each viewer's network.",
    order: 21,
    estReadMin: 6,
  },
  {
    slug: "pattern-sse-vs-polling",
    module: "patterns",
    group: "Communication",
    title: "SSE vs Polling",
    summary:
      "Choosing how clients receive updates: polling, long-poll, server-sent events, or WebSockets.",
    order: 22,
    estReadMin: 6,
  },
  // Data Modeling Patterns
  {
    slug: "pattern-snowflake-id",
    module: "patterns",
    group: "Data Modeling",
    title: "Snowflake IDs + Base62",
    summary:
      "Generate time-ordered, globally unique IDs with no coordination, then shorten them.",
    order: 23,
    estReadMin: 5,
  },
  {
    slug: "pattern-soft-delete",
    module: "patterns",
    group: "Data Modeling",
    title: "Soft Delete + Tombstones",
    summary:
      "Mark records deleted instead of removing them, so downstream systems can catch up.",
    order: 24,
    estReadMin: 6,
  },
  {
    slug: "pattern-event-sourcing",
    module: "patterns",
    group: "Data Modeling",
    title: "Event Sourcing",
    summary:
      "Store the stream of events as the source of truth and derive current state by replaying.",
    order: 25,
    estReadMin: 5,
  },
  // Capacity Quick Reference
  {
    slug: "pattern-capacity-numbers",
    module: "patterns",
    group: "Capacity Reference",
    title: "Numbers to Memorize",
    summary:
      "The handful of reference figures that make capacity estimation fast in any interview.",
    order: 26,
    estReadMin: 4,
  },
  {
    slug: "pattern-capacity-chain",
    module: "patterns",
    group: "Capacity Reference",
    title: "The Capacity Chain Template",
    summary:
      "A repeatable pipeline from DAU to QPS to storage to node count for every design.",
    order: 27,
    estReadMin: 5,
  },
];

const LESSONS_SORTED = [...LESSONS].sort((a, b) => {
  const am = MODULES.findIndex((m) => m.id === a.module);
  const bm = MODULES.findIndex((m) => m.id === b.module);
  if (am !== bm) return am - bm;
  return a.order - b.order;
});

export function getLesson(slug: string): LessonMeta | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

export function lessonsByModule(moduleId: ModuleId): LessonMeta[] {
  return LESSONS.filter((l) => l.module === moduleId).sort(
    (a, b) => a.order - b.order,
  );
}

/** Lessons of a module organized into ordered groups (by the optional `group` field). */
export function lessonGroups(
  moduleId: ModuleId,
): { group: string | null; lessons: LessonMeta[] }[] {
  const lessons = lessonsByModule(moduleId);
  const groups: { group: string | null; lessons: LessonMeta[] }[] = [];
  for (const lesson of lessons) {
    const key = lesson.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.group === key) last.lessons.push(lesson);
    else groups.push({ group: key, lessons: [lesson] });
  }
  return groups;
}

export function getModule(moduleId: ModuleId): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === moduleId);
}

export function getAdjacentLessons(slug: string): {
  prev: LessonMeta | null;
  next: LessonMeta | null;
} {
  const idx = LESSONS_SORTED.findIndex((l) => l.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? LESSONS_SORTED[idx - 1] : null,
    next: idx < LESSONS_SORTED.length - 1 ? LESSONS_SORTED[idx + 1] : null,
  };
}

export function allLessonSlugs(): string[] {
  return LESSONS.map((l) => l.slug);
}
