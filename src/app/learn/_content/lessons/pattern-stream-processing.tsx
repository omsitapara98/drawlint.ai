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
  StatGrid,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Stream processing</Term> computes continuously over unbounded
        event streams. Engines such as <Term>Apache Flink</Term> read events from
        <XLink href="/learn/pattern-kafka">Kafka</XLink>, keep durable state,
        group events into time windows, and emit near-real-time results such as
        live metrics, trending scores, and fraud alerts.
      </P>

      <Analogy>
        Batch processing is closing a store, collecting every receipt, and
        calculating the day&apos;s totals at midnight. Stream processing is a smart
        cash register that updates totals, suspicious-spend alerts, and hourly
        leaderboards as each purchase happens.
      </Analogy>

      <LessonSection id="problem" title="The problem: unbounded data never finishes">
        <P>
          Many products are defined by streams that do not end: views, likes,
          payments, sensor readings, ad impressions, location pings, and login
          attempts. A nightly batch job can answer yesterday&apos;s question, but it
          cannot power a live fraud decision or a trending list that should react
          within seconds.
        </P>
        <UL>
          <LI>
            <Term>Database hot spots:</Term> incrementing one row per event creates
            write contention on popular entities and melts the primary database.
          </LI>
          <LI>
            <Term>Delayed decisions:</Term> fraud, abuse, and operational alerts
            lose value if the system waits an hour to aggregate signals.
          </LI>
          <LI>
            <Term>Stateful logic:</Term> useful questions need memory, such as
            how many failures this user had in the last five minutes or which
            videos are rising fastest in this region.
          </LI>
        </UL>
        <Callout type="key" title="The shift in mindset">
          A stream processor treats time and state as first-class concepts. It
          does not ask, &quot;What table do I query now?&quot; It asks, &quot;For each arriving
          event, what state changes and which result should be emitted?&quot;
        </Callout>
      </LessonSection>

      <LessonSection id="operators" title="How Flink works: stateful operators over streams">
        <P>
          A Flink job is a graph of operators. Source operators read from Kafka,
          transformation operators parse, filter, key, window, and aggregate, and
          sink operators write results to Redis, Elasticsearch, a database, or
          another Kafka topic. The powerful part is <Term>keyed state</Term>:
          Flink can keep independent state per key, such as per user, per video,
          or per merchant.
        </P>
        <CodeBlock label="windowed aggregation over a Kafka stream">{`events = KafkaSource("video-events")

views_per_video = events
  .filter(event => event.type == "view")
  .keyBy(event => event.video_id)
  .window(TumblingEventTimeWindow.of(1 minute))
  .aggregate(count())

views_per_video.sinkTo(RedisSink("video:{id}:views:last_minute"))`}</CodeBlock>
        <StatGrid
          stats={[
            { label: "Input", value: "Unbounded" },
            { label: "State", value: "Keyed" },
            { label: "Output", value: "Continuous" },
          ]}
        />
        <P>
          State may live in memory or RocksDB on each worker, but it is not
          disposable cache. Flink periodically checkpoints that state so a failed
          worker can recover and continue from a consistent point.
        </P>
      </LessonSection>

      <LessonSection id="windows" title="Windows: tumbling, sliding, and session">
        <P>
          Since streams are infinite, aggregations need boundaries. A
          <Term>window</Term> says which events belong to one calculation. The
          right window shape depends on the product question.
        </P>
        <CompareTable
          headers={["Window type", "Shape", "Good for", "Example"]}
          rows={[
            ["Tumbling", "Fixed, non-overlapping buckets", "Simple metrics and rollups", "Views per video per minute"],
            ["Sliding", "Fixed size, starts repeatedly", "Moving trends and smoothing", "Errors in the last 5 minutes, updated every 10 seconds"],
            ["Session", "Dynamic gap-based groups", "Bursty user activity", "One shopping session ends after 30 minutes idle"],
          ]}
        />
        <H3>Why windows are not just SQL GROUP BY</H3>
        <P>
          A database query over a fixed table knows all rows are present. A stream
          window must decide when it is ready to produce a result while late
          events may still be on the way. That is where event time and watermarks
          matter.
        </P>
      </LessonSection>

      <LessonSection id="time" title="Event time, processing time, and watermarks">
        <P>
          <Term>Processing time</Term> is the clock on the machine when Flink sees
          the event. <Term>Event time</Term> is when the event actually happened,
          usually recorded by the producer or device. Event time is what users
          normally mean, but events arrive late, out of order, or after retries.
        </P>
        <CodeBlock label="out-of-order events and a watermark">{`event stream arrival order:
  12:00:03  view(video_1)   event_time=12:00:01
  12:00:04  view(video_1)   event_time=12:00:02
  12:00:08  view(video_1)   event_time=12:00:00  # late

watermark = max_seen_event_time - allowed_lateness
watermark = 12:00:02 - 5 seconds = 11:59:57

A one-minute window can close when the watermark passes the window end.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Use event time</Term> when correctness depends on when the user
            action happened, such as analytics, billing rollups, or fraud windows.
          </LI>
          <LI>
            <Term>Use processing time</Term> for operational signals where arrival
            time is the truth, such as current ingestion rate or worker health.
          </LI>
          <LI>
            <Term>Watermarks</Term> are Flink&apos;s progress estimate: &quot;I believe I
            have seen almost everything up to this event time.&quot;
          </LI>
        </UL>
        <Callout type="warning" title="Late data is a product decision">
          If you allow too little lateness, mobile clients and retries get dropped
          from results. If you allow too much, dashboards update slowly and state
          lives longer. Pick the lateness budget intentionally.
        </Callout>
      </LessonSection>

      <LessonSection id="exactly-once" title="Fault tolerance: checkpoints and exactly-once effects">
        <P>
          Flink achieves exactly-once state updates by periodically taking a
          distributed snapshot called a <Term>checkpoint</Term>. The checkpoint
          records operator state and source positions, such as Kafka offsets. On
          failure, Flink restores the last successful checkpoint and resumes input
          from the matching offsets, so state and input position move together.
        </P>
        <CodeBlock label="checkpointed execution">{`checkpoint 41
  Kafka offsets: partition 0 -> 18420, partition 1 -> 9921
  keyed state: video_7 count=531, video_8 count=44
  sink transaction: pending batch chk-41

worker crashes

restore checkpoint 41
  rewind Kafka consumers to recorded offsets
  restore keyed state
  either commit or abort sink transaction for chk-41`}</CodeBlock>
        <P>
          Exactly-once is end-to-end only if the sink participates. Kafka
          transactional sinks can align with checkpoints. Databases often require
          idempotent upserts keyed by window ID, or a two-phase commit sink. Emails
          and external APIs are usually at-least-once unless you add explicit
          dedupe.
        </P>
        <CompareTable
          headers={["Layer", "What Flink can guarantee", "What you must design"]}
          rows={[
            ["Operator state", "Exactly-once restore from checkpoint", "Reasonable checkpoint interval and state backend"],
            ["Kafka source", "Resume from checkpointed offsets", "Retention long enough for recovery"],
            ["Kafka sink", "Transactional exactly-once possible", "Enable transactional sink semantics"],
            ["External DB/API", "Depends on the sink", "Idempotent keys or two-phase commit"],
          ]}
        />
      </LessonSection>

      <LessonSection id="examples" title="Real-world uses and when to avoid it">
        <P>
          Stream processing shines when the answer must be continuously updated
          and can be expressed as state over events. It is not a replacement for
          every cron job or analytical warehouse query; it is a specialized tool
          for fresh, incremental computation.
        </P>
        <UL>
          <LI>
            <Term>Trending:</Term> compute weighted views, likes, and shares in a
            sliding window so a feed can react to sudden momentum.
          </LI>
          <LI>
            <Term>Real-time metrics:</Term> aggregate request rates, latency
            histograms, payment approvals, or ad impressions into dashboards.
          </LI>
          <LI>
            <Term>Fraud detection:</Term> keep per-card, per-device, and per-user
            state for velocity checks, unusual geography, or failed-login bursts.
          </LI>
          <LI>
            <Term>Enrichment:</Term> join click events with campaign metadata or
            user segment state before writing analytics events.
          </LI>
        </UL>
        <Callout type="tip" title="Start with Kafka and a clear state model">
          Flink jobs are easiest to reason about when events arrive through a
          durable log, keys are well chosen, and each operator&apos;s state has an
          owner, TTL, and replay story.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>State growth:</Term> session windows, high-cardinality keys, and
            generous lateness can grow state without bound. Use TTLs and monitor
            checkpoint size.
          </LI>
          <LI>
            <Term>Skew:</Term> one hot key can overload a single task slot. You may
            need key salting, hierarchical aggregation, or a product-level limit.
          </LI>
          <LI>
            <Term>Backpressure:</Term> a slow sink causes upstream operators and
            Kafka consumers to lag. Watch checkpoint duration and consumer lag.
          </LI>
          <LI>
            <Term>Reprocessing changes history:</Term> deploying new logic and
            replaying old events can produce different results. Version outputs
            or backfill to a separate destination when correctness matters.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Stream processing computes continuously over unbounded event streams instead of waiting for a batch window to finish.",
          "Flink jobs are graphs of stateful operators; keyed state lets each user, video, account, or merchant maintain independent memory.",
          "Windows bound infinite streams: tumbling for fixed buckets, sliding for moving trends, and session for activity separated by idle gaps.",
          "Event time plus watermarks handles out-of-order data; allowed lateness is a correctness-versus-latency product trade-off.",
          "Checkpoints align state and source offsets for recovery, but end-to-end exactly-once depends on sink semantics or idempotent writes.",
        ]}
      />

      <CheckYourself question="Why not update a database counter for every video view?">
        A viral video can create millions of writes per second to one hot row.
        Flink keeps per-video counts in keyed state, aggregates in windows, and
        writes rolled-up results, turning a write storm into manageable updates.
      </CheckYourself>

      <CheckYourself question="What problem do watermarks solve?">
        They let the engine estimate progress through event time despite
        out-of-order arrivals. A watermark tells Flink when it is reasonable to
        close a time window while still allowing a configured amount of lateness.
      </CheckYourself>

      <CheckYourself question="When is Flink exactly-once not enough by itself?">
        When the sink cannot participate in checkpointed transactions. Flink can
        restore its own state exactly once, but an external API, email provider,
        or plain database insert still needs idempotent keys or transactional sink
        support to avoid duplicate side effects.
      </CheckYourself>
    </Prose>
  );
}
