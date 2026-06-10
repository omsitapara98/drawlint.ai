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
  StatGrid,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        Capacity estimation becomes much less mysterious when you memorize a small
        set of reference numbers. You do not need perfect precision in a system
        design interview or early architecture review. You need order-of-magnitude
        anchors that help you convert users into QPS, payloads into storage, and
        latency budgets into realistic component choices.
      </P>

      <Analogy>
        These numbers are like knowing that a mile is about 1.6 kilometers and a
        gallon is about 4 liters. You can still use a calculator later, but the
        memorized landmarks keep you from confidently designing a bridge that is
        off by a factor of 100.
      </Analogy>

      <LessonSection id="latency" title="Latency numbers every estimate needs">
        <P>
          Latency numbers tell you what can fit inside a request path. A few CPU
          cache reads are invisible. A disk seek is enormous by comparison. A
          cross-region round trip can consume an entire user-facing budget before
          your application code runs.
        </P>
        <StatGrid
          stats={[
            { value: "~0.5 ns", label: "L1 cache reference" },
            { value: "~4 ns", label: "L2 cache reference" },
            { value: "~100 ns", label: "Main memory reference" },
            { value: "~1 µs", label: "Fast NVMe random read best case" },
            { value: "~100 µs", label: "SSD random read typical order" },
            { value: "~5-10 ms", label: "Spinning disk seek" },
            { value: "~0.2-1 ms", label: "Same-AZ network round trip" },
            { value: "~1-3 ms", label: "Same-region service call" },
            { value: "~30-80 ms", label: "Cross-country round trip" },
            { value: "~150-250 ms", label: "Intercontinental round trip" },
          ]}
        />
        <Callout type="key" title="The mental model">
          Memory is nanoseconds, local networks are microseconds to low
          milliseconds, disks are milliseconds, and wide-area networks are tens to
          hundreds of milliseconds. Count the slow things in your critical path.
        </Callout>
      </LessonSection>

      <LessonSection id="powers" title="Powers of two and storage units">
        <P>
          Storage estimates are easier if you can move between bytes, KB, MB, GB,
          TB, and PB without pausing. Engineers often use powers of two while
          product estimates use round powers of ten. For back-of-the-envelope work,
          the rounded decimal values are usually close enough.
        </P>
        <StatGrid
          stats={[
            { value: "1 KB", label: "~1 thousand bytes" },
            { value: "1 MB", label: "~1 million bytes" },
            { value: "1 GB", label: "~1 billion bytes" },
            { value: "1 TB", label: "~1 trillion bytes" },
            { value: "1 PB", label: "~1 quadrillion bytes" },
            { value: "1 KB × 1M", label: "~1 GB" },
            { value: "1 KB × 1B", label: "~1 TB" },
            { value: "1 MB × 1M", label: "~1 TB" },
          ]}
        />
        <CodeBlock label="fast unit conversions">{`1 KiB = 1,024 bytes          ≈ 1 KB
1 MiB = 1,024 KiB            ≈ 1 MB
1 GiB = 1,024 MiB            ≈ 1 GB
1 TiB = 1,024 GiB            ≈ 1 TB

Back-of-envelope shortcuts:
  1 KB * 1 million items  ≈ 1 GB
  1 KB * 1 billion items  ≈ 1 TB
  1 MB * 1 million items  ≈ 1 TB
  1 MB * 1 billion items  ≈ 1 PB`}</CodeBlock>
        <P>
          The exact binary values matter for billing and filesystem limits. The
          rounded values matter for fast reasoning: if every message is 1 KB and
          you store 1 billion messages, you are in terabyte territory before
          replication, indexes, or backups.
        </P>
      </LessonSection>

      <LessonSection id="traffic" title="Traffic anchors: QPS from daily volume">
        <P>
          Most capacity chains start with daily active users and actions per day.
          Convert daily actions into average QPS by dividing by 86,400 seconds per
          day. Then multiply by a peak factor because real traffic is not flat.
        </P>
        <StatGrid
          stats={[
            { value: "86,400", label: "Seconds in one day" },
            { value: "~12 QPS", label: "1M requests/day" },
            { value: "~120 QPS", label: "10M requests/day" },
            { value: "~1.2K QPS", label: "100M requests/day" },
            { value: "~11.6K QPS", label: "1B requests/day" },
            { value: "3×", label: "Steady enterprise peak factor" },
            { value: "5×", label: "Consumer/social peak factor" },
            { value: "10×+", label: "Launches, sports, drops, flash sales" },
          ]}
        />
        <UL>
          <LI>
            <Term>Average QPS:</Term> total daily actions divided by 86,400.
          </LI>
          <LI>
            <Term>Peak QPS:</Term> average QPS multiplied by a peak factor. Design
            for peak unless the workload can queue safely.
          </LI>
          <LI>
            <Term>Read/write split:</Term> many products have far more reads than
            writes. Estimate them separately when cache, database, and fanout
            requirements differ.
          </LI>
        </UL>
        <Callout type="tip" title="Round 86,400 to 100,000 for first-pass math">
          Dividing by 100,000 makes mental math easy and is within about 15% of the
          exact answer. Refine later after the architecture shape is clear.
        </Callout>
      </LessonSection>

      <LessonSection id="throughput" title="Rough single-node throughput anchors">
        <P>
          Per-node throughput depends on hardware, payload size, indexes,
          replication, consistency, and code quality. These numbers are not
          promises; they are sanity checks. If your estimate requires one database
          node to handle 2 million complex writes per second, something is wrong.
        </P>
        <StatGrid
          stats={[
            { value: "1K-10K QPS", label: "Typical app server per node for nontrivial APIs" },
            { value: "10K-100K QPS", label: "Simple cached reads per service node" },
            { value: "1K-10K writes/s", label: "Single relational DB primary, workload dependent" },
            { value: "10K-100K ops/s", label: "Redis node for small simple commands" },
            { value: "10-100 MB/s", label: "Kafka partition order-of-magnitude throughput" },
            { value: "100-500 MB/s", label: "Modern SSD sequential throughput per device" },
            { value: "1-10 Gbps", label: "Common server NIC capacity range" },
            { value: "50-200 MB/s", label: "Sustained object upload/download per busy client or worker" },
          ]}
        />
        <P>
          The point is to divide peak load by plausible capacity. If you need 600K
          peak API QPS and one app node safely handles 5K QPS with headroom, you
          are in the neighborhood of 120 app nodes before redundancy and regional
          distribution.
        </P>
      </LessonSection>

      <LessonSection id="objects" title="Typical object sizes and hidden multipliers">
        <P>
          Object size estimates drive storage, bandwidth, cache, and database
          design. Include metadata, indexes, replication, compression, retention,
          and fanout copies. The user-visible payload is rarely the whole cost.
        </P>
        <StatGrid
          stats={[
            { value: "100 B", label: "Tiny event metadata or counter update" },
            { value: "1 KB", label: "Chat message, notification, small JSON row" },
            { value: "10 KB", label: "Rich post, comment thread item, log line with context" },
            { value: "100 KB", label: "Thumbnail or small document" },
            { value: "1-5 MB", label: "Phone photo after compression" },
            { value: "10-100 MB", label: "Short video clip" },
            { value: "2-4×", label: "Common overhead after indexes, replicas, backups" },
            { value: "3×", label: "Typical replication factor for durable storage" },
          ]}
        />
        <H3>Hidden multipliers to remember</H3>
        <UL>
          <LI>
            <Term>Replication:</Term> three copies turn 100 TB of logical data into
            roughly 300 TB of raw storage.
          </LI>
          <LI>
            <Term>Indexes:</Term> secondary indexes can be as large as, or larger
            than, the base data for write-heavy tables.
          </LI>
          <LI>
            <Term>Retention:</Term> 7 days vs. 365 days changes storage by 52×.
          </LI>
          <LI>
            <Term>Fanout:</Term> a single post may be stored once in the origin
            table but referenced or copied into millions of timelines.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="using" title="How to use these numbers in a design">
        <P>
          Start with the memorized anchors, then run the{" "}
          <XLink href="/learn/pattern-capacity-chain">capacity chain</XLink>:
          users → actions → QPS → storage → bandwidth → node count. The goal is
          not to be perfectly correct; it is to expose which part of the system is
          large enough to shape the architecture.
        </P>
        <UL>
          <LI>
            At 100 QPS, architecture is dominated by correctness and simplicity.
          </LI>
          <LI>
            At 100K QPS, caches, load balancing, partitioning, and observability
            become central.
          </LI>
          <LI>
            At petabytes, retention, compaction, lifecycle policies, and storage
            tiering become product features, not cleanup details.
          </LI>
        </UL>
        <Callout type="warning" title="Numbers are ranges, not laws">
          Real benchmarks beat memorized numbers. Use these anchors to pick a
          plausible design, then validate hot paths with load tests, production
          telemetry, and vendor limits.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Latency anchors: memory is nanoseconds, local networks are microseconds to milliseconds, disks are milliseconds, and cross-region calls are tens to hundreds of milliseconds.",
          "Traffic anchors: divide daily actions by 86,400; 1M/day is about 12 QPS and 1B/day is about 11.6K QPS.",
          "Storage anchors: 1 KB times 1M items is about 1 GB; 1 KB times 1B items is about 1 TB before replicas and indexes.",
          "Peak factors matter: use roughly 3× for steady enterprise, 5× for consumer/social, and higher for launches or flash events.",
          "Single-node throughput numbers are sanity checks; divide peak load by conservative per-node capacity and leave headroom.",
        ]}
      />

      <CheckYourself question="Why is a cross-region service call dangerous in a 100 ms latency budget?">
        A cross-region round trip can be tens to hundreds of milliseconds by
        itself. If it sits on the critical path, it can consume the whole budget
        before database queries, application work, or retries happen.
      </CheckYourself>

      <CheckYourself question="Roughly how much logical storage is 1 billion 1 KB messages before replication?">
        About 1 TB. The shortcut is 1 KB × 1B ≈ 1 TB. With three-way replication,
        indexes, and backups, the raw footprint can be several TB.
      </CheckYourself>

      <CheckYourself question="Why estimate peak QPS instead of designing only for average QPS?">
        Traffic is not flat. Users arrive during daily peaks, launches, and events.
        A system sized only for average load may fail exactly when the most users
        are present.
      </CheckYourself>
    </Prose>
  );
}
