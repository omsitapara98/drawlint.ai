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
        <Term>Cassandra</Term> is a distributed <Term>wide-column</Term> database
        built for enormous write throughput, predictable horizontal scaling, and
        availability across failures. It is excellent when your access patterns
        are known ahead of time, your data is naturally partitioned, and your app
        can tolerate tunable eventual consistency instead of relational joins.
      </P>

      <Analogy>
        Cassandra is like a warehouse with many identical packing stations. A
        label on each package says which station owns it, and packages at that
        station are stacked in a deliberate order. Add more stations and the
        warehouse can accept more packages per second, but workers will not run
        across the building to assemble a package from five unrelated stations.
      </Analogy>

      <LessonSection id="problem" title="The problem: one write leader cannot absorb every firehose">
        <P>
          Relational databases are general-purpose and deeply powerful, but a
          single primary can become the write bottleneck for append-heavy systems:
          telemetry pings, chat messages, ad impressions, sensor readings,
          clickstream events, and time-series metrics. These workloads often need
          to accept millions of small writes, keep working during node failures,
          and read data by a narrow key plus time range.
        </P>
        <CodeBlock label="append-heavy workload shape">{`writes:  device_id=abc, ts=10:00:01, temp=21.4
writes:  device_id=abc, ts=10:00:02, temp=21.5
writes:  device_id=xyz, ts=10:00:02, temp=19.9

reads:   latest readings for device abc in the last hour
         messages in conversation 123 after cursor T
         events for customer 42 on 2026-06-10`}</CodeBlock>
        <P>
          Cassandra chooses a different set of trade-offs. It gives up joins,
          foreign keys, and arbitrary ad hoc queries so it can route each write
          directly to the nodes responsible for that partition. If your query can
          be answered by a known partition key and ordered clustering columns,
          Cassandra can be extremely fast and resilient.
        </P>
        <CompareTable
          headers={["Need", "Cassandra fit", "Reason"]}
          rows={[
            ["High write throughput", "Strong", "Writes are distributed across partitions and nodes"],
            ["Time-series lookups", "Strong", "Partition by entity/time bucket and cluster by timestamp"],
            ["Complex joins", "Poor", "No join engine; model one table per query"],
            ["Strict multi-row transactions", "Poor", "Consistency is tunable, not classic relational ACID across many rows"],
          ]}
        />
      </LessonSection>

      <LessonSection id="data-model" title="Data model: partition key plus clustering columns">
        <P>
          A Cassandra table is organized around its <Term>primary key</Term>, which
          has two jobs. The <Term>partition key</Term> decides which nodes store a
          group of rows. The <Term>clustering columns</Term> decide how rows are
          sorted inside that partition. This is why data modeling starts with the
          read query, not with an entity-relationship diagram.
        </P>
        <CodeBlock label="time-bucketed readings table">{`CREATE TABLE readings_by_device_day (
  device_id text,
  day date,
  reading_ts timestamp,
  temperature double,
  battery_percent int,
  PRIMARY KEY ((device_id, day), reading_ts)
) WITH CLUSTERING ORDER BY (reading_ts DESC);

-- partition key: (device_id, day)
-- clustering column: reading_ts
-- efficient query: latest readings for one device on one day`}</CodeBlock>
        <UL>
          <LI>
            <Term>Partition key:</Term> spreads data across the cluster. A good key
            has high cardinality and avoids routing most traffic to one hot node.
          </LI>
          <LI>
            <Term>Clustering columns:</Term> define on-disk order within a
            partition. They make range scans such as newest messages or last hour
            of metrics efficient.
          </LI>
          <LI>
            <Term>Time buckets:</Term> bound partition size. A partition per device
            forever can become huge; a partition per device per day or month is
            easier to compact, repair, and read.
          </LI>
        </UL>
        <Callout type="warning" title="Query-first means denormalized by design">
          If you need three query shapes, you often create three tables containing
          overlapping data. Cassandra optimizes predictable reads and writes, not
          normalized storage. The application or pipeline keeps those denormalized
          views in sync.
        </Callout>
      </LessonSection>

      <LessonSection id="write-path" title="The LSM-tree write path: commit log → memtable → SSTable">
        <P>
          Cassandra is fast at writes because it avoids random in-place updates.
          A write is appended to a durable <Term>commit log</Term>, placed in an
          in-memory <Term>memtable</Term>, and later flushed as immutable sorted
          files called <Term>SSTables</Term>. This Log-Structured Merge-tree
          design turns many tiny writes into large sequential disk writes.
        </P>
        <CodeBlock label="Cassandra write path">{`client write
  └─▶ coordinator node receives mutation
        ├─ append to commit log          // durability before ack
        ├─ update memtable               // in-memory sorted structure
        ├─ send to replica nodes         // based on replication factor
        └─ ack when consistency level is satisfied

memtable fills
  └─▶ flush immutable SSTable to disk

background
  └─▶ compact SSTables, merging rows and discarding old tombstones`}</CodeBlock>
        <H3>Why reads need more work</H3>
        <P>
          Because updates create new versions instead of editing old bytes,
          reading may consult the memtable, row cache, Bloom filters, partition
          indexes, and several SSTables before returning the latest value.
          Compaction is the background process that merges SSTables, removes
          overwritten data, and keeps read amplification under control.
        </P>
        <CompareTable
          headers={["Component", "Write role", "Read role"]}
          rows={[
            ["Commit log", "Durable append before acknowledgment", "Replayed after crash recovery"],
            ["Memtable", "Receives recent writes in memory", "Checked first for freshest rows"],
            ["SSTable", "Immutable flushed data on disk", "Scanned with indexes and Bloom filters"],
            ["Compaction", "Merges many immutable files later", "Reduces stale versions and tombstones"],
          ]}
        />
      </LessonSection>

      <LessonSection id="consistency" title="Tunable consistency: ONE, QUORUM, ALL">
        <P>
          Cassandra is leaderless: for a given partition, multiple replicas can
          accept writes. The client chooses how many replicas must acknowledge a
          read or write through a <Term>consistency level</Term>. With replication
          factor 3, the common choices are <code>ONE</code>, <code>QUORUM</code>,
          and <code>ALL</code>.
        </P>
        <CompareTable
          headers={["Level", "Acknowledgment rule", "Trade-off"]}
          rows={[
            ["ONE", "One replica replies", "Lowest latency and highest availability, but stale reads are more likely"],
            ["QUORUM", "A majority replies", "Balanced default; read quorum plus write quorum overlap"],
            ["ALL", "Every replica replies", "Strongest freshness, but one slow replica can fail the operation"],
          ]}
        />
        <CodeBlock label="quorum overlap with replication factor 3">{`replication factor = 3
write CL = QUORUM  → at least 2 replicas store the write
read  CL = QUORUM  → at least 2 replicas answer the read

Any read quorum of 2 overlaps any write quorum of 2,
so the read should encounter the latest write or trigger repair.`}</CodeBlock>
        <P>
          This is not the same as full relational serializability. Clock skew,
          conflicting writes, tombstones, and repair behavior still matter. But
          tunable consistency lets you decide per operation whether latency,
          availability, or freshness is most important. This idea pairs with the
          quorum ideas in <XLink href="/learn/pattern-wal-quorum">WAL + quorum</XLink>.
        </P>
      </LessonSection>

      <LessonSection id="query-first" title="No joins: model one table per query">
        <P>
          Cassandra does not reward asking new questions at runtime. You design
          the table so the query can be answered by a partition lookup and a
          narrow ordered scan. If a product feature needs a different sort order
          or lookup key, you add another denormalized table rather than adding a
          join.
        </P>
        <CodeBlock label="same messages stored for two query shapes">{`-- Query 1: load a conversation in time order
messages_by_conversation (
  conversation_id,
  bucket_day,
  message_ts,
  message_id,
  sender_id,
  body,
  PRIMARY KEY ((conversation_id, bucket_day), message_ts, message_id)
)

-- Query 2: load recent messages sent by a user
messages_by_sender (
  sender_id,
  bucket_day,
  message_ts,
  message_id,
  conversation_id,
  body,
  PRIMARY KEY ((sender_id, bucket_day), message_ts, message_id)
)`}</CodeBlock>
        <UL>
          <LI>
            Write amplification is expected: one logical message may be inserted
            into multiple tables.
          </LI>
          <LI>
            Deletes create <Term>tombstones</Term>, which remain until compaction
            and can hurt reads if overused.
          </LI>
          <LI>
            Cross-partition scans are a smell. If a query needs to scan the whole
            cluster, use a search engine, analytics store, or different database.
          </LI>
        </UL>
        <Callout type="info" title="Related scaling primitive">
          Cassandra bakes in partitioning as a first-class design constraint. For
          broader partitioning trade-offs, see{" "}
          <XLink href="/learn/sharding-partitioning">sharding and partitioning</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="When to use it, and the gotchas to respect">
        <P>
          Cassandra is a strong fit for high-volume time-series metrics, IoT
          readings, chat/event timelines, fraud signals, activity feeds, and
          append-only audit-style data where the access patterns are known and
          locality is clear. It is usually a poor fit for highly relational
          product catalogs, financial ledgers needing strict transactions across
          accounts, and admin tools full of ad hoc filters.
        </P>
        <UL>
          <LI>
            <Term>Hot partitions:</Term> celebrity users, global counters, or a
            partition key such as <code>{"country = 'US'"}</code> can overload a
            small set of nodes.
          </LI>
          <LI>
            <Term>Unbounded partitions:</Term> a forever-growing user timeline can
            become expensive to read and compact. Add time buckets.
          </LI>
          <LI>
            <Term>Tombstone storms:</Term> TTLs and deletes create tombstones.
            Massive tombstone scans are a classic cause of slow reads.
          </LI>
          <LI>
            <Term>Operational discipline:</Term> repairs, compaction strategy,
            replication factor, and disk utilization are part of the product, not
            background trivia.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Cassandra is a wide-column, leaderless database optimized for massive, partitionable write throughput.",
          "The partition key decides data placement; clustering columns decide order within a partition, so model from queries first.",
          "The LSM write path appends to a commit log, updates a memtable, flushes immutable SSTables, and relies on compaction.",
          "Consistency is tunable per operation with levels such as ONE, QUORUM, and ALL; quorum is a balanced default, not magic serializability.",
          "Use Cassandra for known, append-heavy access patterns such as time-series and feeds; avoid it for joins, ad hoc queries, and strict multi-row transactions.",
        ]}
      />

      <CheckYourself question="Why do Cassandra schemas usually start from queries instead of entities?">
        Cassandra can efficiently read by partition key and clustering order, but
        it does not join arbitrary tables at query time. Each important access
        pattern needs a table shaped for that lookup, even if that means storing
        denormalized copies.
      </CheckYourself>

      <CheckYourself question="What makes the commit log, memtable, and SSTable path fast for writes?">
        The database avoids random in-place updates. It appends to a durable log,
        updates memory, and later flushes sorted immutable files. Background
        compaction pays the merge cost after the write has been accepted.
      </CheckYourself>

      <CheckYourself question="With replication factor 3, why is QUORUM often the default consistency level?">
        A quorum write reaches at least two replicas, and a quorum read checks at
        least two replicas. Those sets overlap, which gives a practical balance of
        freshness, latency, and availability for many workloads.
      </CheckYourself>
    </Prose>
  );
}
