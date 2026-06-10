import {
  Prose,
  LessonSection,
  H3,
  P,
  Term,
  UL,
  LI,
  Callout,
  Analogy,
  KeyTakeaways,
  CheckYourself,
  CodeBlock,
  CompareTable,
  StatGrid,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Latency</Term> and <Term>throughput</Term> are the two most common
        performance words in system design, but they measure different things.
        Latency is how long one operation takes. Throughput is how many
        operations the system completes per unit of time. Confusing them leads to
        designs that scale the wrong bottleneck.
      </P>

      <Analogy>
        Think of a highway. Latency is the time one car takes to drive from one
        city to another. Throughput is how many cars pass a checkpoint each
        minute. Adding lanes can let more cars through without making the road
        shorter. Clearing an accident can reduce one car&apos;s trip time without
        adding any new lanes.
      </Analogy>

      <LessonSection id="problem" title="The problem: performance has two axes">
        <P>
          A system can be slow for one user, overloaded for all users, or both.
          Latency tells you about the experience of an individual request.
          Throughput tells you about the system&apos;s total work rate. If you only
          measure one, you can make the wrong fix.
        </P>
        <CodeBlock label="two different failure modes">{`low throughput problem:
incoming requests: 20,000 RPS
service capacity:   5,000 RPS
result: queue grows, timeouts rise, latency gets worse because work waits

high latency problem:
incoming requests: 100 RPS
service capacity:  5,000 RPS
one request path:  browser → API → DB → remote API → API → browser
result: each request waits on slow dependencies even though the fleet is idle`}</CodeBlock>
        <CompareTable
          headers={["Metric", "Measures", "Common units", "User question"]}
          rows={[
            ["Latency", "Duration of one operation", "ms, seconds, microseconds", "How long did my request take?"],
            ["Throughput", "Completed work per time", "RPS, QPS, MB/s, messages/sec", "How many requests can the system handle?"],
          ]}
        />
        <Callout type="key" title="Precise definitions">
          <Term>Latency</Term> is a time interval: request start to response end,
          or write start to durable commit. <Term>Throughput</Term> is a rate:
          completed operations divided by elapsed time. One is measured in time;
          the other is measured in work per time.
        </Callout>
      </LessonSection>

      <LessonSection id="independent" title="Why latency and throughput are independent">
        <P>
          They are related in overloaded systems, but they are not the same knob.
          You can raise throughput by doing more work in parallel while the
          latency of each unit stays unchanged. You can lower latency by removing
          hops while maximum throughput stays unchanged.
        </P>
        <CodeBlock label="same latency, higher throughput">{`one worker:
  each request takes 100 ms
  max throughput ≈ 10 requests/sec

ten identical workers:
  each request still takes 100 ms
  max throughput ≈ 100 requests/sec

The trip did not get shorter. More trips happen at once.`}</CodeBlock>
        <H3>Real system examples</H3>
        <UL>
          <LI>
            <Term>Video transcoding:</Term> a batch pipeline may process millions
            of videos per day while one video still takes minutes. High
            throughput, high latency.
          </LI>
          <LI>
            <Term>High-frequency trading:</Term> a service may optimize a single
            decision path to microseconds even if total request volume is modest.
            Low latency is the product.
          </LI>
          <LI>
            <Term>CDNs such as Cloudflare or Akamai:</Term> caching content near
            users lowers latency. Their global fleet also raises aggregate
            throughput, but those are separate benefits.
          </LI>
        </UL>
        <Callout type="warning" title="Queueing links the two under overload">
          When arrival rate approaches service capacity, requests wait in a queue.
          The actual work may still take 20 ms, but waiting 800 ms before work
          begins makes observed latency 820 ms. This is why an overloaded system
          often shows both low throughput headroom and terrible latency.
        </Callout>
      </LessonSection>

      <LessonSection id="percentiles" title="Percentiles: p50, p95, p99, and the tail">
        <P>
          Average latency hides pain. Users do not experience averages; each user
          experiences one request at a time. <Term>Percentiles</Term> tell you how
          latency is distributed across requests.
        </P>
        <CompareTable
          headers={["Percentile", "Meaning", "Why it matters"]}
          rows={[
            ["p50", "50% of requests are faster than this", "Typical experience; useful for baseline health"],
            ["p95", "95% are faster; 5% are slower", "Good product SLO for interactive APIs"],
            ["p99", "99% are faster; 1% are slower", "Captures tail pain at scale"],
            ["p99.9", "Only 0.1% are slower", "Important for huge systems where rare events happen constantly"],
          ]}
        />
        <CodeBlock label="why averages lie">{`latencies for 10 requests:
10 ms, 10 ms, 11 ms, 12 ms, 12 ms, 13 ms, 14 ms, 15 ms, 16 ms, 2000 ms

average ≈ 210 ms
p50     ≈ 12 ms
p90     ≈ 2000 ms in this tiny sample

The average is not the typical user, and it does not describe the worst pain well.`}</CodeBlock>
        <P>
          Tail latency dominates user experience because modern pages and mobile
          screens often fan out to many backend calls. If a page needs 50 calls,
          one slow dependency can make the whole page slow.
        </P>
        <CodeBlock label="tail latency compounds across fanout">{`If each backend call has a 1% chance of being slow:

single call slow chance:       1%
50 independent calls:
  chance at least one is slow = 1 - 0.99^50
                              ≈ 39.5%

At fanout, rare slow calls become a common user-visible event.`}</CodeBlock>
      </LessonSection>

      <LessonSection id="little-law" title="Little's Law: connecting concurrency, throughput, and latency">
        <P>
          <Term>Little&apos;s Law</Term> is a small formula with enormous design
          value. In a stable system, the average number of in-flight items equals
          arrival rate multiplied by average time in the system.
        </P>
        <CodeBlock label="Little's Law">{`L = λ × W

L = average number of requests in the system
λ = arrival/completion rate (requests per second) in a stable system
W = average time each request spends in the system (seconds)

Example:
λ = 2,000 RPS
W = 0.150 seconds
L = 2,000 × 0.150 = 300 in-flight requests`}</CodeBlock>
        <P>
          This tells you how much concurrency you need. If your service handles
          2,000 RPS and each request takes 150 ms, you should expect about 300
          concurrent requests in flight even before spikes. If p99 latency jumps
          to 2 seconds, in-flight work can explode.
        </P>
        <Callout type="tip" title="Use it for quick sanity checks">
          If someone claims a single-threaded service can handle 10,000 RPS while
          each request takes 50 ms of blocking work, Little&apos;s Law should make
          you suspicious. 10,000 × 0.050 means 500 requests need to be in progress.
        </Callout>
      </LessonSection>

      <LessonSection id="batching" title="Batching: trading latency for throughput">
        <P>
          <Term>Batching</Term> groups many small operations into one larger
          operation. It often increases throughput because fixed overhead is paid
          once per batch instead of once per item. The cost is latency: the first
          item in a batch waits for more items to arrive or for a timer to fire.
        </P>
        <CodeBlock label="batching trade-off">{`without batching:
  1 message → 1 network call
  overhead paid 1,000 times for 1,000 messages
  low waiting latency, lower throughput

with batching:
  collect up to 100 messages or wait up to 50 ms
  100 messages → 1 network call
  overhead paid 10 times for 1,000 messages
  higher throughput, but first message may wait 50 ms`}</CodeBlock>
        <CompareTable
          headers={["Technique", "Latency effect", "Throughput effect", "Used by"]}
          rows={[
            ["Small batches", "Adds a bounded wait", "Better CPU/network efficiency", "Kafka producers, database bulk inserts"],
            ["Large batches", "Can add visible delay", "Very high throughput", "Analytics ETL, log compaction"],
            ["No batching", "Lowest wait per item", "More overhead per item", "Interactive payments, login requests"],
          ]}
        />
        <P>
          Kafka, Kinesis, SQS consumers, database bulk loaders, GPU inference
          servers, and analytics systems all use batching. It is a great fit when
          throughput matters more than the latency of any single item.
        </P>
      </LessonSection>

      <LessonSection id="numbers" title="Real latency numbers and gotchas">
        <P>
          You do not need to memorize every number, but you should know orders of
          magnitude. They help you spot impossible designs.
        </P>
        <StatGrid
          stats={[
            { value: "~0.1 ms", label: "read 1 MB sequentially from memory" },
            { value: "~0.5-1 ms", label: "same-zone network round trip" },
            { value: "~1-5 ms", label: "SSD random read, depending on device and queueing" },
            { value: "~20-80 ms", label: "cross-country network round trip" },
            { value: "~100-200 ms", label: "intercontinental network round trip" },
            { value: "seconds", label: "cold starts, overloaded queues, retries, or slow third-party APIs" },
          ]}
        />
        <UL>
          <LI>
            <Term>Coordinated omission:</Term> a benchmark that sends the next
            request only after the previous response can hide queueing latency.
          </LI>
          <LI>
            <Term>Warm vs cold paths:</Term> cache hits, JIT warmup, open
            database connections, and TLS session reuse can make demos faster
            than real cold requests.
          </LI>
          <LI>
            <Term>Retries inflate tails:</Term> retries improve success rate but
            can make p99 latency much worse unless bounded by timeouts and
            deadlines.
          </LI>
          <LI>
            <Term>Bandwidth is not latency:</Term> a 10 Gbps link can move many
            bytes per second, but it cannot make light cross an ocean instantly.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Latency is the time for one operation; throughput is completed work per unit time.",
          "They are independent axes until overload creates queueing, which makes latency spike.",
          "Use p50, p95, and p99 instead of averages because tail latency is what users feel at scale.",
          "Little's Law, L = λ × W, connects in-flight concurrency, throughput, and response time.",
          "Batching often raises throughput by amortizing overhead, but it adds waiting latency.",
        ]}
      />

      <CheckYourself question="Does adding more servers always make one request faster?">
        No. More servers usually raise throughput by handling more requests in
        parallel. A single request still performs the same work unless the added
        servers remove queueing or allow the request itself to be parallelized.
      </CheckYourself>

      <CheckYourself question="Why can p99 matter more than average latency?">
        At scale, rare slow requests happen constantly, and user journeys often
        require many backend calls. One slow call can make an entire page or
        transaction feel slow, even when the average looks healthy.
      </CheckYourself>

      <CheckYourself question="What does batching trade away?">
        Batching trades latency for throughput. Items wait for a batch to fill or
        a timer to fire, but the system pays fixed overhead fewer times and can
        process more total work per second.
      </CheckYourself>
    </Prose>
  );
}
