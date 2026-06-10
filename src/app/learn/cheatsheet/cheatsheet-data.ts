export type Pattern = {
  slug: string;
  name: string;
  /** Optional one-line summary for the collapsed card view; falls back to the first sentence of whatItIs. */
  summary?: string;
  whatItIs: string;
  whenToUse: string;
  usedIn: string[];
  tradeoffs: string;
  deepDive: string;
};

export type Category = {
  slug: string;
  title: string;
  emoji: string;
  patterns: Pattern[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "storage",
    title: "Storage Patterns",
    emoji: "💾",
    patterns: [
      {
        slug: "blob-presigned-urls",
        name: "Blob Storage + Presigned URLs",
        whatItIs: "Store large binary files (images, videos, docs) in object storage (S3/Azure Blob). Generate short-lived presigned URLs so clients upload/download directly without going through app servers.",
        whenToUse: "Any file > a few KB. Keeps binaries out of DB and app servers out of the hot path.",
        usedIn: ["YouTube", "Dropbox", "Pastebin", "WhatsApp", "Twitter", "DrawLint"],
        tradeoffs: "CDN cacheability limited with unique presigned URLs. Need two-step create→upload→finalize flow to avoid dangling records.",
        deepDive: "Multipart upload for large files (chunk, upload parts in parallel, complete). Resumable: client tracks uploaded parts, resumes from last successful chunk.",
      },
      {
        slug: "relational-db-replicas",
        name: "Relational DB (Postgres) + Read Replicas",
        whatItIs: "Postgres primary for writes with one or more read replicas. Writes go to primary, reads to replicas. Multi-AZ for HA.",
        whenToUse: "Structured data with relationships, ACID transactions needed, moderate scale (< ~10K write QPS).",
        usedIn: ["Twitter", "YouTube", "Ticketmaster", "Notification Service"],
        tradeoffs: "Single primary is write bottleneck. Replica lag means eventual consistency on reads. Shard by key when write QPS exceeds primary capacity.",
        deepDive: "Patroni/RDS Multi-AZ for auto failover. Stable writer endpoint so app reconnects automatically. Read-after-write: route post-write reads to primary or write-through cache.",
      },
      {
        slug: "cassandra",
        name: "Cassandra",
        whatItIs: "Wide-column NoSQL. Partition key determines which node owns the data. Optimized for high write throughput, time-series, and append-heavy workloads.",
        whenToUse: "High write QPS, time-ordered data, no complex joins needed, eventual consistency acceptable.",
        usedIn: ["WhatsApp", "Twitter", "YouTube", "Notification Service"],
        tradeoffs: "No joins, no ACID transactions. Partition key choice is critical — bad key = hot partitions. Read-heavy workloads need careful modeling.",
        deepDive: "Partition by (user_id, channel_id) for per-user ordering. Time-bucket partitions (per month) to avoid unbounded growth. Replication factor 3 across AZs.",
      },
      {
        slug: "redis",
        name: "Redis (Cache + Data Structure Store)",
        whatItIs: "In-memory store for caching, counters, presence, pub/sub, sorted sets, and short-lived state. Clustered with primary-replica failover.",
        whenToUse: "Hot read path needs sub-millisecond latency. Counters, session state, presence, rate limiting, leaderboards, seat holds.",
        usedIn: ["WhatsApp", "Twitter", "Ticketmaster", "Rate Limiter", "KV Store"],
        tradeoffs: "In-memory = expensive, limited size. Redis is cache not source of truth (usually). On crash, cold cache causes stampede. Use Redis Sentinel or Cluster for HA.",
        deepDive: "Cache-aside: app checks Redis → miss → query DB → populate Redis. Write-through: write DB and Redis together. Cache stampede protection: single-flight / mutex on miss.",
      },
      {
        slug: "elasticsearch",
        name: "Elasticsearch",
        whatItIs: "Distributed search engine built on inverted indexes. Supports full-text search, geo queries, facets, aggregations. Data fed via CDC from Postgres.",
        whenToUse: "Free-text search, geo search, faceted filtering, complex queries that would be slow on Postgres.",
        usedIn: ["Ticketmaster", "Blinkit", "Notification Service"],
        tradeoffs: "Eventually consistent — CDC lag means stale results. Not a source of truth. Multi-node with shard replicas for HA. Index overhead ~3x raw data size.",
        deepDive: "Multi-node cluster with primary + replica shards. CDC pipeline: Postgres WAL → Debezium → Kafka → ES consumer. Always validate at DB on write even if search says available.",
      },
    ],
  },
  {
    slug: "async-processing",
    title: "Async Processing Patterns",
    emoji: "⚡",
    patterns: [
      {
        slug: "outbox-cdc",
        name: "Outbox Pattern + CDC",
        whatItIs: "Write event to an outbox table in the SAME DB transaction as the business write. CDC worker tails WAL and publishes to Kafka. Guarantees no event is lost even if app crashes after DB commit.",
        whenToUse: "Any time you need reliable event publishing after a DB write. Prevents lost events between DB commit and queue publish.",
        usedIn: ["Twitter", "WhatsApp", "YouTube", "Ticketmaster", "Notification Service"],
        tradeoffs: "At-least-once delivery — CDC can re-publish on restart. Consumers must be idempotent. Adds outbox table to DB schema.",
        deepDive: "Debezium tails Postgres WAL. Outbox table: (id, aggregate_type, aggregate_id, event_type, payload, created_at). CDC partitioned by aggregate_id for ordering.",
      },
      {
        slug: "kafka",
        name: "Kafka (Partitioned Queue)",
        whatItIs: "Distributed log. Topics partitioned by key — all messages with same key go to same partition in order. Consumer groups scale out independently. Durable, replayable.",
        whenToUse: "High-throughput async event streaming, fan-out, decoupling producers from consumers, ordered per-entity processing.",
        usedIn: ["WhatsApp", "Twitter", "YouTube", "Ticketmaster", "Notification Service", "KV Store"],
        tradeoffs: "At-least-once delivery by default. Exactly-once requires Kafka transactions (complex). Partition by entity key for ordering. More partitions = more parallelism but more overhead.",
        deepDive: "Replication factor 3, min.insync.replicas=2, acks=all for durability. Consumer group offset checkpointing for resume on failure. Dead letter topic for poison messages.",
      },
      {
        slug: "flink-stream-processing",
        name: "Flink / Stream Processing",
        whatItIs: "Stateful stream processing. Consumes Kafka events, applies windowed aggregations, maintains keyed state in RocksDB, outputs results to Redis or DB.",
        whenToUse: "Real-time aggregations: like counts, view counts, trending scores, windowed metrics.",
        usedIn: ["YouTube", "Twitter", "Notification Service"],
        tradeoffs: "Operationally complex. RocksDB state survives crashes via checkpoints. Dedup by eventId + watermark window to handle at-least-once delivery from Kafka.",
        deepDive: "Keyed state per (video_id) or (user_id). Tumbling window (1 min) for counter aggregation. Exactly-once via Kafka source + checkpoint + sink transaction.",
      },
      {
        slug: "two-stage-fanout",
        name: "Two-Stage Fanout",
        whatItIs: "Stage 1: consume channel-partitioned queue in order → fanout worker. Stage 2: fanout worker publishes per-recipient tasks to recipient-partitioned delivery queue. Delivery workers drain per-recipient queues in parallel.",
        whenToUse: "Group messaging, social feeds, notifications to many recipients. Separates ordering guarantee from delivery parallelism.",
        usedIn: ["WhatsApp", "Twitter", "Notification Service"],
        tradeoffs: "More Kafka topics/partitions to manage. Fanout amplification still happens at Stage 1 — just parallelized. Receipt fanout is separate consumer group.",
        deepDive: "Ingest: partition by channelId (ordering). Fanout worker: reads ordered, publishes to per-recipient delivery queue partitioned by recipientId. Delivery worker: just push to WebSocket/FCM.",
      },
    ],
  },
  {
    slug: "scalability",
    title: "Scalability Patterns",
    emoji: "📈",
    patterns: [
      {
        slug: "consistent-hashing",
        name: "Consistent Hashing",
        whatItIs: "Hash keys onto a ring. Each node owns a range. Adding/removing nodes only remaps a fraction of keys. Virtual nodes for even distribution.",
        whenToUse: "Distributed caching, partitioned storage, WebSocket server routing, any system where you need stable key→node mapping with minimal reshuffling.",
        usedIn: ["WhatsApp", "KV Store", "Rate Limiter"],
        tradeoffs: "Hotspots if key distribution is skewed. Virtual nodes help but add complexity. Node failure remaps to neighbors — handle gracefully.",
        deepDive: "WebSocket: client consistent-hashed to server. On reconnect, re-hash to same server if alive, else new server. Client sends last seen sequence number for replay.",
      },
      {
        slug: "cdn",
        name: "CDN (Content Delivery Network)",
        whatItIs: "Edge nodes cache static content close to users. Client requests hit nearest edge. On miss, edge pulls from origin (S3/blob). Dramatically reduces origin bandwidth and latency.",
        whenToUse: "Static content: video chunks, images, JS/CSS. Any content served to many users globally.",
        usedIn: ["YouTube", "Twitter", "Dropbox", "Blinkit"],
        tradeoffs: "Presigned URLs hurt CDN cacheability (unique per request). Use stable public URLs for CDN-cacheable content. Cache invalidation needed on delete/update.",
        deepDive: "Origin shield: single cache tier in front of origin to absorb miss storms on viral content. Cache warming: pre-push popular content to edge after encoding completes.",
      },
      {
        slug: "fanout-hybrid",
        name: "Fan-out on Write vs Read (Hybrid)",
        whatItIs: "Fan-out on write: push new post to all followers' feeds immediately. Fan-out on read: don't precompute, merge at read time. Hybrid: fan-out on write for normal users, pull-at-read for celebrities.",
        whenToUse: "Social feeds. Pure fan-out breaks for accounts with 200M followers. Pure pull is slow for users following many people.",
        usedIn: ["Twitter", "Instagram"],
        tradeoffs: "Fan-out on write: fast reads, expensive writes for high-follower accounts. Fan-out on read: cheap writes, slow reads. Hybrid: most complex but production-correct.",
        deepDive: "Celebrity threshold (~1M followers): skip fan-out, store tweets separately. At read time: fetch precomputed feed + celebrity tweets + merge + rank. Hot-key replication for celebrity feed cache.",
      },
      {
        slug: "hot-key-mitigation",
        name: "Hot Key / Hot Partition Mitigation",
        whatItIs: "A single key (celebrity tweet, viral video, hot product) gets disproportionate traffic. Mitigations: replicate the key N times (celeb:123:copy0..N-1), local in-process cache, request coalescing (single-flight).",
        whenToUse: "Any system with skewed access patterns: celebrity accounts, viral content, flash sales.",
        usedIn: ["Twitter", "YouTube", "Ticketmaster", "Blinkit"],
        tradeoffs: "N copies means stale reads possible between copies. Request coalescing reduces DB hits but adds coordination complexity.",
        deepDive: "Single-flight: collapse N concurrent identical cache-miss requests into 1 DB call, return result to all N waiters. Prevents thundering herd on cache expiry.",
      },
      {
        slug: "geospatial-indexing",
        name: "Geospatial Indexing (H3 / Geohash)",
        whatItIs: "Divide earth into hierarchical hex cells (H3) or grid cells (Geohash). Index by cell. Range queries become cell lookups. Precompute delivery zones offline.",
        whenToUse: "Location-based search: nearby stores, driver matching, delivery eligibility, points of interest.",
        usedIn: ["Blinkit", "Uber"],
        tradeoffs: "Cell boundaries cause edge cases — query neighboring cells too. H3 more uniform than Geohash. Precompute zones offline (async Google Maps) vs compute on request.",
        deepDive: "Blinkit: precompute H3 cells reachable within 1 hour from each DC. Store as polygon in Postgres/ES. Search = geospatial query on ES, no Google Maps on hot path.",
      },
    ],
  },
  {
    slug: "reliability",
    title: "Reliability Patterns",
    emoji: "🛡️",
    patterns: [
      {
        slug: "idempotency-keys",
        name: "Idempotency Keys",
        whatItIs: "Client generates unique key per logical operation. Server stores (idempotency_key → result). On retry, returns cached result instead of re-executing. Prevents duplicate orders, payments, messages.",
        whenToUse: "Any mutation that must not execute twice: order creation, payment, message send, booking.",
        usedIn: ["Ticketmaster", "Blinkit", "YouTube", "WhatsApp", "Notification Service"],
        tradeoffs: "Need to store and expire idempotency keys. Key TTL must exceed client retry window. Payload must match for same key (reject mismatched payload).",
        deepDive: "Store in Redis with TTL or DB. Key = UUID generated client-side. Response includes original result + idempotency header. 409 if same key + different payload.",
      },
      {
        slug: "distributed-locking",
        name: "Distributed Locking / Seat Holds",
        whatItIs: "Use Redis SETNX or Postgres row lock to acquire exclusive access to a resource for a TTL. Prevents double-booking, overselling, race conditions on shared inventory.",
        whenToUse: "Seat reservation, inventory hold, any resource with limited quantity under concurrent demand.",
        usedIn: ["Ticketmaster", "Blinkit"],
        tradeoffs: "Lock TTL must be long enough for transaction but short enough to release on crash. Redis lock is not durable — use Postgres row lock for stronger guarantees. Redlock for multi-node Redis.",
        deepDive: "Ticketmaster: Redis sorted set for hold expiry (score = expiry_time). Worker polls ZRANGEBYSCORE for expired holds, releases inventory. Avoids expensive table scans.",
      },
      {
        slug: "circuit-breaker",
        name: "Circuit Breaker",
        whatItIs: "Wrap calls to external dependencies. After N failures, circuit opens — requests fail fast without hitting the dependency. After timeout, half-open: allow one probe. On success, close.",
        whenToUse: "Any call to external service (payment gateway, Google Maps, push provider) that can fail or slow down.",
        usedIn: ["Ticketmaster", "Notification Service", "Blinkit"],
        tradeoffs: "False positives: circuit opens on transient spike, healthy requests fail fast. Tune thresholds carefully. Combine with fallback behavior (fail-open vs fail-close).",
        deepDive: "States: CLOSED (normal) → OPEN (fail fast) → HALF_OPEN (probe). Libraries: Resilience4j (Java), Polly (.NET), Hystrix (deprecated). Metrics: error rate over sliding window.",
      },
      {
        slug: "saga-pattern",
        name: "Saga Pattern (Distributed Transactions)",
        whatItIs: "Sequence of local transactions, each publishing events to trigger next step. On failure, compensating transactions undo previous steps. No distributed lock needed.",
        whenToUse: "Multi-service workflows where ACID transactions aren't possible: order → payment → fulfillment → notification.",
        usedIn: ["Ticketmaster", "Blinkit"],
        tradeoffs: "Complex to implement. Compensating transactions must be idempotent. Difficult to debug. Choreography (event-driven) vs orchestration (central coordinator) tradeoffs.",
        deepDive: "Choreography: each service listens for events and reacts. Orchestrator: central service drives the workflow, handles failures. Prefer orchestrator for complex flows.",
      },
      {
        slug: "wal-quorum",
        name: "WAL + Quorum (Distributed KV / Databases)",
        whatItIs: "Write-Ahead Log: every write is appended to WAL before applied. Quorum: write to W replicas, read from R replicas. If W + R > N, guaranteed to see latest write.",
        whenToUse: "Distributed storage systems, replicated KV stores, databases with configurable consistency.",
        usedIn: ["KV Store"],
        tradeoffs: "Strong consistency (W+R>N) has higher latency. Eventual consistency (W+R<=N) is faster but may read stale data. WAL fsync adds write latency.",
        deepDive: "W=2, R=2, N=3: Strong. W=1, R=1, N=3: Eventual. Leader election via Raft. Replica lag tracking for safe promotion — promote most up-to-date replica on primary failure.",
      },
    ],
  },
  {
    slug: "communication",
    title: "Communication Patterns",
    emoji: "📡",
    patterns: [
      {
        slug: "websockets-presence",
        name: "WebSockets + Presence",
        whatItIs: "Persistent bidirectional TCP connection. Client connects via HTTP upgrade. Server pushes events without polling. Presence stored in Redis: userId → wsServerId.",
        whenToUse: "Real-time bidirectional: chat, live notifications, multiplayer, collaborative editing.",
        usedIn: ["WhatsApp", "Discord", "Slack", "Uber"],
        tradeoffs: "Stateful — reconnects are complex. Scale via consistent hashing to same server. Redis presence needed to route messages to correct server.",
        deepDive: "On reconnect: client sends last-seen message ID. Server replays missed messages. Consistent hashing ensures same server on reconnect. On server crash: reconnect to new server, replay from Cassandra.",
      },
      {
        slug: "hls-dash",
        name: "HLS / DASH Adaptive Bitrate Streaming",
        whatItIs: "Video split into 2-6 second chunks at multiple bitrates (360p/720p/1080p/4K). Manifest file (.m3u8 for HLS) lists all chunks. Client measures bandwidth + buffer, requests appropriate chunk.",
        whenToUse: "Video streaming. Adapts quality to network conditions automatically.",
        usedIn: ["YouTube", "Netflix", "Hotstar", "TikTok"],
        tradeoffs: "Encoding pipeline needed (multiple resolutions). Storage 3x for multiple renditions. CDN essential — every viewer fetches same chunks.",
        deepDive: "Encoding: raw upload → Kafka → encoding workers → chunk + manifest → S3 → CDN. Client: buffer < 10s → downgrade quality. Buffer > 30s → upgrade. Manifest URL only returned when status=COMPLETED.",
      },
      {
        slug: "sse-vs-polling",
        name: "Server-Sent Events (SSE) vs Polling",
        whatItIs: "SSE: server pushes updates over persistent HTTP connection (one-way). Polling: client requests on interval. Long-poll: server holds request until update available.",
        whenToUse: "SSE: one-way server-to-client updates (notifications, feed refresh, order status). Polling: simple status checks. WebSocket: bidirectional.",
        usedIn: ["Order status updates", "Notification delivery", "Job progress"],
        tradeoffs: "SSE is simpler than WebSocket for one-way. Polling wastes bandwidth. Long-poll has server resource cost. SSE reconnects automatically.",
        deepDive: "Booking flow: POST /bookings returns 202 + bookingId. Client polls GET /bookings/:id/status. States: PENDING_PAYMENT_SETUP → PAYMENT_READY → CONFIRMED → FAILED.",
      },
    ],
  },
  {
    slug: "data-modeling",
    title: "Data Modeling Patterns",
    emoji: "🗂️",
    patterns: [
      {
        slug: "snowflake-base62",
        name: "Snowflake ID + Base62",
        whatItIs: "Snowflake: 64-bit ID = timestamp (41b) + machine ID (10b) + sequence (12b). Time-ordered, globally unique, no coordination needed. Base62 encode for short human-readable IDs.",
        whenToUse: "Any system needing distributed unique IDs: tweets, pastes, messages, users, orders.",
        usedIn: ["Twitter", "Pastebin", "URL Shortener", "WhatsApp"],
        tradeoffs: "Machine ID must be unique — coordinate via Zookeeper or static config. Clock skew can cause out-of-order IDs. Base62 gives ~7 char IDs for most use cases.",
        deepDive: "41 bits timestamp → ~69 years from epoch. 12 bits sequence → 4096 IDs/ms per machine. 10 bits machine → 1024 machines. Base62 (a-zA-Z0-9): 62^7 = 3.5T unique IDs.",
      },
      {
        slug: "soft-delete-tombstones",
        name: "Soft Delete + Tombstones",
        whatItIs: "Mark records as deleted (status=DELETED, deleted_at=now) instead of physically removing rows. Reads filter out deleted records. Physical cleanup runs async.",
        whenToUse: "Any delete that has downstream effects: tweet deletes need to be filtered from feeds, paste deletes need blob cleanup, message deletes need CDC propagation.",
        usedIn: ["Twitter", "Pastebin", "Dropbox", "KV Store"],
        tradeoffs: "DB grows without cleanup job. Need to handle tombstones in read path. CDC publishes delete events for downstream cleanup.",
        deepDive: "Twitter: tweet deleted → tombstone in DB → filtered at feed materialization → CDC publishes delete event → fan-out service removes from Cassandra feeds.",
      },
      {
        slug: "event-sourcing-outbox",
        name: "Event Sourcing / Outbox Table",
        whatItIs: "Store events (not state) as source of truth. Current state derived by replaying events. Outbox: write event to DB table in same transaction, CDC publishes to Kafka.",
        whenToUse: "Audit trail needed, state reconstruction needed, reliable event publishing after DB write.",
        usedIn: ["Ticketmaster", "Notification Service", "KV Store"],
        tradeoffs: "Event replay can be slow for large history. Snapshots help. Outbox table grows — needs cleanup. At-least-once delivery requires idempotent consumers.",
        deepDive: "Outbox schema: (id UUID, aggregate_id, event_type, payload JSONB, published BOOLEAN, created_at). CDC polls for unpublished rows, publishes, marks published.",
      },
    ],
  },
  {
    slug: "capacity",
    title: "Capacity Quick Reference",
    emoji: "📊",
    patterns: [
      {
        slug: "key-numbers",
        name: "Key Numbers to Memorize",
        whatItIs: "1 day = 86,400 sec. 1M req/day = ~12 QPS. 1B req/day = ~11,600 QPS. 1KB * 1M = 1GB. 1KB * 1B = 1TB. Peak = 3-5x average (use 5x for social, 3x for enterprise).",
        whenToUse: "Every capacity estimation. Start with DAU → req/day → avg QPS → peak QPS → storage → replication.",
        usedIn: ["All designs"],
        tradeoffs: "N/A — these are reference numbers",
        deepDive: "Formula: QPS = DAU × actions_per_day / 86400. Storage/day = QPS × avg_payload_size × 86400. Annual = daily × 365. With replication: × RF (usually 3).",
      },
      {
        slug: "capacity-chain",
        name: "Capacity Chain Template",
        whatItIs: "DAU → actions/day → avg QPS → peak QPS → storage/day → storage/year → replicated storage → per-component breakdown → node count.",
        whenToUse: "Every system design. Do this before drawing HLD.",
        usedIn: ["All designs"],
        tradeoffs: "N/A",
        deepDive: "Example (WhatsApp): 1B DAU × 100 msg/day = 100B msg/day / 86400 = 1.1M msg/sec avg. Peak 5x = 5.5M msg/sec. Storage: 100B × 1KB = 100TB/day × 3 (replication) = 300TB/day.",
      },
    ],
  },
];

// Derive all unique design tags for the filter UI
export const ALL_DESIGNS: string[] = Array.from(
  new Set(
    CATEGORIES.flatMap((cat) =>
      cat.patterns.flatMap((p) => p.usedIn)
    )
  )
).sort();
