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
        <Term>Back-of-the-envelope estimation</Term> turns vague scale into
        useful engineering numbers: requests per second, storage growth,
        bandwidth, and server count. The goal is not perfect precision. The goal
        is to land in the right order of magnitude so the architecture fits the
        problem before you draw boxes.
      </P>

      <Analogy>
        Estimation is ordering pizza for a large party. You do not know exactly
        how hungry every guest will be, but you can say 80 guests, about 3 slices
        each, 8 slices per pizza, plus a safety margin. That is enough to avoid
        showing up with 5 pizzas or 200 pizzas.
      </Analogy>

      <LessonSection id="why" title="Why estimate before designing">
        <P>
          The numbers tell you which designs are plausible. A service doing 50
          requests per second can run on a small fleet. A service doing 5 million
          writes per second needs partitioning, queues, careful storage choices,
          and failure planning. If you skip the math, you may design a bicycle
          for highway traffic.
        </P>
        <CodeBlock label="estimates drive architecture">{`small scale:
  10 QPS, 5 GB storage
  -> one app server and one database may be fine

large scale:
  500,000 QPS, 3 PB/year
  -> load balancing, caching, partitioning, queues, and distributed storage`}</CodeBlock>
        <Callout type="key" title="Say assumptions out loud">
          Estimation is a chain of assumptions. State them clearly, round numbers
          aggressively, and keep units attached. A reasonable method is more
          important than pretending the inputs are exact.
        </Callout>
      </LessonSection>

      <LessonSection id="units" title="Powers of two and storage units">
        <P>
          Computers use binary-ish units, but system design interviews usually
          accept rounded decimal math. Memorize the ladder so you can move from
          item counts to bytes quickly.
        </P>
        <CompareTable
          headers={["Unit", "Rough size", "Useful mental anchor"]}
          rows={[
            ["1 KB", "1 thousand bytes", "A small text message or JSON object"],
            ["1 MB", "1 thousand KB", "A compressed image or small bundle"],
            ["1 GB", "1 thousand MB", "1 KB multiplied by 1 million items"],
            ["1 TB", "1 thousand GB", "1 KB multiplied by 1 billion items"],
            ["1 PB", "1 thousand TB", "1 KB multiplied by 1 trillion items"],
          ]}
        />
        <CodeBlock label="binary powers worth knowing">{`2^10  = 1,024        ~ 1 thousand
2^20  = 1,048,576    ~ 1 million
2^30  = 1,073,741,824 ~ 1 billion

1 KiB -> 1 MiB -> 1 GiB -> 1 TiB -> 1 PiB
for quick estimates, KB -> MB -> GB -> TB -> PB by 1000x`}</CodeBlock>
      </LessonSection>

      <LessonSection id="latency" title="Latency numbers to keep in your head">
        <P>
          Exact numbers vary by hardware, cloud provider, language, and workload,
          but the ordering is stable. Memory is much faster than disk; local
          calls are much faster than cross-region calls; network distance matters.
        </P>
        <StatGrid
          stats={[
            { value: "~100 ns", label: "memory access" },
            { value: "~1-10 us", label: "local SSD read" },
            { value: "~0.5-2 ms", label: "same-zone service call" },
            { value: "~1-5 ms", label: "cache or DB round trip in-region" },
            { value: "~50-150 ms", label: "cross-continent round trip" },
            { value: "86,400", label: "seconds per day" },
          ]}
        />
        <P>
          These numbers shape design choices. A browser request that calls five
          services serially pays network latency five times. A cache hit can save
          a database round trip. A cross-region synchronous write can dominate the
          whole request budget.
        </P>
      </LessonSection>

      <LessonSection id="formulas" title="The core formulas">
        <P>
          Most capacity estimates are built from a few reusable formulas. Keep
          the units visible and convert one step at a time.
        </P>
        <CodeBlock label="request rate">{`requests/day = DAU * actions per user per day
average QPS  = requests/day / 86,400
peak QPS     = average QPS * peak factor

common peak factor: 3x to 5x for consumer systems
higher for spiky events such as sports, sales, or breaking news`}</CodeBlock>
        <CodeBlock label="storage and bandwidth">{`storage = items * bytes per item * replication factor * retention

write bandwidth = writes/second * bytes per write
read bandwidth  = reads/second * bytes per read

server count = peak QPS / safe per-node throughput
then add headroom for failures, deploys, and uneven traffic`}</CodeBlock>
        <CompareTable
          headers={["Estimate", "Formula", "Why it matters"]}
          rows={[
            ["QPS", "DAU x actions/day / 86,400", "Sizes app servers, caches, queues, and DB reads"],
            ["Peak QPS", "average QPS x peak factor", "Systems must survive peaks, not averages"],
            ["Storage", "items x size x replication x retention", "Sizes databases, object stores, and backups"],
            ["Bandwidth", "QPS x response size", "Sizes network links, CDN, and egress cost"],
            ["Server count", "peak QPS / per-node throughput", "Turns demand into fleet size"],
          ]}
        />
        <Callout type="info" title="Related patterns">
          For more practice, see
          <XLink href="/learn/pattern-capacity-chain"> Capacity Chain</XLink> and
          <XLink href="/learn/pattern-capacity-numbers"> Capacity Numbers</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="worked" title="Fully worked example: photo sharing feed">
        <P>
          Suppose you are designing a photo-sharing feed. Use round numbers and
          state assumptions before calculating.
        </P>
        <CodeBlock label="assumptions">{`DAU = 20 million users
feed opens = 12 per user per day
photos uploaded = 2 per user per day
average feed response = 60 KB
average stored photo after compression = 500 KB
metadata per photo = 2 KB
replication factor = 3
retention = 5 years
peak factor = 4x
one app server safely handles 800 QPS`}</CodeBlock>
        <H3>Read QPS</H3>
        <UL>
          <LI>
            <Term>Feed reads/day:</Term> 20M users x 12 opens = 240M feed reads
            per day.
          </LI>
          <LI>
            <Term>Average read QPS:</Term> 240M / 86,400 is about 2,800 QPS.
          </LI>
          <LI>
            <Term>Peak read QPS:</Term> 2,800 x 4 is about 11,200 QPS.
          </LI>
        </UL>
        <H3>Write QPS and storage</H3>
        <UL>
          <LI>
            <Term>Uploads/day:</Term> 20M users x 2 photos = 40M photos per day.
          </LI>
          <LI>
            <Term>Average upload QPS:</Term> 40M / 86,400 is about 460 uploads
            per second; peak is about 1,850 uploads per second.
          </LI>
          <LI>
            <Term>Raw photo storage/day:</Term> 40M x 500 KB = 20 TB per day.
          </LI>
          <LI>
            <Term>Replicated photo storage/day:</Term> 20 TB x 3 = 60 TB per day.
          </LI>
          <LI>
            <Term>Five-year replicated photo storage:</Term> 60 TB/day x 365 x 5
            is about 110 PB.
          </LI>
          <LI>
            <Term>Metadata/day:</Term> 40M x 2 KB = 80 GB raw, or 240 GB with
            3x replication. Metadata is much smaller than media but still large
            enough to require partitioning over time.
          </LI>
        </UL>
        <H3>Bandwidth and servers</H3>
        <UL>
          <LI>
            <Term>Peak feed bandwidth:</Term> 11,200 QPS x 60 KB is about 672
            MB/s before compression and CDN effects.
          </LI>
          <LI>
            <Term>Peak upload bandwidth:</Term> 1,850 uploads/s x 500 KB is about
            925 MB/s entering object storage.
          </LI>
          <LI>
            <Term>App server count:</Term> 11,200 peak QPS / 800 safe QPS per
            node = 14 nodes. Add headroom for deploys and failures, so start with
            roughly 20 to 25 app servers.
          </LI>
        </UL>
        <Callout type="key" title="What the example tells you">
          The math points to a CDN for feed media, object storage for photos,
          stateless app servers behind a load balancer, a partitioned metadata
          store, and background processing for thumbnails. The estimate produced
          design constraints, not just trivia.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and practical habits">
        <UL>
          <LI>
            <Term>Average hides peaks:</Term> traffic follows time zones,
            notifications, launches, and special events. Always multiply by a
            peak factor.
          </LI>
          <LI>
            <Term>Replication and backups count:</Term> a 1 TB logical dataset may
            consume 3 TB replicated plus backup, index, and log overhead.
          </LI>
          <LI>
            <Term>Per-node throughput is a safe number:</Term> use measured
            sustainable throughput, not a perfect benchmark from an empty lab.
          </LI>
          <LI>
            <Term>Reads and writes differ:</Term> reads may be cacheable; writes
            often require durability, ordering, validation, and replication.
          </LI>
          <LI>
            <Term>Units prevent mistakes:</Term> write KB, MB, seconds, days, and
            years in every line so you do not multiply incompatible quantities.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Back-of-the-envelope estimation converts vague scale into QPS, storage, bandwidth, and server counts.",
          "Memorize unit ladders and latency anchors: KB to PB, 86,400 seconds per day, and the rough cost of memory, disk, network, and cross-region calls.",
          "QPS comes from DAU x actions per day divided by 86,400, then multiplied by a peak factor.",
          "Storage comes from item count x item size x replication x retention, with extra room for indexes, backups, logs, and growth.",
          "Server count is peak QPS divided by safe per-node throughput, plus headroom for failures, deploys, and uneven load.",
        ]}
      />

      <CheckYourself question="A service has 10 million daily users and each performs 20 actions per day. What is average QPS?">
        Requests per day are 10M x 20 = 200M. Average QPS is 200M / 86,400,
        which is roughly 2,300 QPS. With a 5x peak factor, plan for about 11,500
        QPS before caching or batching.
      </CheckYourself>

      <CheckYourself question="Why include replication when estimating storage?">
        The system stores more physical bytes than the logical dataset. A 10 TB
        logical dataset with 3x replication needs about 30 TB before indexes,
        backups, logs, compaction overhead, and growth margin.
      </CheckYourself>

      <CheckYourself question="How do you derive an initial app server count from QPS?">
        Divide peak QPS by the safe sustained throughput of one node. If peak is
        40,000 QPS and one node safely handles 1,000 QPS, the math says 40 nodes.
        Add headroom so the fleet survives deploys, failures, and uneven load.
      </CheckYourself>
    </Prose>
  );
}