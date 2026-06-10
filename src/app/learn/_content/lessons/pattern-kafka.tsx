import {
  Prose,
  LessonSection,
  P,
  XLink,
  Term,
  UL,
  LI,
  Callout,
  Analogy,
  CodeBlock,
  CompareTable,
  StatGrid,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Kafka</Term> is a distributed, durable, replayable, partitioned
        log. Producers append records to topics; consumers read those records at
        their own pace by offset. It is the backbone for event streaming because
        it combines high throughput, per-key ordering, retention, and replay in
        one primitive.
      </P>

      <Analogy>
        Kafka is closer to a bank statement than a work queue. A queue hands one
        task to one worker and then removes it. A statement keeps every entry in
        order, lets many departments read it independently, and lets a new
        auditor start from January even though accounting already read June.
      </Analogy>

      <LessonSection id="log" title="The primitive: an append-only partitioned log">
        <P>
          A Kafka <Term>topic</Term> is split into <Term>partitions</Term>. Each
          partition is an append-only sequence of records. Kafka assigns every
          record an <Term>offset</Term>, which is just its position in that
          partition. Consumers do not ask Kafka to delete messages after reading;
          they remember the latest offset they processed.
        </P>
        <CodeBlock label="topic, partitions, and offsets">{`topic: payments.events

partition 0:  offset 0   offset 1   offset 2   offset 3
              pmt_7 ok   pmt_9 ok   pmt_7 refund  ...

partition 1:  offset 0   offset 1   offset 2
              pmt_8 ok   pmt_12 ok  pmt_8 dispute ...

partition 2:  offset 0   offset 1
              pmt_10 ok  pmt_11 ok  ...

consumer checkpoint for group analytics:
  partition 0 -> next offset 3
  partition 1 -> next offset 2
  partition 2 -> next offset 1`}</CodeBlock>
        <StatGrid
          stats={[
            { label: "Ordering unit", value: "Partition" },
            { label: "Read position", value: "Offset" },
            { label: "Scale lever", value: "Partitions" },
          ]}
        />
        <Callout type="key" title="Kafka stores history, not tasks">
          A record remains available until retention deletes it, even after many
          consumers read it. That replayable history is what makes Kafka a log
          rather than a traditional consume-and-delete queue.
        </Callout>
      </LessonSection>

      <LessonSection id="ordering" title="Ordering: guaranteed only within one partition">
        <P>
          Kafka gives a strong but narrow ordering guarantee: records in one
          partition are read in the same order they were appended. There is no
          global order across partitions. To get meaningful ordering, choose a
          message key that represents the entity whose order matters, such as
          <code>conversation_id</code>, <code>order_id</code>, or
          <code>account_id</code>.
        </P>
        <CodeBlock label="key determines the partition">{`partition = hash(record.key) % topic.partition_count

key = conversation_42
  -> all messages for conversation_42 land on partition 5
  -> consumers see them in send order

key = random_uuid
  -> great distribution
  -> no per-conversation ordering guarantee`}</CodeBlock>
        <UL>
          <LI>
            <Term>Good key:</Term> the aggregate whose sequence matters. Chat
            messages key by conversation, ledger entries key by account, and
            order lifecycle events key by order.
          </LI>
          <LI>
            <Term>Bad key:</Term> a value that changes for each event if you need
            ordering, or one hot value that sends all traffic to one partition.
          </LI>
          <LI>
            <Term>Partition count is part of the contract:</Term> adding partitions
            can change hash placement for new records, so designs that require
            strict long-term key affinity need a partitioning plan.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="groups" title="Consumer groups, parallelism, and rebalancing">
        <P>
          A <Term>consumer group</Term> is Kafka&apos;s way to parallelize one logical
          subscription. Within a group, each partition is assigned to at most one
          consumer at a time. If a topic has 12 partitions and a group has 4
          healthy consumers, each consumer may process about 3 partitions. If one
          consumer dies, Kafka <Term>rebalances</Term> and assigns its partitions
          to the survivors.
        </P>
        <CompareTable
          headers={["Concept", "What it means", "Design implication"]}
          rows={[
            ["One group", "One logical application subscription", "Scale it by adding consumers up to the partition count"],
            ["Partition assignment", "Only one consumer in the group owns a partition", "Preserves per-partition order"],
            ["Offset commit", "The group records how far it processed", "Restart resumes from the committed offset"],
            ["Rebalance", "Partitions move after membership changes", "Consumers must handle pause, revoke, and retry cleanly"],
          ]}
        />
        <Callout type="warning" title="More consumers than partitions do not help">
          In one consumer group, extra consumers sit idle once every partition is
          assigned. More partitions create more parallelism, but they also add
          broker metadata, file handles, rebalancing work, and operational cost.
        </Callout>
      </LessonSection>

      <LessonSection id="durability" title="Durability: replication, leaders, and ISR">
        <P>
          Each partition has a leader broker and follower replicas. Producers send
          writes to the leader; followers copy the log. The <Term>in-sync replica</Term>
          set (ISR) contains replicas that are caught up enough to be considered
          safe. For important data, production clusters commonly use replication
          factor 3, <code>acks=all</code>, and <code>min.insync.replicas=2</code>.
        </P>
        <CodeBlock label="replicated partition write">{`partition payments.events-0

broker A: leader     offset 1042  offset 1043  offset 1044
broker B: follower   offset 1042  offset 1043  offset 1044   <- in ISR
broker C: follower   offset 1042  offset 1043                <- lagging

producer config:
  acks = all
  min.insync.replicas = 2

write offset 1045 succeeds only when the leader and enough ISR replicas store it.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Leader failure:</Term> Kafka elects an in-sync follower as the
            new leader so committed records survive broker loss.
          </LI>
          <LI>
            <Term>Producer acknowledgments:</Term> <code>acks=1</code> is faster
            but can lose acknowledged writes if the leader dies before followers
            copy them. <code>acks=all</code> waits for the configured ISR quorum.
          </LI>
          <LI>
            <Term>Replication is not backup:</Term> it handles machine failure,
            not accidental deletion, bad producers, or infinite retention needs.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="retention" title="Retention and replay: the superpower">
        <P>
          Kafka keeps records for a retention policy: maybe 7 days, 30 days, or a
          size cap. During that window, any consumer group can start at an older
          offset and replay history. This is how teams rebuild search indexes,
          backfill a new analytics pipeline, or recover from a bad deployment.
        </P>
        <CompareTable
          headers={["Queue", "Kafka log"]}
          rows={[
            ["Message is usually removed after one successful receive", "Record stays until retention expires"],
            ["Competing consumers share work", "Many consumer groups independently read the same records"],
            ["Replay often needs a dead-letter archive or source DB", "Replay is built in by resetting offsets"],
            ["Best for discrete tasks", "Best for event history and stream processing"],
          ]}
        />
        <P>
          This difference is why Kafka pairs naturally with{" "}
          <XLink href="/learn/message-queues">message queues</XLink> rather than
          replacing every queue. Use queues for commands that should be done once;
          use Kafka for facts that many systems may need to observe or replay.
        </P>
      </LessonSection>

      <LessonSection id="performance" title="Why Kafka is fast: sequential I/O and zero-copy">
        <P>
          Kafka is optimized around the fact that appending to a file and reading
          it sequentially is extremely efficient. Brokers write partition logs to
          disk in append order, batch records together, and serve consumers by
          streaming contiguous bytes. On many platforms, Kafka can use
          <Term>zero-copy</Term> transfer so bytes move from the filesystem cache
          to the network socket without being copied repeatedly through user-space
          buffers.
        </P>
        <UL>
          <LI>
            <Term>Batching:</Term> producers group many records into one request,
            which amortizes network and disk overhead.
          </LI>
          <LI>
            <Term>Sequential access:</Term> append and scan are friendly to disks,
            SSDs, page cache, and prefetching.
          </LI>
          <LI>
            <Term>Consumer pull:</Term> consumers fetch at their own pace, which
            naturally supports backpressure and independent replay.
          </LI>
        </UL>
        <Callout type="info" title="Real-world use cases">
          Kafka is common for event-driven microservices, clickstream analytics,
          fraud signals, CDC pipelines, audit trails, and as the input log for{" "}
          <XLink href="/learn/pattern-stream-processing">stream processing</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>At-least-once duplicates:</Term> a consumer can process a record
            and crash before committing its offset. On restart it rereads the
            record, so side effects need idempotency.
          </LI>
          <LI>
            <Term>Hot partitions:</Term> one celebrity user or giant tenant can
            dominate a partition if the key is too coarse. Shard hot keys only if
            you can tolerate weaker ordering or add a sequencer.
          </LI>
          <LI>
            <Term>Poison records:</Term> one bad record can block a partition.
            Use retries with limits, dead-letter topics, and alerting.
          </LI>
          <LI>
            <Term>Lag is a symptom, not a metric to ignore:</Term> rising consumer
            lag means producers are outpacing processing, consumers are stuck, or
            rebalances are too frequent.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Kafka is an append-only, partitioned log: records have offsets and remain available until retention removes them.",
          "Ordering is guaranteed only within one partition, so choose keys around the entity whose order matters.",
          "Consumer groups scale one subscription by assigning partitions to consumers; rebalancing moves ownership after failures or deploys.",
          "Durability comes from replication, ISR, and producer settings such as acks=all with min.insync.replicas.",
          "Kafka is fast because it batches, writes sequentially, uses the page cache, and can stream bytes with zero-copy; replay is the major product feature.",
        ]}
      />

      <CheckYourself question="You need chat messages ordered per conversation but want thousands of conversations in parallel. What key should producers use?">
        Use <code>conversation_id</code> as the Kafka key. All records for one
        conversation land on the same partition and keep order, while different
        conversations spread across partitions for parallel processing.
      </CheckYourself>

      <CheckYourself question="Why can a Kafka consumer see the same record twice?">
        It may process the record and crash before committing the next offset.
        After restart, the group resumes from the old committed offset and reads
        the record again. That is why consumers should make side effects
        idempotent.
      </CheckYourself>

      <CheckYourself question="What is the practical difference between a queue and a Kafka log?">
        A queue usually removes a message after one worker completes it. Kafka
        keeps records until retention expires, so many independent consumer
        groups can read the same history and new systems can replay old events.
      </CheckYourself>
    </Prose>
  );
}
