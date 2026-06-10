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
        A <Term>cache</Term> is a small, fast store that keeps copies of data or
        computation results so the system can avoid repeating expensive work.
        Caching is one of the highest-leverage tools in system design: it cuts
        latency, reduces database load, and absorbs traffic spikes. It also
        creates hard correctness questions because cached data can become stale.
      </P>

      <Analogy>
        A cache is the snack bowl on your desk. The pantry is larger and more
        authoritative, but walking there for every handful is slow. You keep the
        snacks you reach for most often close by, refill the bowl when it is
        empty, and throw snacks away when they go stale.
      </Analogy>

      <LessonSection id="why" title="The problem caching solves">
        <P>
          Real traffic is rarely uniform. A small set of hot objects receives a
          large fraction of reads: the home feed, a trending video, a celebrity
          profile, a product page during a sale, or the same configuration record
          every request needs. Without caching, every read repeats the slow path.
        </P>
        <CodeBlock label="without a cache">{`every request
  -> app server
  -> database query or expensive computation
  -> response

if one hot key receives 50,000 requests/second:
  the database sees 50,000 reads/second for the same answer`}</CodeBlock>
        <P>
          The failure mode is not only latency. Repeated reads can exhaust DB CPU,
          connection pools, disk I/O, or downstream API quotas. Once the source of
          truth is overloaded, even uncached writes and admin operations can slow
          down.
        </P>
        <Callout type="key" title="A cache is not the source of truth">
          Design the system so it remains correct when the cache is empty,
          expired, or restarted. The database or durable store must still be able
          to answer authoritatively, even if more slowly.
        </Callout>
      </LessonSection>

      <LessonSection id="where" title="Where caches live">
        <P>
          Caches appear at many layers. Each layer avoids a different amount of
          work, and each layer has a different owner and invalidation strategy.
        </P>
        <CompareTable
          headers={["Location", "What it stores", "What it saves", "Common gotcha"]}
          rows={[
            ["Browser", "HTML, CSS, JS, images, API responses", "Network round trips", "Hard refresh and versioning behavior"],
            ["CDN edge", "Static assets, public pages, media", "Origin bandwidth and global latency", "Purging and private-data leaks"],
            ["Application cache", "Hot objects, query results, sessions, rate limits", "Database and computation work", "Stale values and stampedes"],
            ["Database cache", "Recently read pages and indexes", "Disk reads inside the DB", "Limited direct control from the app"],
          ]}
        />
        <P>
          A full system often uses several layers at once. A product image might
          be cached in the browser, at the CDN, and in object-storage edge caches.
          A user profile might be cached in Redis, while the database also caches
          the index pages used to find it.
        </P>
      </LessonSection>

      <LessonSection id="hit-ratio" title="Hit ratio dominates performance">
        <P>
          <Term>Cache hit ratio</Term> is the percentage of requests answered by
          the cache. It matters because the average latency is a weighted blend of
          the fast cache path and the slow miss path. A small hit-ratio change can
          dominate system behavior.
        </P>
        <CodeBlock label="average latency from hit ratio">{`cache latency = 2 ms
database latency = 80 ms
hit ratio = 95%

average = 0.95 * 2ms + 0.05 * 80ms
        = 1.9ms + 4ms
        = 5.9ms

if hit ratio drops to 80%:
average = 0.80 * 2ms + 0.20 * 80ms = 17.6ms`}</CodeBlock>
        <UL>
          <LI>
            <Term>Hot-set size:</Term> if the cache is too small to hold the data
            users repeatedly request, hit ratio collapses.
          </LI>
          <LI>
            <Term>Key design:</Term> overly specific keys such as including a
            timestamp or random token can prevent reuse.
          </LI>
          <LI>
            <Term>TTL choice:</Term> very short TTLs may create constant misses;
            very long TTLs can make stale data unacceptable.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="cache-aside" title="Cache-aside read path">
        <P>
          The most common application pattern is <Term>cache-aside</Term>. The app
          checks the cache first. On a miss, it reads the source of truth,
          populates the cache, and returns the value. The application owns the
          policy.
        </P>
        <CodeBlock label="cache-aside read path">{`def get_user(user_id):
    key = f"user:{user_id}"

    value = cache.get(key)
    if value is not None:
        return value              # cache hit

    value = db.query_user(user_id) # cache miss
    cache.set(key, value, ttl=300)
    return value`}</CodeBlock>
        <H3>Why cache-aside is popular</H3>
        <UL>
          <LI>
            <Term>Lazy population:</Term> only data that is actually requested is
            cached.
          </LI>
          <LI>
            <Term>Simple recovery:</Term> if Redis restarts, misses refill the
            cache naturally from the database.
          </LI>
          <LI>
            <Term>Application control:</Term> the app chooses keys, TTLs,
            serialization, and when to invalidate.
          </LI>
        </UL>
        <Callout type="info" title="Related lesson">
          This lesson introduces the core vocabulary. For larger designs, see
          <XLink href="/learn/caching-systems">Caching Systems</XLink> for
          multi-layer caches, consistency, and operational patterns.
        </Callout>
      </LessonSection>

      <LessonSection id="eviction" title="Eviction: deciding what leaves the cache">
        <P>
          Caches are intentionally smaller than the source of truth. When the
          cache is full, it needs an eviction policy: a rule for deciding which
          entry to remove.
        </P>
        <CompareTable
          headers={["Policy", "Meaning", "Best fit", "Gotcha"]}
          rows={[
            ["TTL", "Expire after a fixed time", "Bounding staleness and simple freshness", "Many keys can expire together"],
            ["LRU", "Evict least recently used", "Workloads where recent use predicts reuse", "One-time scans can evict useful entries"],
            ["LFU", "Evict least frequently used", "Stable popularity patterns", "Can keep formerly popular items too long"],
            ["Size-aware", "Prefer evicting large or costly entries", "Mixed object sizes", "Requires accurate sizing"],
          ]}
        />
        <P>
          Real systems often combine policies: TTL to bound staleness and LRU or
          LFU to manage memory. For example, Redis can evict old keys when memory
          is full while each key also has its own expiration time.
        </P>
      </LessonSection>

      <LessonSection id="writes" title="Write strategies and invalidation">
        <P>
          Reads are only half of caching. The hard part is what happens after a
          write. You must decide whether to update the cache, delete the cache
          entry, or let it expire naturally.
        </P>
        <CompareTable
          headers={["Strategy", "Write path", "Benefit", "Risk"]}
          rows={[
            ["Write-through", "Write cache and database synchronously", "Reads immediately see the new value", "Writes are slower and both systems must succeed"],
            ["Write-back", "Write cache first, flush to DB later", "Very fast writes", "Data loss if the cache fails before flush"],
            ["Write-around", "Write DB only; cache fills on next read", "Avoids caching data that may never be read", "First read after write is a miss"],
            ["Invalidate-on-write", "Write DB, then delete cache key", "Simple with cache-aside", "Race conditions can repopulate stale values"],
          ]}
        />
        <CodeBlock label="invalidate after a database write">{`def update_user(user_id, patch):
    db.update_user(user_id, patch)
    cache.delete(f"user:{user_id}")

# next read misses cache, reads fresh DB row, and fills cache again`}</CodeBlock>
        <Callout type="warning" title="Invalidation is where correctness bugs live">
          If you update the database but forget to invalidate the cache, users can
          see old data until TTL expiry. If you invalidate before the database
          commit, another request may refill the cache with the old row. Order,
          retries, and idempotency matter.
        </Callout>
      </LessonSection>

      <LessonSection id="stampede" title="Thundering herd and cache stampede">
        <P>
          A <Term>cache stampede</Term> happens when many requests miss the same
          hot key at the same time. A common cause is synchronized expiration: a
          popular key reaches its TTL, thousands of requests miss together, and
          they all rebuild the value by hammering the database.
        </P>
        <CodeBlock label="stampede failure mode">{`12:00:00 key product:123 expires
12:00:01 10,000 requests miss Redis
12:00:01 all 10,000 query the database
12:00:02 database CPU spikes, latency rises, retries begin
12:00:03 the outage amplifies itself`}</CodeBlock>
        <UL>
          <LI>
            <Term>Single-flight:</Term> allow one request to rebuild the value
            while others wait for the result.
          </LI>
          <LI>
            <Term>Jittered TTLs:</Term> add randomness so many hot keys do not
            expire at the same instant.
          </LI>
          <LI>
            <Term>Stale-while-revalidate:</Term> serve a slightly stale value
            while a background refresh computes the new one.
          </LI>
          <LI>
            <Term>Pre-warming:</Term> refresh known hot keys before launch events,
            sales, or traffic spikes.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and real-world examples">
        <UL>
          <LI>
            <Term>Negative caching:</Term> cache &quot;not found&quot; briefly for
            missing objects so repeated bad IDs do not hit the database.
          </LI>
          <LI>
            <Term>Personalization:</Term> do not put private user data behind a
            public CDN key. Include the right vary headers or avoid shared caches.
          </LI>
          <LI>
            <Term>Large objects:</Term> one huge item can evict many useful small
            items. Track memory, not just key count.
          </LI>
          <LI>
            <Term>Hot keys:</Term> a single celebrity profile or flash-sale SKU
            can overload one cache shard even with a high overall hit ratio.
          </LI>
          <LI>
            <Term>Real examples:</Term> browsers cache bundles, CDNs cache images
            and video segments, Redis caches sessions and feeds, and databases
            cache index pages in memory.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Caching stores hot data close to the caller so repeated reads avoid slow databases, APIs, or computations.",
          "Hit ratio dominates average latency and backend load; small drops in hit ratio can create large system-wide effects.",
          "Caches live at many layers: browser, CDN, application cache, and database buffer cache.",
          "Eviction policies such as TTL, LRU, and LFU decide what leaves when space or freshness runs out.",
          "Invalidation and stampede control are the hard parts: use safe write ordering, single-flight, jittered TTLs, and stale-while-revalidate when needed.",
        ]}
      />

      <CheckYourself question="Why can a 95 percent hit ratio be dramatically better than an 80 percent hit ratio?">
        The miss path is usually much slower and more expensive than the hit path.
        If misses go to an 80 ms database and hits take 2 ms, moving from 95% hits
        to 80% hits quadruples the amount of database work and can nearly triple
        average latency.
      </CheckYourself>

      <CheckYourself question="In cache-aside, what happens when Redis is empty after a restart?">
        The application experiences misses, reads the database, and repopulates
        Redis lazily. The system should remain correct because the database is
        the source of truth; it is just slower until the hot set warms back up.
      </CheckYourself>

      <CheckYourself question="How do you reduce a cache stampede on one hot key?">
        Use single-flight so only one request rebuilds the value, add TTL jitter,
        serve stale data while refreshing in the background, or proactively warm
        hot keys before expected spikes.
      </CheckYourself>
    </Prose>
  );
}