import {
  Prose,
  LessonSection,
  H3,
  P,
  XLink,
  Term,
  UL,
  LI,
  Callout,
  Analogy,
  CodeBlock,
  CompareTable,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Redis</Term> is an in-memory data store used for very fast access
        to hot data and short-lived coordination state. People call it a cache,
        but that undersells it: Redis gives you strings, hashes, lists, sets,
        sorted sets, streams, HyperLogLogs, and bitmaps with atomic operations
        that solve problems a plain key-value cache cannot.
      </P>

      <Analogy>
        Redis is the chef&apos;s mise en place: small bowls of prepped ingredients
        within arm&apos;s reach. The pantry is still the durable database, but the
        chef keeps the next few minutes of high-value ingredients on the counter,
        arranged in containers that match how each ingredient will be used.
      </Analogy>

      <LessonSection id="problem" title="The problem: the source of truth is too slow for hot paths">
        <P>
          Your relational database or document store should remain authoritative,
          but not every request deserves a trip there. Recomputing a home feed,
          checking whether a user exceeded an API quota, loading a leaderboard,
          or holding a concert seat for five minutes can be too latency-sensitive
          or too write-noisy for the source-of-truth database.
        </P>
        <CodeBlock label="hot path without Redis">{`GET /product/42
  ├─ query product row
  ├─ query inventory summary
  ├─ query review count
  ├─ query promotion rules
  └─ render page after several database round trips`}</CodeBlock>
        <P>
          Redis moves carefully chosen hot data into memory and lets the
          application operate on it with single-command atomicity. The failure
          mode to remember is that memory is finite and usually not the ultimate
          source of truth. If you put everything in Redis forever, you have built
          an expensive and fragile database without the durability guarantees you
          probably need.
        </P>
        <Callout type="key" title="The core idea">
          Use Redis for hot, derived, or short-lived state where microsecond-to-
          low-millisecond access and atomic data-structure operations matter.
          Keep durable facts in a real source-of-truth database unless you have
          explicitly designed Redis persistence and recovery.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanics" title="How Redis works: memory plus a single-threaded event loop">
        <P>
          Redis keeps its primary working set in RAM and processes commands
          through an event loop. Most commands are small and execute quickly, so a
          single thread can serve many clients without lock contention. This
          design is one reason Redis feels so fast, but it also means one slow
          command can block other clients on that shard.
        </P>
        <CodeBlock label="cache-aside read path">{`GET /users/42
  ├─ redis GET user:42
  │    ├─ hit  → return cached JSON
  │    └─ miss → query database
  │             redis SET user:42 <json> EX 300
  │             return database row`}</CodeBlock>
        <H3>Why single-threaded does not mean low capacity</H3>
        <P>
          Network I/O is event-driven, data is in memory, and operations such as
          <code>INCR</code>, <code>HGET</code>, and <code>ZADD</code> are compact.
          Throughput comes from doing tiny operations predictably. The danger is
          using commands that scan huge keys, running heavy Lua scripts, or
          storing giant values that make one event-loop turn take too long.
        </P>
        <CompareTable
          headers={["Property", "Benefit", "Gotcha"]}
          rows={[
            ["In-memory", "Sub-ms access to hot data", "RAM cost and eviction pressure"],
            ["Single event loop", "Atomic simple commands without locks", "Slow commands block the shard"],
            ["TTL support", "Natural expiry for holds, sessions, and cache entries", "Synchronized expiry can cause stampedes"],
            ["Rich types", "Operations match product features", "Wrong type choice creates awkward code"],
          ]}
        />
      </LessonSection>

      <LessonSection id="data-structures" title="Core data structures and what they are for">
        <P>
          Redis is most valuable when you choose the data structure that matches
          the access pattern. A leaderboard is not just a cached JSON blob; it is
          a sorted set. Presence is not just a table scan; it is a set or short
          TTL key per online user.
        </P>
        <CompareTable
          headers={["Data structure", "Example command", "Use case"]}
          rows={[
            ["String", "GET / SET / INCR", "Cached JSON, counters, feature flags, seat hold token"],
            ["Hash", "HGET / HSET", "User profile fields, session attributes, shopping cart metadata"],
            ["List", "LPUSH / BRPOP", "Simple queues, recent activity, worker handoff"],
            ["Set", "SADD / SISMEMBER", "Unique online users, tags, membership checks, mutual friends"],
            ["Sorted set", "ZADD / ZRANGE", "Leaderboards, priority queues, expiring holds ordered by deadline"],
            ["Stream", "XADD / XREADGROUP", "Durable-ish event log, background job fan-out, audit tail"],
            ["HyperLogLog", "PFADD / PFCOUNT", "Approximate unique visitors with tiny memory"],
            ["Bitmap", "SETBIT / BITCOUNT", "Daily active flags, attendance, feature rollout bitsets"],
          ]}
        />
        <CodeBlock label="leaderboard with a sorted set">{`ZADD leaderboard:weekly 1842 user:9
ZADD leaderboard:weekly 2210 user:12
ZREVRANGE leaderboard:weekly 0 9 WITHSCORES
ZRANK leaderboard:weekly user:9`}</CodeBlock>
        <Callout type="tip" title="Atomic operations are the hidden superpower">
          A single Redis command is atomic on its shard. That makes counters,
          membership checks, sorted-set updates, and TTL-based holds much simpler
          than a read-modify-write loop against a slower database.
        </Callout>
      </LessonSection>

      <LessonSection id="flagship-uses" title="Flagship uses: cache, limiter, leaderboard, presence, hold, lock">
        <P>
          Redis appears in many architectures because the same primitives combine
          into common product features. The trick is to be explicit about which
          features are derived and rebuildable versus which ones require careful
          persistence and reconciliation.
        </P>
        <CodeBlock label="fixed-window rate limiter">{`key = "rate:user:42:2026-06-10T07:16"
count = INCR key
if count == 1:
  EXPIRE key 60
if count > 100:
  reject request with 429`}</CodeBlock>
        <CompareTable
          headers={["Use", "Redis primitive", "Design note"]}
          rows={[
            ["Cache", "String or hash + TTL", "Use cache-aside, jittered TTLs, and single-flight rebuilds"],
            ["Rate limiter", "INCR + EXPIRE or sorted set", "Choose fixed window, sliding window, or token bucket"],
            ["Leaderboard", "Sorted set", "Score updates and rank queries are natural"],
            ["Presence", "Set or TTL key", "Expire automatically when heartbeats stop"],
            ["Seat hold", "SET key token NX EX 300", "TTL releases abandoned holds without a cron job"],
            ["Distributed lock", "SET resource token NX PX ttl", "Use fencing tokens for correctness-critical work"],
          ]}
        />
        <H3>Seat hold example</H3>
        <CodeBlock label="hold one seat for five minutes">{`SET seat:show123:A7 hold_8f31 NX EX 300
-- success: user owns a temporary hold
-- nil: somebody else already holds or bought the seat

-- checkout must still confirm in the database transaction
-- before charging, because Redis is not the ticket ledger`}</CodeBlock>
        <Callout type="info" title="Related patterns">
          For lock safety, especially fencing tokens and failure cases, see{" "}
          <XLink href="/learn/pattern-distributed-locking">Distributed Locking</XLink>.
          For cache-aside, write-through, TTLs, and stampedes, see{" "}
          <XLink href="/learn/caching-systems">Caching Systems</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="durability-cluster" title="Persistence, replication, and cluster mode">
        <P>
          Redis can persist data, but you must choose what kind of recovery you
          need. <Term>RDB</Term> snapshots write compact point-in-time dumps.
          <Term>AOF</Term> logs write commands so Redis can replay them after a
          restart. Many systems enable both: RDB for fast snapshots and AOF for a
          smaller loss window.
        </P>
        <CompareTable
          headers={["Feature", "What it does", "Trade-off"]}
          rows={[
            ["RDB snapshot", "Periodically saves the dataset", "Fast restart, but changes since last snapshot can be lost"],
            ["AOF", "Appends each write command", "Better durability window, more disk I/O"],
            ["Replica", "Copies a primary for reads or failover", "Async lag can lose recent writes on promotion"],
            ["Cluster", "Shards keyspace across primaries", "Multi-key operations need keys in the same hash slot"],
          ]}
        />
        <P>
          Redis Cluster splits keys across hash slots. This increases total
          memory and throughput, but it changes how you design keys. Operations
          involving multiple keys are easiest when those keys live in the same
          slot, often by using a hash tag such as <code>{"cart:{user42}:items"}</code>
          and <code>{"cart:{user42}:meta"}</code>.
        </P>
        <Callout type="warning" title="Persistence does not make every Redis use safe">
          AOF and RDB improve recovery, but they do not automatically give you
          relational constraints, durable cross-key transactions, or immunity
          from split-brain failover. For money, inventory ownership, and legal
          records, write the final truth to the authoritative database.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and real-world failure modes">
        <UL>
          <LI>
            <Term>Cache stampede:</Term> when a hot key expires, many requests may
            rebuild it at once. Use single-flight, request coalescing, stale-while-
            revalidate, and jittered TTLs.
          </LI>
          <LI>
            <Term>Eviction surprises:</Term> if memory fills, Redis may evict keys
            according to policy. Do not store non-rebuildable facts in a cache
            database with eviction enabled.
          </LI>
          <LI>
            <Term>Big keys:</Term> a huge list, hash, or string can block the event
            loop during serialization, deletion, or transfer. Prefer bounded keys
            and incremental deletion where possible.
          </LI>
          <LI>
            <Term>TTL semantics:</Term> expired keys disappear eventually, not as a
            real-time scheduler guarantee. Use streams or a database job for
            must-run workflows.
          </LI>
          <LI>
            <Term>Failover windows:</Term> primary-replica replication is commonly
            asynchronous, so a promoted replica may miss the last writes unless
            your design tolerates or reconciles them.
          </LI>
        </UL>
        <P>
          Real-world examples include caching product cards for an ecommerce
          homepage, using sorted sets for a gaming leaderboard, storing presence
          heartbeats for collaborative editing, and using short TTL keys to hold
          seats while checkout completes in the relational database.
        </P>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Redis is an in-memory, event-loop-driven store for hot data and atomic operations on rich data structures.",
          "Choose the right type: strings for cached values, hashes for objects, sets for membership, sorted sets for ranking, streams for logs, and probabilistic or bit structures for compact counting.",
          "Flagship patterns include cache-aside, rate limiting, leaderboards, presence, TTL seat holds, and distributed locks.",
          "RDB and AOF provide persistence options, while replicas and Cluster provide availability and scale with important consistency trade-offs.",
          "Keep the durable source of truth elsewhere unless you have intentionally designed Redis durability, failover, and reconciliation around the data.",
        ]}
      />

      <CheckYourself question="Why is a sorted set a better leaderboard primitive than a cached JSON array?">
        A sorted set stores each member with a score and supports atomic updates,
        rank queries, and top-N reads. A JSON array would require reading,
        modifying, sorting, and writing the whole structure for every score
        change.
      </CheckYourself>

      <CheckYourself question="How does a seat hold use Redis without making Redis the ticket ledger?">
        Redis stores a temporary key with <code>NX</code> and a TTL so only one user
        can hold the seat briefly and abandoned holds release automatically. The
        final purchase still verifies and records ownership in the authoritative
        database transaction.
      </CheckYourself>

      <CheckYourself question="What happens during a cold-cache stampede, and how do you reduce it?">
        Many requests miss the cache at the same time and all hit the database to
        rebuild the same value. Use single-flight rebuilds, jittered TTLs,
        stale-while-revalidate, and proactive warming for the hottest keys.
      </CheckYourself>
    </Prose>
  );
}
