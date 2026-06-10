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
        A <Term>hot key</Term> or <Term>hot partition</Term> is a single logical
        item that receives far more traffic than the rest of the dataset: a viral
        tweet, a flash-sale product, a celebrity profile, a live scoreboard, or a
        single counter everyone increments. The cluster may have plenty of total
        capacity, but the one shard that owns that key melts.
      </P>

      <Analogy>
        Picture a stadium with 100 concession stands, but everyone wants the same
        limited-edition jersey from one stand. The stadium is not out of workers;
        demand is concentrated in the wrong place. You fix it by putting that
        jersey at many stands, letting cashiers share one restock request, and
        keeping small piles near the entrances.
      </Analogy>

      <LessonSection id="failure-mode" title="The failure mode: skew beats average capacity">
        <P>
          Distributed systems are often sized by average load: total requests per
          second divided by number of nodes. Hot keys break that math. If one key
          receives 40 percent of all traffic and the hash function assigns it to
          one shard, that shard becomes the bottleneck while neighbors sit idle.
        </P>
        <CodeBlock label="a balanced hash still has one owner for a hot key">{`// 100 shards, uniform hash, one viral object.
owner = hash("tweet:9001") % 100

// Every request for the viral object hits the same owner.
GET tweet:9001  → shard-17
GET tweet:9001  → shard-17
GET tweet:9001  → shard-17

// The hash is working correctly; popularity is the problem.`}</CodeBlock>
        <CompareTable
          headers={["Symptom", "What it suggests", "Typical metric"]}
          rows={[
            [
              "One shard has high CPU while others are quiet",
              "Hot partition or uneven key popularity",
              "Per-shard CPU, QPS, p99 latency",
            ],
            [
              "Cache expires and database spikes immediately",
              "Thundering herd on one hot key",
              "Backend calls per cache miss window",
            ],
            [
              "One counter or inventory row has lock waits",
              "Write hot spot",
              "Row lock time, conditional write failures",
            ],
          ]}
        />
        <Callout type="key" title="First detect, then spread or collapse">
          Hot-key work has two halves: detect the skew precisely, then either
          spread requests across copies or collapse duplicate work into one
          backend operation.
        </Callout>
      </LessonSection>

      <LessonSection id="detection" title="Detecting hot keys before they page you">
        <P>
          Detection needs per-key and per-partition visibility. Aggregate service
          QPS can look fine while one key is destroying tail latency. Track top
          keys, top partitions, cache miss bursts, lock contention, and request
          fan-in at each layer.
        </P>
        <UL>
          <LI>
            <Term>Top-K key sampling:</Term> log or sketch the hottest keys with
            approximate algorithms such as count-min sketch so observability does
            not become its own bottleneck.
          </LI>
          <LI>
            <Term>Per-shard dashboards:</Term> graph QPS, CPU, memory, queue
            depth, p95/p99 latency, and error rate by shard or partition.
          </LI>
          <LI>
            <Term>Cache telemetry:</Term> alert on sudden miss storms for a
            single key, not only on overall hit ratio.
          </LI>
          <LI>
            <Term>Write contention:</Term> watch conditional-write retries, row
            lock waits, and optimistic concurrency failures for counters,
            inventory, and balances.
          </LI>
        </UL>
        <Callout type="tip" title="Power-law traffic is normal">
          Many consumer systems have a power-law distribution: a tiny fraction of
          keys receives a huge fraction of traffic. Design assuming skew will
          happen, not as an exception.
        </Callout>
      </LessonSection>

      <LessonSection id="read-mitigations" title="Mitigating hot reads: copies, caches, and CDN">
        <P>
          Read-heavy hot keys are usually handled by creating more places that can
          answer the same request. The exact layer depends on freshness and
          audience: in-process cache for milliseconds, Redis replicas for shared
          cache, database read replicas for source-of-truth reads, or CDN edges
          for public static bytes.
        </P>
        <CodeBlock label="replicate one hot key into N cache copies">{`// Instead of one cache key:
GET profile:celeb42

// Store N equivalent copies:
profile:celeb42:copy:0
profile:celeb42:copy:1
profile:celeb42:copy:2
profile:celeb42:copy:3

// Spread reads deterministically or randomly.
copy = hash(requestId or userId) % 4
GET profile:celeb42:copy:{copy}`}</CodeBlock>
        <CompareTable
          headers={["Technique", "Best for", "Trade-off"]}
          rows={[
            [
              "Replicate hot key to N copies",
              "Very high read QPS for one logical item",
              "Copies can be briefly stale after updates",
            ],
            [
              "Local in-process cache",
              "Tiny TTL reads on every app server",
              "Invalidation is approximate; memory per process",
            ],
            [
              "Client-side cache",
              "Mobile/web clients repeatedly showing same data",
              "Must respect privacy, TTL, and logout behavior",
            ],
            [
              "CDN",
              "Public hot images, videos, JS, downloads",
              "Only works for cacheable HTTP responses",
            ],
          ]}
        />
        <P>
          Public viral content should often move all the way to the CDN. A viral
          image or video thumbnail should not hit Redis on every view; the edge
          should serve it. For data that stays inside the application,{" "}
          <XLink href="/learn/pattern-redis">Redis</XLink> is a common shared
          cache layer, but the hot-key principle applies to any cache or store.
        </P>
      </LessonSection>

      <LessonSection id="single-flight" title="Request coalescing: single-flight">
        <P>
          Caches fail hardest when a hot key expires. Thousands of requests miss
          at the same moment and all try to rebuild the value from the database.
          <Term>Single-flight</Term> elects one request to do the rebuild while
          the others wait for the same promise or future.
        </P>
        <CodeBlock label="single-flight cache miss coalescing">{`inflight = Map()  // key -> promise

async function getWithSingleFlight(key):
  cached = cache.get(key)
  if cached is not null:
    return cached

  if inflight.has(key):
    return await inflight.get(key)

  promise = (async () => {
    try:
      value = await database.load(key)
      cache.set(key, value, ttlWithJitter())
      return value
    finally:
      inflight.delete(key)
  })()

  inflight.set(key, promise)
  return await promise`}</CodeBlock>
        <H3>Make the herd smaller before it starts</H3>
        <UL>
          <LI>
            <Term>TTL jitter:</Term> add randomness so many hot keys do not expire
            in the same second.
          </LI>
          <LI>
            <Term>Stale-while-revalidate:</Term> serve a slightly stale value
            while one background refresh updates the cache.
          </LI>
          <LI>
            <Term>Negative caching:</Term> cache misses for missing objects briefly
            so attackers or bugs cannot hammer the database with absent keys.
          </LI>
        </UL>
        <Callout type="warning" title="Single-flight scope matters">
          In-process single-flight collapses work only inside one app instance.
          If you run 200 instances, you may still get 200 backend calls. For very
          hot keys, combine local single-flight with a distributed lock, Redis
          lease, or stale-while-revalidate strategy.
        </Callout>
      </LessonSection>

      <LessonSection id="write-mitigations" title="Mitigating hot writes: sharded counters and key suffixing">
        <P>
          Writes are harder than reads because copies must converge. Counters,
          likes, view counts, inventory reservations, and rate limits can all hot
          spot on one row or key. The usual trick is to split one logical write
          target into many physical buckets and aggregate later.
        </P>
        <CodeBlock label="sharded counter with key suffixing">{`// Logical counter: likes:post:9001
// Physical counters:
likes:post:9001:shard:0
likes:post:9001:shard:1
...
likes:post:9001:shard:63

function incrementLike(postId, userId):
  shard = hash(userId) % 64
  INCR likes:post:{postId}:shard:{shard}

function readLikeCount(postId):
  total = 0
  for shard in 0..63:
    total += GET likes:post:{postId}:shard:{shard}
  return total`}</CodeBlock>
        <CompareTable
          headers={["Hot write", "Mitigation", "Gotcha"]}
          rows={[
            [
              "Like or view counter",
              "Shard the counter and sum shards",
              "Reads are approximate or require aggregation",
            ],
            [
              "Flash-sale inventory",
              "Partition reservations into buckets with a final reconciliation step",
              "Must avoid oversell with careful leases or escrow",
            ],
            [
              "Rate-limit key",
              "Shard by user or request bucket, then combine",
              "Enforcement may become approximate",
            ],
          ]}
        />
        <P>
          Key suffixing is a form of manual{" "}
          <XLink href="/learn/sharding-partitioning">sharding and partitioning</XLink>.
          It spreads one logical hot spot across many physical keys. The price is
          more complex reads, aggregation, and sometimes approximate answers.
        </P>
      </LessonSection>

      <LessonSection id="examples-gotchas" title="Examples and design gotchas">
        <UL>
          <LI>
            <Term>Viral tweet:</Term> cache the hydrated tweet locally, replicate
            the shared cache key, serve media from CDN, and use sharded counters
            for likes and views.
          </LI>
          <LI>
            <Term>Flash sale:</Term> product page reads should be CDN or cache
            served, while purchase writes need inventory buckets, queues, or
            reservation tokens to avoid one database row becoming a lock hotspot.
          </LI>
          <LI>
            <Term>Celebrity profile:</Term> replicate read models and avoid
            rebuilding the profile from many services on every request.
          </LI>
          <LI>
            <Term>Correctness boundaries:</Term> stale replicas are fine for view
            counts and profile bios, but not for account balances or final
            inventory decrements.
          </LI>
          <LI>
            <Term>Automatic splitting is not magic:</Term> some databases split
            hot partitions, but a single logical key may still be serialized by
            locks, quorum writes, or leader ownership.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A hot key concentrates traffic on one logical item or partition, so average cluster capacity becomes misleading.",
          "Detect hot keys with top-key sampling, per-shard metrics, cache-miss telemetry, and write-contention signals.",
          "Hot reads can be spread with replicated cache keys, local caches, client caches, read replicas, and CDN edges.",
          "Single-flight collapses many simultaneous cache misses into one backend load; pair it with TTL jitter and stale-while-revalidate.",
          "Hot writes often need sharded counters or key suffixing, trading simple reads for distributed write capacity.",
        ]}
      />

      <CheckYourself question="Why can a cluster be mostly idle while one hot key is failing?">
        Hashing assigns a single logical key to one owner. If that key receives a
        huge fraction of traffic, the owner shard saturates even though other
        shards have spare capacity. The bottleneck is skew, not total cluster
        size.
      </CheckYourself>

      <CheckYourself question="What does single-flight do during a hot cache miss?">
        It lets one request rebuild the missing value while concurrent requests
        wait for that same result. That turns thousands of identical database
        calls into one call, then all waiters receive the refreshed value.
      </CheckYourself>

      <CheckYourself question="Why shard a counter with suffixes?">
        A single counter key serializes all increments on one partition. Suffixing
        splits increments across many physical keys, increasing write throughput.
        Reads then sum the shards or use an asynchronously aggregated total.
      </CheckYourself>
    </Prose>
  );
}
