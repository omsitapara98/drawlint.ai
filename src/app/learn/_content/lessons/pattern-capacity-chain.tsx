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
  StatGrid,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        The capacity chain is a repeatable pipeline for turning a product prompt
        into engineering numbers. Start with users, convert behavior into QPS,
        convert payloads into storage and bandwidth, then divide by realistic
        per-node capacity. The output is not a final procurement plan; it is a
        scale-aware map for the architecture you are about to draw.
      </P>

      <Analogy>
        It is like planning a restaurant before buying equipment. First estimate
        guests per day, then meals per hour at dinner rush, ingredients consumed,
        fridge space, stove throughput, and finally how many cooks and ovens you
        need. Buying random appliances first is backwards.
      </Analogy>

      <LessonSection id="problem" title="The problem: diagrams without numbers lie">
        <P>
          A whiteboard architecture can look reasonable while being off by orders
          of magnitude. One Postgres primary may be perfect for 500 QPS and wrong
          for 500K QPS. A single object store bucket may hold the data, but the CDN
          and encoding pipeline may dominate bandwidth. The capacity chain forces
          each major design choice to connect back to load.
        </P>
        <StatGrid
          stats={[
            { value: "DAU", label: "How many active users create demand" },
            { value: "QPS", label: "How much request work hits services" },
            { value: "Storage", label: "How much durable data accumulates" },
            { value: "Bandwidth", label: "How many bytes move per second" },
            { value: "Nodes", label: "How much fleet capacity is needed" },
            { value: "Headroom", label: "How much safety margin absorbs peaks" },
          ]}
        />
        <Callout type="key" title="The core idea">
          Each step feeds the next. If you change DAU, payload size, retention, or
          peak factor, the whole chain updates and the architecture may change.
        </Callout>
      </LessonSection>

      <LessonSection id="template" title="The template: DAU → QPS → storage → bandwidth → nodes">
        <P>
          Use the same path every time. Keep reads, writes, and large media
          transfers separate if they stress different components. Use the memorized
          anchors from{" "}
          <XLink href="/learn/pattern-capacity-numbers">Numbers to Memorize</XLink>
          , then refine with real benchmarks when available.
        </P>
        <CodeBlock label="capacity chain template">{`1. Daily actions
   daily_actions = DAU * actions_per_user_per_day

2. Average QPS
   avg_qps = daily_actions / 86,400

3. Peak QPS
   peak_qps = avg_qps * peak_factor

4. Storage
   logical_storage = items * average_item_size
   raw_storage = logical_storage * replication_factor * retention_window

5. Bandwidth
   bytes_per_second = peak_qps * response_or_payload_size

6. Node count
   nodes = ceil(peak_qps / safe_qps_per_node)
   storage_nodes = ceil(raw_storage / safe_storage_per_node)`}</CodeBlock>
        <UL>
          <LI>
            <Term>DAU:</Term> daily active users, not total registered users. Use
            monthly users only after converting to daily activity.
          </LI>
          <LI>
            <Term>Actions/day:</Term> separate write actions from read actions.
            A chat app may send 40 messages but read hundreds of timeline entries.
          </LI>
          <LI>
            <Term>Peak factor:</Term> 3× for steady enterprise, 5× for
            consumer/social, and more for launches, live events, or flash sales.
          </LI>
          <LI>
            <Term>Safe per-node throughput:</Term> use conservative numbers that
            leave CPU, memory, network, and failure headroom.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="worked-example" title="One worked example: photo sharing feed">
        <P>
          Suppose you are designing a photo sharing feed for 50 million daily
          active users. Each user uploads 2 photos per day, reads the feed 30 times
          per day, each feed read returns about 20 KB of JSON metadata, and each
          compressed photo averages 2 MB. Keep photos for 1 year, replicate storage
          3 ways, and size consumer peaks at 5× average.
        </P>
        <CodeBlock label="end-to-end capacity chain">{`Inputs
  DAU = 50,000,000 users
  photo uploads = 2 per user per day
  feed reads = 30 per user per day
  feed response metadata = 20 KB
  photo size = 2 MB
  peak factor = 5
  replication factor = 3
  retention = 365 days

Writes: photo uploads
  daily_uploads = 50M * 2 = 100M uploads/day
  avg_write_qps = 100M / 86,400 ≈ 1,160 writes/s
  peak_write_qps = 1,160 * 5 ≈ 5,800 writes/s

Reads: feed requests
  daily_feed_reads = 50M * 30 = 1.5B reads/day
  avg_read_qps = 1.5B / 86,400 ≈ 17,400 reads/s
  peak_read_qps = 17,400 * 5 ≈ 87,000 reads/s

Photo storage
  logical_photo_storage_per_day = 100M * 2 MB = 200 TB/day
  logical_photo_storage_1_year = 200 TB/day * 365 ≈ 73 PB
  raw_replicated_storage = 73 PB * 3 ≈ 219 PB

Feed metadata bandwidth at peak
  peak_feed_bandwidth = 87,000 reads/s * 20 KB ≈ 1.7 GB/s
  in bits = 1.7 GB/s * 8 ≈ 13.6 Gbps before protocol overhead

Rough node counts
  app servers at safe 5K QPS/node:
    ceil(87,000 / 5,000) ≈ 18 nodes for feed reads
    add redundancy and multi-AZ headroom → ~30+ nodes

  upload metadata DB at safe 2K writes/s/primary shard:
    ceil(5,800 / 2,000) ≈ 3 write shards before headroom

  object storage:
    219 PB raw is not a single-disk problem; use managed object storage
    and put a CDN in front for popular photo downloads`}</CodeBlock>
        <P>
          The architecture now follows the numbers. Feed reads need caching and
          horizontal app servers. Photo bytes should go directly to object storage,
          not through app servers. Storage volume is large enough that lifecycle
          policies, compression, and CDN hit rate are first-class design concerns.
        </P>
      </LessonSection>

      <LessonSection id="interpretation" title="Turning numbers into architecture choices">
        <P>
          After the chain, ask which number dominates. Sometimes QPS dominates and
          you need caching, partitioning, and load balancing. Sometimes storage
          dominates and you need object storage, compaction, retention, or tiering.
          Sometimes bandwidth dominates and you need CDN, compression, batching, or
          a different product contract.
        </P>
        <UL>
          <LI>
            <Term>High read QPS:</Term> cache hot objects, precompute read models,
            and avoid expensive joins on the critical path.
          </LI>
          <LI>
            <Term>High write QPS:</Term> partition by key, queue bursty work, and
            make writes idempotent for retries.
          </LI>
          <LI>
            <Term>High storage:</Term> define retention early, separate hot and
            cold data, and model index overhead.
          </LI>
          <LI>
            <Term>High bandwidth:</Term> move bytes through CDN or object storage,
            compress responses, and avoid fanout copies when references work.
          </LI>
        </UL>
        <Callout type="info" title="Connect to the broader capacity topic">
          This template is the hands-on companion to{" "}
          <XLink href="/learn/capacity-estimation">capacity estimation</XLink>.
          The same arithmetic supports interview answers, design docs, and early
          infrastructure sizing.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and calibration">
        <P>
          The capacity chain is simple, but inputs are often fuzzy. Make your
          assumptions visible and keep them easy to change. A design doc should say
          &quot;assuming 5× peak and 20 KB feed responses&quot;, not hide those values
          inside a final node count.
        </P>
        <UL>
          <LI>
            <Term>Do not mix units:</Term> bits vs. bytes and KB vs. KiB mistakes
            can create 8× or 1024× errors.
          </LI>
          <LI>
            <Term>Separate reads and writes:</Term> one blended QPS number can hide
            the fact that databases and caches face very different loads.
          </LI>
          <LI>
            <Term>Include retries:</Term> timeouts, at-least-once consumers, and
            client retries can amplify peak load during incidents.
          </LI>
          <LI>
            <Term>Leave headroom:</Term> node counts from division are minimums.
            Add capacity for deploys, failures, uneven partitions, and growth.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "The capacity chain is DAU → actions/day → average QPS → peak QPS → storage → bandwidth → node count.",
          "Use peak QPS, not average QPS, for synchronous serving paths; queue only work that the product can tolerate delaying.",
          "Storage estimates must include item size, replication factor, indexes, backups, and retention window.",
          "Bandwidth is peak QPS times payload size; large bytes should usually move through CDN or object storage rather than app servers.",
          "Node counts come from dividing by conservative per-node capacity and then adding headroom for failures, deploys, and growth.",
        ]}
      />

      <CheckYourself question="Why does the capacity chain start with user behavior instead of servers?">
        Servers are the answer, not the input. User count and actions create the
        traffic, storage, and bandwidth demand; only then can you divide by
        per-node capacity to estimate machines.
      </CheckYourself>

      <CheckYourself question="A service has 1B reads/day and a 5× peak factor. Roughly what peak QPS should you design for?">
        1B/day divided by 86,400 is about 11,600 average QPS. Multiply by 5× for
        peak and you get roughly 58,000 QPS.
      </CheckYourself>

      <CheckYourself question="Why is a raw node count from QPS division only a lower bound?">
        It assumes perfect balance and no failures. Real systems need headroom for
        deploys, bad partitions, retries, regional failover, noisy neighbors, and
        future growth.
      </CheckYourself>
    </Prose>
  );
}
