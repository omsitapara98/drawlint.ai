import {
  Prose,
  LessonSection,
  H3,
  P,
  Term,
  XLink,
  UL,
  LI,
  Callout,
  Analogy,
  CompareTable,
  CodeBlock,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Redis</Term> and <Term>Memcached</Term> are in-memory data stores used
        to answer hot requests before they reach a slower database or service. A
        cache is not just a speed trick; it is a way to protect scarce backend
        capacity, absorb read spikes, and turn repeated expensive work into cheap
        lookups. The danger is that fast stale data can be worse than slow correct
        data.
      </P>

      <Analogy>
        If your database is a warehouse across town, a cache is the shelf behind the
        counter. Popular items stay within arm&apos;s reach. That shelf must be stocked,
        expired, and protected from one viral item taking all the space, but it keeps
        customers from waiting on a truck for every purchase.
      </Analogy>

      <LessonSection id="problem" title="The problem: hot reads and expensive recomputation">
        <P>
          Databases are excellent sources of truth, but many user requests ask the
          same question repeatedly: &quot;What is product 123?&quot;, &quot;Is this feature flag
          enabled?&quot;, or &quot;What are the top posts?&quot; Without caching, every repeated
          request consumes database CPU, locks, network round trips, and query
          planner work.
        </P>
        <CodeBlock label="cache-aside shape">{`request -> app -> cache GET product:123
                 ├─ hit: return cached JSON in ~sub-ms
                 └─ miss: query database, compute response, SET cache with TTL`}</CodeBlock>
        <UL>
          <LI>
            <Term>Latency:</Term> memory lookups are usually far faster than disk or
            complex database queries.
          </LI>
          <LI>
            <Term>Capacity:</Term> repeated reads hit the cache, leaving database
            capacity for writes and uncached queries.
          </LI>
          <LI>
            <Term>Failure isolation:</Term> a warm cache can keep read-only parts of
            a site alive during partial database trouble.
          </LI>
        </UL>
        <Callout type="warning" title="The cache is a copy">
          A cache creates a second place where data can exist. Every design must
          answer: who updates it, when does it expire, what happens when it is wrong,
          and can the source of truth rebuild it from scratch?
        </Callout>
      </LessonSection>

      <LessonSection id="redis-vs-memcached" title="Redis vs Memcached">
        <P>
          Memcached is a small, fast, distributed string cache. Redis is a richer
          data-structure server that can also act as a cache, lightweight queue,
          counter store, rate limiter, pub/sub broker, and coordination primitive.
        </P>
        <CompareTable
          headers={["Dimension", "Memcached", "Redis"]}
          rows={[
            ["Core model", "Key -> bytes/string", "Key -> strings, hashes, lists, sets, sorted sets, streams, bitmaps"],
            ["Best use", "Simple ephemeral cache at very high throughput", "Cache plus richer atomic data operations"],
            ["Persistence", "None; restart means cold cache", "Optional RDB snapshots and AOF logs"],
            ["Replication / HA", "Usually client-side sharding; no built-in failover", "Replicas, Sentinel, Cluster, managed HA"],
            ["Memory behavior", "Slab allocator, simple eviction", "Configurable eviction policies and per-key TTLs"],
            ["Operational complexity", "Low", "Higher because Redis can become critical state"],
          ]}
        />
        <Callout type="tip" title="Rule of thumb">
          Use Memcached when you truly need a disposable key-value cache and want
          minimal features. Use Redis when you need atomic counters, sorted sets,
          distributed locks, streams, replication, or persistence. Most modern
          system designs choose Redis because those features appear quickly.
        </Callout>
      </LessonSection>

      <LessonSection id="redis-structures" title="Redis data structures and real use cases">
        <P>
          Redis is popular because operations run close to the data and are atomic on
          a single instance or shard. Instead of fetching a blob, changing it in app
          code, and writing it back, you ask Redis to perform a data-structure
          operation directly.
        </P>
        <CompareTable
          headers={["Structure", "Commands", "Use cases"]}
          rows={[
            ["String", "GET, SET, INCR", "Cached HTML/JSON, counters, rate-limit tokens"],
            ["Hash", "HGET, HSET", "Object fields such as user session attributes"],
            ["List", "LPUSH, BRPOP", "Simple work queues, recent activity lists"],
            ["Set", "SADD, SISMEMBER", "Membership checks, unique viewers, feature cohorts"],
            ["Sorted set", "ZADD, ZRANGE", "Leaderboards, priority queues, expiring holds"],
            ["Stream", "XADD, XREADGROUP", "Durable-ish event streams and consumer groups"],
          ]}
        />
        <CodeBlock label="leaderboard with a sorted set">{`ZADD leaderboard 8700 user:42
ZADD leaderboard 9100 user:99
ZREVRANGE leaderboard 0 9 WITHSCORES

# Redis maintains score order, so top-N does not require scanning every player.`}</CodeBlock>
        <H3>Atomic operations matter</H3>
        <P>
          <code>INCR</code> lets many clients update a counter without lost updates.
          Sorted sets keep rankings ordered while scores change. Lua scripts or
          transactions can combine a few operations when a rate limiter or seat hold
          must be checked and updated as one unit.
        </P>
      </LessonSection>

      <LessonSection id="persistence-ha" title="Persistence, replication, Sentinel, and Cluster">
        <P>
          A pure cache can disappear and be rebuilt. Redis often holds state that is
          expensive or temporarily important, so teams enable persistence and high
          availability. Be clear whether Redis is disposable cache or semi-durable
          operational state.
        </P>
        <CompareTable
          headers={["Feature", "How it works", "Trade-off"]}
          rows={[
            ["RDB snapshots", "Periodic point-in-time dump to disk", "Compact and fast to restart, but can lose changes since last snapshot"],
            ["AOF", "Append every write command to a log", "Better durability, more disk I/O and rewrite management"],
            ["Replication", "Replica copies primary asynchronously", "Read scale and failover target, but replicas can lag"],
            ["Sentinel", "Monitors primary and promotes replica", "HA for non-cluster Redis; clients must follow new primary"],
            ["Cluster", "Shards keyspace across masters with replicas", "Scales memory/write load, but multi-key operations need same hash slot"],
          ]}
        />
        <Callout type="warning" title="Redis persistence is not the same as a database guarantee">
          Redis can be durable enough for many workflows, but configuration matters.
          AOF fsync policy, replica lag, failover timing, and disk corruption all
          affect loss windows. For money or irreplaceable records, keep a stronger
          source of truth.
        </Callout>
      </LessonSection>

      <LessonSection id="write-strategies" title="Write strategies: cache-aside, write-through, write-back">
        <P>
          The write strategy defines how the cache and source of truth stay aligned.
          Most bugs come from forgetting that an update must either invalidate or
          refresh every cached representation affected by the change.
        </P>
        <CompareTable
          headers={["Strategy", "Read path", "Write path", "Best for", "Risk"]}
          rows={[
            ["Cache-aside", "App reads cache; on miss reads DB and fills cache", "Write DB, then delete or update cache", "Default web-app pattern", "Stale data if invalidation is missed"],
            ["Write-through", "Cache should already contain fresh value", "Write cache and DB together", "Small objects needing fresh reads", "Higher write latency and coupling"],
            ["Write-back", "Reads cache", "Write cache first, flush DB later", "Very high write bursts where loss is acceptable", "Data loss if cache dies before flush"],
            ["Refresh-ahead", "Cache refreshes before expiry", "Background job recomputes hot keys", "Expensive but predictable data", "Wasted work for keys that cool down"],
          ]}
        />
        <CodeBlock label="cache-aside with invalidation">{`def get_product(id):
    key = f"product:{id}"
    cached = redis.get(key)
    if cached:
        return decode(cached)

    product = db.query("SELECT * FROM products WHERE id = ?", id)
    redis.set(key, encode(product), ex=300)  # 5 minute TTL
    return product

def update_product(id, patch):
    db.update_product(id, patch)             # source of truth first
    redis.delete(f"product:{id}")            # force next read to refill`}</CodeBlock>
        <Callout type="tip" title="Delete is often safer than update">
          Updating one cache key sounds efficient, but products may appear in many
          cached views: detail page, search result, category page, and recommendation
          cards. Deleting affected keys and letting reads refill avoids partial
          refresh logic, as long as misses are protected from stampedes.
        </Callout>
      </LessonSection>

      <LessonSection id="eviction-hotkeys" title="Eviction policies, stampedes, and hot keys">
        <P>
          Cache memory is finite. When Redis or Memcached is full, it must evict
          something or reject writes. Good cache design treats eviction as normal,
          not exceptional: the database must still answer correctly when the cache is
          empty.
        </P>
        <UL>
          <LI>
            <Term>TTL:</Term> each key expires after a configured time. Add jitter so
            thousands of keys do not expire at the same second.
          </LI>
          <LI>
            <Term>LRU / LFU:</Term> evict least-recently-used or least-frequently-used
            keys when memory is full.
          </LI>
          <LI>
            <Term>noeviction:</Term> reject new writes instead of evicting. Useful
            when keys are not safely disposable.
          </LI>
        </UL>
        <CodeBlock label="avoiding a cache stampede">{`val = redis.get(key)
if val is not None:
    return val

# only one request should rebuild the hot key
if redis.set("lock:" + key, "1", nx=True, ex=10):
    val = recompute_from_db()
    redis.set(key, val, ex=300 + random_jitter())
    redis.delete("lock:" + key)
    return val

sleep_briefly()
return redis.get(key) or fallback_response()`}</CodeBlock>
        <Callout type="warning" title="Hot-key problem">
          If one key receives a huge share of traffic, sharding the cache may not
          help because all requests still route to the node holding that key. Use
          local in-process caching, request coalescing, key replication, CDN caching,
          or split the value into buckets when a single Redis node becomes hot.
        </Callout>
      </LessonSection>

      <LessonSection id="related" title="How this fits with broader caching patterns">
        <P>
          Redis and Memcached are implementation tools. The system design ideas are
          covered more generally in <XLink href="/learn/caching-basics">caching basics</XLink>
          and in the Redis architecture pattern at <XLink href="/learn/pattern-redis">Redis</XLink>.
          Always decide which layer owns the cache: browser, CDN, application memory,
          distributed cache, or database buffer cache.
        </P>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Memcached is a simple disposable string cache; Redis is a richer data-structure server with persistence, replication, and clustering options.",
          "Redis structures such as hashes, sets, sorted sets, counters, and streams let you model rate limits, leaderboards, presence, queues, and seat holds atomically.",
          "RDB snapshots and AOF logs improve Redis recovery, but configuration determines the real data-loss window.",
          "Cache-aside is the default write strategy; every write must refresh or invalidate affected keys, and the database must remain the source of truth unless explicitly designed otherwise.",
          "Eviction, stampedes, and hot keys are normal production problems; use TTL jitter, single-flight, replication, local caches, and careful eviction policies.",
        ]}
      />

      <CheckYourself question="When would you choose Memcached instead of Redis?">
        Choose Memcached for a purely disposable key-value cache when you only need
        simple string/blob lookups, minimal operational surface, and very high cache
        throughput. If you need counters, sorted sets, persistence, replication, or
        richer atomic operations, Redis is usually the better fit.
      </CheckYourself>

      <CheckYourself question="Why can a cache stampede take down a database?">
        If a hot key expires, many requests miss at the same time and all recompute
        from the database. The database sees a sudden burst it was never sized for.
        Single-flight locks, TTL jitter, stale-while-revalidate, and refresh-ahead
        reduce the burst.
      </CheckYourself>

      <CheckYourself question="What is the risk of write-back caching?">
        The application writes to the cache first and persists to the database later.
        That makes writes fast, but a cache crash before flushing can lose accepted
        user changes. Use it only when the loss window is acceptable or backed by a
        durable log.
      </CheckYourself>
    </Prose>
  );
}
