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
  KeyTakeaways,
  CheckYourself,
  CodeBlock,
  CompareTable,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>System design</Term> is the discipline of turning a product goal
        into a working arrangement of services, databases, caches, queues, APIs,
        background jobs, networks, and operational practices. It asks: what must
        the system do, how much load must it survive, what can fail, and which
        trade-offs are acceptable for this product?
      </P>

      <Analogy>
        Writing application code is like designing one room in a building.
        System design is planning the whole airport: where passengers enter, how
        baggage moves, what happens when a security lane closes, how emergency
        exits work, and how the airport expands without shutting down. A beautiful
        room does not matter if the whole building cannot move people safely.
      </Analogy>

      <LessonSection id="problem" title="The problem: software leaves one machine">
        <P>
          Small programs are often easy to reason about because everything happens
          in one process and one database. Real products outgrow that shape. Users
          arrive from many regions, traffic spikes without warning, machines die,
          data gets large, and teams need to change parts of the system
          independently. System design gives you a vocabulary and a process for
          making those choices deliberately instead of by accident.
        </P>
        <CodeBlock label="the simple shape breaks at scale">{`prototype:
browser ──▶ web app ──▶ database

what changes in production:
- 10 users become 10 million users
- one server becomes a fleet
- one database becomes replicas, shards, indexes, caches, backups
- one happy path becomes retries, timeouts, deploys, outages, and abuse`}</CodeBlock>
        <P>The failure mode is not usually that engineers know too little tech.</P>
        <UL>
          <LI>
            They jump to components: <code>Redis</code>, Kafka, Kubernetes,
            DynamoDB, Elasticsearch.
          </LI>
          <LI>
            They skip the question those components are supposed to answer:
            latency, throughput, durability, cost, correctness, or operability.
          </LI>
          <LI>
            They produce a diagram that looks sophisticated but does not solve
            the actual product problem.
          </LI>
        </UL>
        <Callout type="warning" title="The naive failure mode">
          A beginner hears &quot;design Twitter&quot; and immediately draws a load
          balancer, app servers, a cache, a queue, and a database. A staff-level
          engineer first asks what version of Twitter we are designing: posting
          tweets, home timeline, search, DMs, media upload, ads, or all of them?
          The right architecture depends on the scope.
        </Callout>
      </LessonSection>

      <LessonSection id="requirements" title="Functional vs non-functional requirements">
        <P>
          Every design starts with requirements. <Term>Functional requirements</Term>{" "}
          describe what users can do. <Term>Non-functional requirements</Term>{" "}
          describe how well the system must do it. The second category is where
          most system design decisions come from.
        </P>
        <CompareTable
          headers={["Requirement type", "Question it answers", "Examples", "Design impact"]}
          rows={[
            [
              "Functional",
              "What behavior must exist?",
              "Users can create posts, follow accounts, upload images, search messages",
              "Defines APIs, data model, workflows, and product scope",
            ],
            [
              "Non-functional",
              "How well must it behave?",
              "p95 latency < 200 ms, 99.99% availability, durable uploads, 100K writes/sec",
              "Defines scaling, replication, caching, partitioning, failover, and cost",
            ],
          ]}
        />
        <H3>Why the distinction matters</H3>
        <P>
          Suppose the feature is &quot;users can post photos.&quot; That is not
          enough to design the system. A family photo app, Instagram, and a
          medical imaging archive all accept photo uploads, but they need very
          different durability, privacy, moderation, latency, and storage-cost
          choices.
        </P>
        <CodeBlock label="same feature, different non-functional targets">{`Feature:
  upload and view photos

Consumer social app:
  p95 image view < 200 ms
  tolerate delayed counters
  optimize for CDN cache hit rate and cheap storage

Medical imaging archive:
  strong audit trail
  strict access control
  long retention
  correctness and compliance outrank feed latency`}</CodeBlock>
        <P>
          You will often use <XLink href="/learn/capacity-estimation">capacity
          estimation</XLink> to turn vague words like &quot;large scale&quot; into
          numbers, and ideas like the <XLink href="/learn/cap-theorem">CAP
          theorem</XLink> to explain what happens when replicas and networks
          disagree.
        </P>
      </LessonSection>

      <LessonSection id="tradeoffs" title="The trade-off mindset: there is no perfect design">
        <P>
          System design is not a hunt for the perfect diagram. It is a sequence
          of explicit trade-offs. Every mechanism buys one property by spending
          another. Caches reduce read latency but introduce staleness and
          invalidation. Replication improves read capacity and availability but
          creates consistency questions. Sharding raises write capacity but makes
          queries and resharding harder.
        </P>
        <CompareTable
          headers={["Choice", "What it buys", "What it costs"]}
          rows={[
            ["Cache hot data", "Lower read latency and database load", "Stale reads, invalidation bugs, extra memory"],
            ["Replicate data", "Higher availability and read scale", "Replication lag, failover complexity, split-brain risk"],
            ["Shard a database", "Higher write/storage capacity", "Cross-shard queries, hotspots, migration complexity"],
            ["Use a queue", "Absorb bursts and decouple services", "Eventual processing, retries, duplicate handling"],
            ["Use strong consistency", "Simpler correctness model", "More coordination, higher latency, lower partition availability"],
          ]}
        />
        <Callout type="key" title="Strong answers name the trade-off">
          &quot;I will add Redis&quot; is a component choice. &quot;I will cache
          celebrity profile pages for 60 seconds to reduce database reads,
          accepting brief staleness because profile edits are rare&quot; is system
          design reasoning.
        </Callout>
        <P>
          Real systems show this clearly. Amazon DynamoDB lets teams tune
          capacity, indexes, and consistency per access pattern. Cassandra favors
          write availability and tunable consistency. PostgreSQL favors a strong,
          relational model and can scale surprisingly far before you need more
          exotic machinery. The right answer depends on what you promised users.
        </P>
      </LessonSection>

      <LessonSection id="framework" title="A practical design framework">
        <P>
          A design conversation is easier when you follow a repeatable path. You
          do not have to be robotic, but you should avoid wandering. Start broad,
          choose assumptions, sketch the system, then spend depth where risk is
          highest.
        </P>
        <CodeBlock label="system design interview flow">{`1. Clarify requirements
   - users, core features, out-of-scope features
   - latency, availability, consistency, durability, security

2. Back-of-the-envelope estimate
   - daily active users, requests/sec, read/write ratio
   - storage growth, bandwidth, peak traffic

3. API design
   - request/response shape and idempotency
   - pagination, auth, rate limits

4. Data model
   - entities, indexes, access patterns, retention

5. High-level architecture
   - clients, load balancers, services, stores, caches, queues

6. Deep dive
   - scale the bottleneck: feed fanout, search, upload path, hot keys

7. Identify bottlenecks and mitigations
   - failure modes, observability, backpressure, retries, capacity limits`}</CodeBlock>
        <H3>How this sounds in an interview</H3>
        <UL>
          <LI>
            <Term>Clarify:</Term> Are we designing only posting and reading
            tweets, or also search, ads, DMs, and media?
          </LI>
          <LI>
            <Term>Estimate:</Term> If we have 100 million daily active users and
            each reads 100 posts per day, reads dominate writes.
          </LI>
          <LI>
            <Term>API:</Term> Define <code>POST /posts</code> and{" "}
            <code>GET /timeline</code> before choosing storage.
          </LI>
          <LI>
            <Term>Data model:</Term> Store posts by author and timeline entries
            by viewer because those are different access patterns.
          </LI>
          <LI>
            <Term>Deep dive:</Term> Discuss fanout-on-write vs fanout-on-read
            because the home timeline is likely the bottleneck.
          </LI>
        </UL>
        <Callout type="tip" title="Do breadth before depth">
          If you spend 25 minutes perfecting the API before estimating traffic,
          you may never discover that the real challenge is 10 million timeline
          reads per second. First map the terrain, then dig where the system is
          most likely to break.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <P>
          Good system design includes the messy edges, not just the happy-path
          boxes. These are the places production systems usually fail.
        </P>
        <UL>
          <LI>
            <Term>Scope creep:</Term> a prompt like &quot;design YouTube&quot; is
            too large. Pick the core user journey and explicitly defer the rest.
          </LI>
          <LI>
            <Term>Single points of failure:</Term> one database, one region, one
            queue, or one deployment pipeline can take down the whole system.
          </LI>
          <LI>
            <Term>Hotspots:</Term> one viral post, one celebrity account, or one
            partition key can overload an otherwise scalable design.
          </LI>
          <LI>
            <Term>Retries without idempotency:</Term> retrying payments, orders,
            or message sends can duplicate side effects unless the API is
            designed for safe repetition.
          </LI>
          <LI>
            <Term>Ignoring operations:</Term> backups, dashboards, alerts, deploy
            safety, and on-call runbooks are part of the system, not an afterthought.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "System design arranges many components to meet product goals under load, failure, growth, and operational constraints.",
          "Functional requirements say what the system does; non-functional requirements say how well it must do it.",
          "There is no perfect design: every cache, replica, queue, index, and shard buys one property while costing another.",
          "A strong design flow is clarify requirements → estimate capacity → define APIs → model data → draw architecture → deep dive → find bottlenecks.",
          "The biggest beginner mistake is jumping to components before clarifying scope, scale, correctness, and failure expectations.",
        ]}
      />

      <CheckYourself question="Why is it dangerous to start by drawing components?">
        Because components are answers to requirements. Without scope and
        non-functional targets, you do not know whether you need a cache, a queue,
        a strongly consistent database, or a globally replicated store. The
        diagram may look impressive while solving the wrong problem.
      </CheckYourself>

      <CheckYourself question="What is the difference between functional and non-functional requirements?">
        Functional requirements describe user-visible behavior, such as posting a
        message or uploading an image. Non-functional requirements describe
        quality targets, such as latency, availability, durability, scale,
        privacy, and cost.
      </CheckYourself>

      <CheckYourself question="Why should an engineer say the trade-off out loud?">
        It proves the choice is intentional. Saying the trade-off explains what
        the design gains, what it gives up, and why that is acceptable for this
        product instead of being copied from another architecture.
      </CheckYourself>
    </Prose>
  );
}
