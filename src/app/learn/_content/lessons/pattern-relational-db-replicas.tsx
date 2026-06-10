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
        A <Term>relational primary with read replicas</Term> is the default shape
        for transactional systems that have one authoritative database but many
        read requests. The primary accepts every insert, update, and delete.
        Replicas continuously copy those changes and answer read-only traffic so
        the primary can stay focused on correctness-critical writes.
      </P>

      <Analogy>
        Think of the primary as the original whiteboard in a classroom and the
        replicas as live projectors in overflow rooms. The teacher writes only on
        the whiteboard. The projectors let hundreds of students read without
        crowding the front of the room, but each projector can be a few seconds
        behind what the teacher just wrote.
      </Analogy>

      <LessonSection id="problem" title="The problem: read load can drown the writer">
        <P>
          Relational databases are wonderful at enforcing invariants: foreign
          keys, uniqueness, transactions, and constraints. The catch is that the
          same primary that protects those invariants is also doing buffer-cache
          work, query planning, index lookups, sorting, and connection management
          for reads. A dashboard query or hot profile page can consume the CPU
          and I/O budget needed by checkout, posting, or account updates.
        </P>
        <CodeBlock label="single primary under mixed read/write pressure">{`clients
  ├─ POST /orders  ─┐
  ├─ PATCH /users  ─┼──▶ primary database
  ├─ GET /feed     ─┤       writes + reads + constraints + indexes
  └─ GET /profile  ─┘       one CPU / IOPS budget`}</CodeBlock>
        <P>
          Read replicas split that work. They do not make the database magically
          distributed for writes; every write still lands on the primary first.
          But they give you more machines that can answer repeatable, read-only
          questions such as product pages, timelines, reporting dashboards, and
          search filters backed by SQL.
        </P>
        <CompareTable
          headers={["Traffic pattern", "Replica benefit", "Why"]}
          rows={[
            ["Read-heavy app", "High", "Most GETs can leave the primary, freeing it for writes"],
            ["Write-heavy app", "Low", "Every write still commits on the same primary and then replicates"],
            ["Analytical dashboards", "Medium to high", "Long reads can run on a separate replica or reporting follower"],
            ["Strong read-after-write workflow", "Conditional", "You may need to read from primary for a short window"],
          ]}
        />
        <Callout type="key" title="The core idea">
          Scale reads by adding read-only copies. Keep writes serialized through
          one authoritative primary so relational constraints and transactions
          remain simple.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanics" title="How it works: primary writes, replicas replay changes">
        <P>
          In Postgres, MySQL, and similar systems, the primary records each
          committed change in a durable replication log. Replicas stream that log
          and replay it in the same order. The log is the source of truth for
          copying state, which is why replicas eventually converge on the same
          data as the primary.
        </P>
        <CodeBlock label="asynchronous read-replica flow">{`1. client sends UPDATE users SET plan = 'pro' WHERE id = 42
2. primary validates constraints and commits the transaction
3. primary appends the change to its replication log / WAL / binlog
4. replica streams the log entry over the network
5. replica replays the change into its local storage
6. later GET /users/42 can be served by that replica`}</CodeBlock>
        <H3>Asynchronous versus synchronous replication</H3>
        <CompareTable
          headers={["Mode", "Write latency", "Data-loss risk", "Typical use"]}
          rows={[
            ["Async replica", "Low", "A tiny window if primary dies before replica catches up", "Most read scaling"],
            ["Sync replica", "Higher", "Lower because commit waits for another node", "Critical HA pairs"],
            ["Semi-sync", "Middle", "Reduced but not eliminated", "Managed database defaults in some setups"],
          ]}
        />
        <P>
          Many production systems combine these: one synchronous standby for
          high availability and several asynchronous read replicas for scale.
          The important mental model is that a replica is not an independent
          writer. It is a follower replaying the primary&apos;s history.
        </P>
        <Callout type="info" title="Related concept">
          The mechanics are a concrete instance of{" "}
          <XLink href="/learn/database-replication">database replication</XLink>.
          The user-facing behavior is governed by{" "}
          <XLink href="/learn/consistency-models">consistency models</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="routing" title="Connection routing: separate read and write pools">
        <P>
          Applications usually expose two database paths: a writer pool that only
          connects to the primary, and a reader pool that load-balances across
          replicas. This can be explicit in code, hidden behind an ORM, or handled
          by a proxy such as PgBouncer, ProxySQL, RDS endpoints, or a service mesh.
        </P>
        <CodeBlock label="simple read/write routing policy">{`function dbFor(request) {
  if (request.method !== 'GET') return writerPool;      // mutations go primary
  if (request.needsFreshData) return writerPool;        // read-your-writes path
  return readerPool.pickLeastLoadedReplica();           // ordinary reads
}`}</CodeBlock>
        <UL>
          <LI>
            <Term>Writer pool:</Term> used for transactions, locks, uniqueness
            checks, and any read that must observe the latest committed write.
          </LI>
          <LI>
            <Term>Reader pool:</Term> used for idempotent pages, feed browsing,
            analytics, exports, and other reads that tolerate slight staleness.
          </LI>
          <LI>
            <Term>Health-aware routing:</Term> a replica with high lag or failed
            replication should be removed from the read pool until it catches up.
          </LI>
        </UL>
        <Callout type="warning" title="Do not accidentally write to a replica">
          Make replica credentials read-only, fail fast on write SQL, and keep
          migration jobs pinned to the primary. A routing bug should produce a
          loud error, not a silent split-brain incident.
        </Callout>
      </LessonSection>

      <LessonSection id="lag" title="Replica lag and the read-your-writes problem">
        <P>
          Replication is often asynchronous, so a user can write successfully and
          then immediately read from a replica that has not replayed that write
          yet. This is the classic <Term>read-your-writes</Term> failure mode:
          the system accepted the change, but the user interface appears to deny
          it happened.
        </P>
        <CodeBlock label="stale read caused by lag">{`T+000ms  POST /posts          → primary commits post_id=900
T+020ms  response returns 201
T+050ms  GET /me/posts        → routed to replica A
T+051ms  replica A last replayed T-2s, so post_id=900 is missing
T+300ms  replica A catches up; refresh now shows the post`}</CodeBlock>
        <H3>Mitigations</H3>
        <CompareTable
          headers={["Technique", "How it works", "Trade-off"]}
          rows={[
            ["Read from primary after write", "Mark the next few reads as fresh and send them to the writer", "Adds primary read load"],
            ["Sticky routing", "Keep the user/session on primary or one caught-up replica for a short TTL", "Requires session metadata"],
            ["Version checks", "Send last-seen commit timestamp or LSN and choose a replica that has reached it", "More plumbing, best correctness"],
            ["UI optimism", "Render the submitted item locally while replicas catch up", "Must reconcile failures carefully"],
          ]}
        />
        <P>
          The simplest production rule is to set a short freshness window after a
          mutation. For example, after a profile update, store{" "}
          <code>{"fresh_until = now() + 5s"}</code> in the request context or
          session and route that user&apos;s reads to the primary until the window
          expires. Larger systems route by replication position: the primary
          returns a commit LSN, and the router only selects replicas that have
          replayed at least that LSN.
        </P>
      </LessonSection>

      <LessonSection id="failover" title="Failover: promotion changes who the primary is">
        <P>
          Replicas are also your escape hatch when the primary dies. A failover
          controller detects that the primary is unhealthy, chooses the best
          caught-up replica, promotes it, and moves the writer endpoint to the new
          primary. Clients reconnect and continue writing to the promoted node.
        </P>
        <CodeBlock label="promotion during primary failure">{`before: app writer endpoint ─▶ primary P
        replicas R1, R2 stream from P

failure: P stops accepting writes

failover:
  1. fence P so it cannot come back as a second writer
  2. choose R1 because it has the least replication lag
  3. promote R1 to primary
  4. repoint writer endpoint to R1
  5. rebuild P as a replica after repair`}</CodeBlock>
        <UL>
          <LI>
            <Term>Fencing matters:</Term> the old primary must be prevented from
            accepting writes after a network partition, otherwise you risk two
            primaries diverging.
          </LI>
          <LI>
            <Term>Lag matters:</Term> promoting a lagging replica can lose the
            last acknowledged async writes. Synchronous standbys reduce that
            window at the cost of slower writes.
          </LI>
          <LI>
            <Term>Connection draining matters:</Term> application pools cache old
            connections. Set sensible timeouts and retry transactions that fail
            during promotion.
          </LI>
        </UL>
        <Callout type="tip" title="Managed databases help but do not remove design work">
          RDS, Cloud SQL, AlloyDB, and similar products provide stable endpoints
          and automated promotion. You still need idempotent writes, retry-safe
          transactions, read/write routing, and dashboards for replica lag.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Trade-offs, gotchas, and real-world examples">
        <UL>
          <LI>
            <Term>Replicas help reads, not writes:</Term> a social app with 95%
            timeline reads can benefit enormously. A payment ledger with mostly
            inserts and balance updates probably needs schema/index tuning,
            batching, or sharding instead.
          </LI>
          <LI>
            <Term>Long replica queries can create lag:</Term> heavy exports and
            dashboards may delay replay or compete for disk. Use a dedicated
            reporting replica when business intelligence jobs are noisy.
          </LI>
          <LI>
            <Term>Schema changes replicate too:</Term> migrations must be designed
            for rolling deploys. A destructive migration can break readers on
            replicas just as surely as it breaks the primary.
          </LI>
          <LI>
            <Term>Replica reads are still database reads:</Term> replicas reduce
            load on the primary, but they do not replace caching, pagination, good
            indexes, or query limits.
          </LI>
        </UL>
        <P>
          Common examples include ecommerce product pages served from replicas
          while checkout writes to the primary, SaaS dashboards running against a
          reporting follower, and social profiles where recent edits read from the
          primary for a few seconds before returning to the replica pool.
        </P>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A relational primary handles all writes; read replicas stream and replay its log so they can serve read-only traffic.",
          "Replicas are best for read-heavy workloads; they do not increase the primary write capacity.",
          "Asynchronous replication creates lag, which causes stale reads and read-your-writes failures unless you route fresh reads carefully.",
          "Use separate read/write pools, health checks, lag thresholds, and read-only replica credentials to keep routing safe.",
          "Failover promotes a caught-up replica to primary, but fencing, connection retries, and potential async data loss must be planned.",
        ]}
      />

      <CheckYourself question="Why do read replicas help a product catalog more than a write-heavy ledger?">
        Product browsing is read-heavy, so many GET requests can move from the
        primary to replicas. A ledger is dominated by writes and correctness
        checks, and every write still commits on the primary before replicas can
        copy it.
      </CheckYourself>

      <CheckYourself question="A user updates a profile photo and the next page load shows the old one. What happened, and what can you do?">
        The update committed on the primary, but the next read hit a lagging
        replica. Route that user&apos;s post-write reads to the primary for a short
        window, use sticky routing to a caught-up node, or include a commit
        version so the router picks a replica that has replayed the write.
      </CheckYourself>

      <CheckYourself question="During failover, why must the old primary be fenced before promoting a replica?">
        Without fencing, a network-partitioned old primary might continue
        accepting writes while the promoted replica also accepts writes. That
        creates two divergent histories, which is much harder to repair than a
        brief outage.
      </CheckYourself>
    </Prose>
  );
}
