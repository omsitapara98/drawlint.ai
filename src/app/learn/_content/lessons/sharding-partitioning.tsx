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
        Replication copies the <em>whole</em> dataset to more machines.
        <Term>Sharding</Term>, also called <Term>horizontal partitioning</Term>,
        does the opposite: it splits one logical dataset into pieces and stores each
        piece on a different machine. You reach for it when one database can no
        longer hold the data or absorb the write traffic.
      </P>

      <Analogy>
        Imagine a national phone book. Printing ten identical copies helps ten
        people read at once, but each copy is still enormous. Sharding is printing
        separate volumes: A through H, I through P, and Q through Z. To find
        &quot;Sharma&quot;, you know which volume to open. The letter range is the shard
        key rule.
      </Analogy>

      <LessonSection id="why" title="The problem: one primary cannot grow forever">
        <P>
          Before sharding, squeeze the simple levers: indexes, query tuning, bigger
          machines, caching, and read replicas. Sharding is powerful, but it moves
          complexity from the database engine into your application, operations, and
          data model.
        </P>
        <UL>
          <LI>
            <Term>Storage limit:</Term> the table, indexes, or backups no longer fit
            comfortably on one machine.
          </LI>
          <LI>
            <Term>Write throughput limit:</Term> replication helps reads, but every
            write still hits one primary.
          </LI>
          <LI>
            <Term>Maintenance limit:</Term> vacuuming, compaction, migrations, and
            restores become too slow on a single giant dataset.
          </LI>
          <LI>
            <Term>Blast radius:</Term> a shard failure can affect a fraction of users
            instead of the entire product, if the system is designed that way.
          </LI>
        </UL>
        <CodeBlock label="horizontal partitioning by user id">{`logical table: users

shard 0: users where hash(user_id) mod 4 = 0
shard 1: users where hash(user_id) mod 4 = 1
shard 2: users where hash(user_id) mod 4 = 2
shard 3: users where hash(user_id) mod 4 = 3

app router decides which physical database receives each query`}</CodeBlock>
        <Callout type="key" title="Sharding changes the contract">
          After sharding, &quot;query the database&quot; becomes &quot;route to the right shard,
          maybe fan out, merge results, and handle partial failures&quot;. That is why
          teams shard late and deliberately.
        </Callout>
      </LessonSection>

      <LessonSection id="shard-key" title="Choosing a shard key">
        <P>
          The <Term>shard key</Term> decides where each record lives. It is the most
          important decision because changing it later means moving lots of data and
          rewriting query paths. A good key has high cardinality, spreads traffic
          evenly, and keeps data that is read together on the same shard.
        </P>
        <CompareTable
          headers={["Candidate key", "Distribution", "Locality", "Problem"]}
          rows={[
            ["user_id", "Usually high and even", "Good for per-user data", "Celebrity users can still become hot"],
            ["country", "Low cardinality and uneven", "Good for regional rules", "One country can dominate a shard"],
            ["created_at", "Easy for time windows", "Good for recent scans", "All new writes hit the latest shard"],
            ["conversation_id", "Good if many conversations", "Keeps chat messages together", "Huge group chats can become hot"],
          ]}
        />
        <H3>Design from the common query</H3>
        <P>
          If the main query is &quot;load all messages in this conversation&quot;, shard
          by <code>conversation_id</code>, not by random <code>message_id</code>.
          If the main query is &quot;load a user profile and settings&quot;, shard by
          <code>user_id</code>. The best key turns the hot path into a single-shard
          request.
        </P>
        <CodeBlock label="routing with a shard key">{`function shardForUser(userId) {
  const bucket = hash(userId) % 1024;        // many logical buckets
  return shardMap[bucket];                  // bucket -> physical shard
}

SELECT * FROM orders WHERE user_id = $1;    // route only to that user's shard`}</CodeBlock>
        <Callout type="warning" title="The worst key is the one missing from queries">
          If most queries do not include the shard key, the system must ask every
          shard and merge the answers. Fan-out queries are slower, costlier, and
          harder to make reliable because one slow shard slows the whole response.
        </Callout>
      </LessonSection>

      <LessonSection id="strategies" title="Range, hash, and directory partitioning">
        <P>
          A partitioning strategy maps a key to a shard. The strategy determines
          whether range scans are easy, whether load is balanced, and how painful it
          is to add capacity.
        </P>
        <CompareTable
          headers={["Strategy", "How it routes", "Strength", "Weakness"]}
          rows={[
            [
              "Range",
              "Key ranges such as A-H, I-P, Q-Z or timestamps by month",
              "Efficient range scans and easy human reasoning",
              "Hot ranges form when traffic clusters at one end",
            ],
            [
              "Hash",
              "Hash(key) maps records evenly across buckets",
              "Excellent distribution for point lookups",
              "Range queries scatter across shards",
            ],
            [
              "Directory",
              "Lookup table maps each tenant/key/bucket to a shard",
              "Flexible moves, custom placement, tenant isolation",
              "Directory becomes critical metadata and must be highly available",
            ],
          ]}
        />
        <H3>Range partitioning</H3>
        <P>
          Range partitioning is natural for time-series data and ordered keys. It
          shines when queries ask for contiguous ranges, such as logs from June. But
          if all writes go to &quot;today&quot;, the newest range becomes a hotspot.
        </P>
        <H3>Hash partitioning</H3>
        <P>
          Hashing destroys order to gain even spread. It is a strong default for
          point lookups by user, account, or object id. The cost is that a query such
          as &quot;all users created yesterday&quot; may touch every shard unless you maintain
          another index or table.
        </P>
        <H3>Directory partitioning</H3>
        <P>
          A directory lets you place tenants deliberately. Big customers can get
          dedicated shards, small customers can share, and individual buckets can be
          moved during rebalancing. The directory itself must be cached, replicated,
          and updated safely.
        </P>
        <Callout type="info" title="Related pattern">
          Simple modulo hashing remaps many keys when shard count changes.
          <XLink href="/learn/pattern-consistent-hashing"> Consistent hashing</XLink>
          reduces how much data moves when nodes join or leave.
        </Callout>
      </LessonSection>

      <LessonSection id="hotspots" title="Hotspots, celebrity keys, and skew">
        <P>
          Sharding assumes load is spread. Real products love to break that
          assumption. A celebrity account, viral post, hot product launch, or current
          timestamp can concentrate most traffic on one shard even when the overall
          cluster has plenty of capacity.
        </P>
        <UL>
          <LI>
            <Term>Hot partition:</Term> one shard receives disproportionate reads or
            writes and becomes the bottleneck.
          </LI>
          <LI>
            <Term>Celebrity key:</Term> one logical key is so popular that hashing
            cannot help because all its traffic maps to one place.
          </LI>
          <LI>
            <Term>Monotonic key:</Term> keys such as increasing ids or timestamps
            send new writes to the same range.
          </LI>
        </UL>
        <CodeBlock label="splitting a celebrity key">{`normal users:
  shard = hash(user_id)

celebrity timeline reads:
  shard = hash(user_id + ':' + bucket_id)
  // duplicate or bucket the hot user's feed across N buckets
  // readers merge buckets or hit a cached fanout result`}</CodeBlock>
        <Callout type="tip" title="Mitigation toolbox">
          Add caching for hot reads, split hot keys into buckets, precompute fanout
          results, use random suffixes for write-heavy counters, and isolate very
          large tenants onto their own shards.
        </Callout>
      </LessonSection>

      <LessonSection id="rebalancing" title="Rebalancing and resharding pain">
        <P>
          The day you add shards, data must move. That move is called
          <Term>rebalancing</Term> or <Term>resharding</Term>. It is operationally
          risky because the system must continue serving reads and writes while
          ownership changes.
        </P>
        <CodeBlock label="online resharding shape">{`1. Create new shard and update metadata with a planned move.
2. Backfill existing rows for selected buckets to the new shard.
3. Dual-write or capture changes during the backfill window.
4. Verify counts, checksums, and latest change position.
5. Flip routing for those buckets to the new shard.
6. Keep old copy briefly for rollback, then delete it.`}</CodeBlock>
        <UL>
          <LI>
            Moving too much at once can saturate disks and networks.
          </LI>
          <LI>
            A stale router can send writes to the old owner after the move.
          </LI>
          <LI>
            Backfills must include writes that happened while the copy was running.
          </LI>
          <LI>
            Rollback plans need old data, routing metadata, and idempotent scripts.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="cross-shard" title="Cross-shard queries, joins, and transactions">
        <P>
          The easiest sharded systems make most operations single-shard. The hard
          cases are the ones relational databases usually handled for you: joins,
          uniqueness, foreign keys, and transactions across unrelated keys.
        </P>
        <CompareTable
          headers={["Need", "Single-shard version", "Cross-shard complication", "Common response"]}
          rows={[
            ["Join", "Orders join users by user_id on one shard", "Rows live on different databases", "Denormalize, duplicate lookup data, or query service APIs"],
            ["Transaction", "Debit and credit same account shard", "Two primaries must commit atomically", "Avoid, use saga, or use two-phase commit carefully"],
            ["Unique id", "Unique email index on one table", "Each shard sees only local rows", "Central allocator, hash by email, or global uniqueness service"],
            ["Search", "Index local rows", "Query all shards and merge ranking", "Dedicated search index fed by change events"],
          ]}
        />
        <Callout type="warning" title="Two-phase commit is not magic">
          Distributed transactions can preserve atomicity, but they add latency,
          coordinator failure modes, locks held across machines, and operational
          complexity. Many large systems redesign workflows as sagas instead.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Sharding horizontally splits one logical dataset across machines to scale storage, writes, and maintenance work.",
          "The shard key is the central design choice: it should distribute load and keep common queries single-shard.",
          "Range partitioning helps range scans, hash partitioning balances point lookups, and directory partitioning gives flexible placement at metadata cost.",
          "Hotspots and celebrity keys can melt one shard even when average distribution looks healthy; cache, bucket, split, or isolate them.",
          "Cross-shard joins, transactions, uniqueness, and resharding are expensive, so shard after simpler scaling tools are exhausted.",
        ]}
      />

      <CheckYourself question="Why is sharding by message_id bad for reading a chat conversation?">
        A conversation&apos;s messages would scatter across many shards, so loading one
        thread becomes a fan-out query plus merge. Sharding by conversation_id keeps
        the common read local to one shard, at the cost of handling very large or hot
        conversations separately.
      </CheckYourself>

      <CheckYourself question="Why can range partitioning by timestamp create a hotspot?">
        New writes usually target the newest time range. If all events for the
        current minute or day land on the same shard, that shard gets almost all
        write traffic while older shards sit idle.
      </CheckYourself>

      <CheckYourself question="What makes resharding hard in a live system?">
        You must copy old data, capture writes that happen during the copy, keep
        routers from sending traffic to the wrong owner, verify correctness, and
        leave a rollback path. All of that happens while users still expect the
        system to be online.
      </CheckYourself>
    </Prose>
  );
}
