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
        <Term>Database replication</Term> means keeping copies of the same data on
        multiple machines. You replicate to survive machine failure, place data
        closer to readers, and spread read traffic across many servers. The hard
        part is not copying bytes once; it is keeping copies close enough to correct
        while the system is accepting new writes, losing networks, and promoting new
        leaders.
      </P>

      <Analogy>
        Think of a newspaper office. One editor approves the front page, then many
        printing presses produce copies for different neighborhoods. More presses
        make delivery faster and protect against one broken press, but a late
        correction creates a race: some neighborhoods may briefly receive the older
        edition.
      </Analogy>

      <LessonSection id="why" title="The problem replication solves: read scale and high availability">
        <P>
          A single database primary is a fragile bottleneck. If it dies, the product
          goes dark. If all reads hit it, a dashboard or search page can steal CPU
          from checkout writes. Replicas create redundancy and move read work away
          from the write leader.
        </P>
        <CodeBlock label="classic primary plus read replicas">{`            writes
app ─────────────────────▶ primary
                              │
                              │ replication stream
                              ▼
                     ┌────────┴────────┐
                     ▼                 ▼
                 replica A         replica B
                   reads             reads`}</CodeBlock>
        <UL>
          <LI>
            <Term>Read scale:</Term> route expensive or high-volume reads to
            replicas so the primary can focus on writes and transactions.
          </LI>
          <LI>
            <Term>High availability:</Term> if the primary fails, promote a healthy
            replica and keep serving traffic.
          </LI>
          <LI>
            <Term>Geo-locality:</Term> place replicas near users or analytics jobs
            to reduce latency and isolate workloads.
          </LI>
        </UL>
        <Callout type="info" title="Related pattern">
          This lesson explains the general mechanics. The concrete read-scaling
          architecture appears in <XLink href="/learn/pattern-relational-db-replicas">relational database replicas</XLink>,
          and the user-visible guarantees connect to
          <XLink href="/learn/consistency-models"> consistency models</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="topologies" title="Replication topologies: single-leader, multi-leader, and leaderless">
        <P>
          The topology answers one question: where are writes allowed to go? That
          choice controls write latency, conflict handling, and failover complexity.
        </P>
        <CompareTable
          headers={["Topology", "Write path", "Best for", "Main danger"]}
          rows={[
            [
              "Single-leader",
              "All writes go to one primary; replicas copy it",
              "Most OLTP apps, Postgres/MySQL read replicas, simple correctness",
              "Leader is the write bottleneck and failover target",
            ],
            [
              "Multi-leader",
              "Multiple leaders accept writes and replicate to each other",
              "Multi-region apps where local writes matter",
              "Conflicting writes to the same row must be detected and resolved",
            ],
            [
              "Leaderless",
              "Clients write/read from several replicas using quorums",
              "Dynamo-style stores, high availability under partitions",
              "Stale reads, read repair, and conflict resolution are part of the model",
            ],
          ]}
        />
        <H3>Single-leader is the common default</H3>
        <P>
          PostgreSQL, MySQL, and many managed databases usually run with one writer
          and several read replicas. It keeps conflict handling simple because writes
          have one serialization point. The price is that write throughput and write
          availability depend on that leader.
        </P>
        <H3>Multi-leader moves writes closer to users</H3>
        <P>
          If Europe and India both need low-latency writes, each region can accept
          local writes and replicate to the other. But if the same account is edited
          in both places during a network split, the database or application must
          merge or reject one version.
        </P>
        <H3>Leaderless uses quorums</H3>
        <P>
          Dynamo-style systems write to several replicas and consider the write
          successful after enough acknowledgements. Reads also ask multiple replicas
          and reconcile versions. This improves availability, but clients must be
          designed for stale or conflicting versions.
        </P>
      </LessonSection>

      <LessonSection id="sync-async" title="Synchronous vs asynchronous replication">
        <P>
          Replication can either be on the commit path or happen after commit. This
          is one of the most important latency-versus-safety trade-offs in database
          design.
        </P>
        <CompareTable
          headers={["Mode", "When commit returns", "Benefit", "Failure mode"]}
          rows={[
            [
              "Asynchronous",
              "After the leader commits locally",
              "Low write latency and high throughput",
              "If the leader dies before shipping the change, acknowledged writes can be lost",
            ],
            [
              "Synchronous",
              "After at least one replica confirms the write",
              "A promoted replica should contain committed writes",
              "Writes slow down or block when replicas are slow or unreachable",
            ],
            [
              "Semi-sync / quorum",
              "After a configured subset confirms",
              "Balances safety and latency",
              "Operationally more complex; still must define exact guarantees",
            ],
          ]}
        />
        <CodeBlock label="commit timeline">{`async:
  client -> primary: INSERT order
  primary fsyncs locally
  primary -> client: committed
  primary -> replica: ships change later

sync:
  client -> primary: INSERT order
  primary fsyncs locally
  primary -> replica: ship change
  replica -> primary: acknowledged
  primary -> client: committed`}</CodeBlock>
        <Callout type="tip" title="Common production compromise">
          Many teams use one synchronous replica in another availability zone for
          durability, plus additional asynchronous replicas for read scale and
          analytics. That gives a safer failover target without putting every copy on
          the critical path.
        </Callout>
      </LessonSection>

      <LessonSection id="lag-anomalies" title="Replication lag and read-your-writes anomalies">
        <P>
          <Term>Replication lag</Term> is the delay between a write committing on
          the leader and appearing on a replica. Under normal load it might be a few
          milliseconds. During a backup, network issue, long transaction, or replica
          restart, it can become seconds or minutes.
        </P>
        <CodeBlock label="read-your-writes bug">{`1. PATCH /profile          -> write goes to primary
2. HTTP 200 OK             -> user expects new name to be visible
3. GET /profile            -> load balancer sends read to a lagging replica
4. response contains old name`}</CodeBlock>
        <UL>
          <LI>
            <Term>Read-your-writes violation:</Term> a user does not see their own
            update immediately after saving.
          </LI>
          <LI>
            <Term>Monotonic read violation:</Term> a user sees version 10, refreshes,
            then hits a different replica and sees version 8.
          </LI>
          <LI>
            <Term>Stale authorization:</Term> a permission revocation is written to
            the leader but a replica still says the user has access.
          </LI>
        </UL>
        <Callout type="warning" title="Do not send every read to replicas blindly">
          Route post-write reads, security-sensitive reads, and strongly consistent
          workflows to the primary or to a replica that has caught up past the
          user&apos;s write position. Replica reads are a performance tool, not a free
          correctness guarantee.
        </Callout>
      </LessonSection>

      <LessonSection id="failover" title="Failover and leader promotion">
        <P>
          <Term>Failover</Term> is the process of detecting a dead leader, choosing
          the best replica, promoting it, and redirecting clients. It sounds simple,
          but it is where replication design meets real distributed systems pain.
        </P>
        <CodeBlock label="safe failover checklist">{`1. Detect primary failure with timeouts and health checks.
2. Fence the old primary so it cannot accept split-brain writes.
3. Pick the most up-to-date replica by log position / LSN.
4. Promote that replica to leader.
5. Reconfigure other replicas to follow the new leader.
6. Update DNS, proxy, or connection strings.
7. Audit possible data loss if replication was asynchronous.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Split brain:</Term> two nodes both believe they are leader and
            accept divergent writes. Fencing and consensus systems prevent this.
          </LI>
          <LI>
            <Term>Promotion lag:</Term> the most available replica may not be the
            most up-to-date replica. Choose based on recovery objectives.
          </LI>
          <LI>
            <Term>Client retry storms:</Term> reconnecting every application at
            once can overload the newly promoted leader.
          </LI>
        </UL>
        <Callout type="key" title="Failover is a product decision">
          Define RTO and RPO. <Term>RTO</Term> is how long the service may be down.
          <Term>RPO</Term> is how much acknowledged data you can lose. Synchronous
          replication lowers RPO but can increase latency and reduce availability.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanisms" title="Replication mechanisms: statement, WAL/physical, and logical">
        <P>
          Databases copy changes in different forms. The form matters because it
          determines compatibility, determinism, and what downstream systems can
          consume.
        </P>
        <CompareTable
          headers={["Mechanism", "What is copied", "Pros", "Cons"]}
          rows={[
            [
              "Statement-based",
              "SQL statements such as UPDATE users SET visits = visits + 1",
              "Compact and easy to understand",
              "Non-deterministic functions, triggers, and ordering can diverge",
            ],
            [
              "WAL / physical",
              "Low-level page or write-ahead-log changes",
              "Accurate byte-for-byte replicas; common for HA",
              "Usually same database version and storage format required",
            ],
            [
              "Logical",
              "Row-level changes such as table, primary key, before/after values",
              "Useful for CDC, selective replication, and upgrades",
              "More decoding overhead; schema changes must be handled carefully",
            ],
          ]}
        />
        <P>
          Physical replication is often the right choice for standby failover.
          Logical replication is often the right choice when other services need a
          stream of business changes, such as updating a search index or publishing
          events.
        </P>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Replication copies data for read scale, high availability, and locality, but every copy introduces consistency questions.",
          "Single-leader replication is simple and common; multi-leader and leaderless systems improve locality or availability at the cost of conflict handling.",
          "Asynchronous replication is fast but can lose recent acknowledged writes on failover; synchronous replication is safer but adds latency and can block writes.",
          "Replication lag causes read-your-writes, monotonic-read, and stale-authorization bugs unless reads are routed with consistency in mind.",
          "Failover requires leader detection, fencing, promotion, client redirection, and clear RTO/RPO expectations.",
        ]}
      />

      <CheckYourself question="Why do read replicas not solve write bottlenecks?">
        In a single-leader setup, every write still flows through the primary. The
        replicas copy the result and can serve reads, but they do not split the write
        workload. If the primary cannot handle write QPS, you need partitioning,
        batching, or a different write model.
      </CheckYourself>

      <CheckYourself question="What is the read-your-writes anomaly?">
        A user writes new data to the leader, then immediately reads from a lagging
        replica and sees the old value. Fix it by reading from the leader after a
        write, using session stickiness, or requiring a replica caught up to the
        user&apos;s last write position.
      </CheckYourself>

      <CheckYourself question="Why is split brain dangerous during failover?">
        If the old primary and new primary both accept writes, the database history
        forks. Reconciliation may require losing or manually merging committed user
        changes. Fencing the old leader before promotion prevents two leaders from
        being active at the same time.
      </CheckYourself>
    </Prose>
  );
}
