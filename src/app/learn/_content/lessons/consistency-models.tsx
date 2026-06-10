import {
  Prose,
  LessonSection,
  P,
  Term,
  XLink,
  UL,
  LI,
  Callout,
  Analogy,
  CompareTable,
  KeyTakeaways,
  CheckYourself,
  CodeBlock,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        A <Term>consistency model</Term> is the promise a system makes about when
        a write becomes visible to later reads. Once data is replicated across
        machines, regions, caches, search indexes, and read replicas, there is no
        single obvious answer. Stronger promises are easier for humans to reason
        about, but usually cost latency, availability, or throughput.
      </P>

      <Analogy>
        Imagine a group document copied onto several whiteboards in different
        rooms. Strong consistency means every room updates before anyone reads.
        Eventual consistency means one room updates first and the rest catch up.
        Causal consistency means replies appear after the message they reply to,
        even if other unrelated edits arrive later.
      </Analogy>

      <LessonSection id="problem" title="The problem: replicas create stale reads">
        <P>
          Replication improves scale and availability, but updates take time to
          travel. During that window, different readers can see different values.
          The system is not necessarily broken; it is following whichever
          consistency model it promised.
        </P>
        <CodeBlock label="replication lag anomaly">{`timeline:
t0  user updates profile name from "Ava" to "Ava Chen" on primary
t1  primary commits and returns success
t2  user refreshes profile page
t3  read is served by a lagging replica that still has "Ava"
t4  replica catches up and later reads show "Ava Chen"

User experience:
  "I saved the change, but the app showed the old value."

Missing guarantee:
  read-your-writes`}</CodeBlock>
        <P>
          Ignoring consistency models leads to surprising product bugs: a user
          sees an old profile after saving, a comment reply appears before the
          original comment, a shopping cart loses an item after failover, or a
          metrics dashboard goes backward in time.
        </P>
        <Callout type="key" title="Consistency is a user promise">
          Do not ask only whether the database is consistent. Ask what each user
          journey requires: must everyone see the newest value, must only the
          writer see it, must related events stay ordered, or is eventual
          convergence enough?
        </Callout>
      </LessonSection>

      <LessonSection id="spectrum" title="The spectrum of consistency models">
        <P>
          Consistency is not just strong vs eventual. It is a spectrum of
          guarantees. Stronger models make more anomalies impossible. Weaker
          models allow more freedom for replicas to answer locally.
        </P>
        <CompareTable
          headers={["Model", "Promise", "Example user expectation", "Typical cost"]}
          rows={[
            [
              "Strong / linearizable",
              "After a write completes, every later read sees it, as if there is one copy",
              "After buying the last ticket, nobody else can buy it",
              "Coordination, higher write latency, less availability under partition",
            ],
            [
              "Sequential",
              "Everyone sees operations in one shared order, but that order may not match real-time completion",
              "All users agree on the order of chat operations, even if it is not wall-clock perfect",
              "Global ordering without the strict real-time requirement",
            ],
            [
              "Causal",
              "Cause-and-effect operations are seen in order; unrelated operations may differ",
              "A reply never appears before the message it replies to",
              "Track dependencies such as versions or vector clocks",
            ],
            [
              "Read-your-writes",
              "A user sees their own completed writes on later reads",
              "After editing my bio, I see the new bio when I refresh",
              "Session stickiness, primary reads, or write-through cache",
            ],
            [
              "Monotonic reads",
              "Once a user has seen a value, they do not later see an older value",
              "A dashboard does not go from count 120 back to count 117",
              "Route users to replicas at least as fresh as the last one they read",
            ],
            [
              "Eventual",
              "If writes stop, all replicas eventually converge",
              "A like count or DNS update becomes correct after propagation",
              "Handle stale reads and conflict resolution",
            ],
          ]}
        />
        <P>
          Strong or <Term>linearizable</Term> consistency is the easiest mental
          model: the distributed system behaves like one up-to-date machine.
          Eventual consistency is the weakest useful promise: replicas converge
          eventually, but reads in the meantime may be stale.
        </P>
      </LessonSection>

      <LessonSection id="anomalies" title="Concrete anomalies caused by lag">
        <P>
          The best way to understand consistency models is to name the weird user
          experiences they prevent.
        </P>
        <CodeBlock label="monotonic read violation">{`t0  replica A has inbox_count = 10
t1  replica B has inbox_count = 9 because it is behind
t2  user opens inbox, routed to A, sees 10
t3  user refreshes, routed to B, sees 9

The user appears to move backward in time.
Missing guarantee: monotonic reads`}</CodeBlock>
        <CodeBlock label="causal violation">{`t0  Priya posts: "Database is down"
t1  Marco replies: "I restarted it"
t2  reply replicates to region EU before original post
t3  EU users see "I restarted it" with no parent message

Missing guarantee: causal consistency`}</CodeBlock>
        <CodeBlock label="lost update under weak conflict handling">{`t0  cart = []
t1  phone app adds "shoes" while offline
t2  laptop adds "socks" online
t3  replicas sync using last-write-wins
t4  final cart = ["shoes"] or ["socks"], but not both

The system converged, but the product result is wrong.
Fix: merge carts by item id, use CRDT/set semantics, or coordinate writes.`}</CodeBlock>
        <P>
          Real systems choose different answers. DNS is famously eventually
          consistent because propagation delay is acceptable. ZooKeeper and etcd
          provide strong coordination because locks and leader election need a
          single truth. Social feeds often tolerate stale ordering, but direct
          messages usually need stronger read-your-writes behavior for the sender.
        </P>
      </LessonSection>

      <LessonSection id="mechanics" title="How systems implement stronger guarantees">
        <P>
          Consistency models are implemented with coordination, routing, metadata,
          and conflict handling. The stronger the guarantee, the more the system
          must know before answering.
        </P>
        <UL>
          <LI>
            <Term>Leader-based replication:</Term> send writes to a primary, then
            replicate to followers. Reads from the leader are fresher; follower
            reads are cheaper but may lag.
          </LI>
          <LI>
            <Term>Synchronous replication:</Term> wait for replicas to confirm
            before acknowledging a write. Stronger, but slower and less available
            when replicas are unreachable.
          </LI>
          <LI>
            <Term>Session stickiness:</Term> route a user back to a replica that
            has seen their previous writes or reads.
          </LI>
          <LI>
            <Term>Version metadata:</Term> attach timestamps, logical clocks, or
            vector clocks so replicas can detect ordering and conflicts.
          </LI>
          <LI>
            <Term>Application merges:</Term> resolve conflicts using product
            rules, such as merging shopping carts instead of picking one winner.
          </LI>
        </UL>
        <CodeBlock label="read-your-writes routing">{`on write(user_id, value):
  primary.commit(value)
  session[user_id].min_version = primary.version

on read(user_id):
  required = session[user_id].min_version
  replica = choose_replica_with_version_at_least(required)
  if no replica is fresh enough:
    read_from_primary()

The user pays extra latency only when replicas are behind.`}</CodeBlock>
        <Callout type="tip" title="Use targeted guarantees">
          You often do not need global strong consistency. For example, after a
          user edits a profile, route that user to the primary for a few seconds
          while everyone else reads from replicas. That gives the writer a sane
          experience without making every read expensive.
        </Callout>
      </LessonSection>

      <LessonSection id="quorums" title="Quorums: tuning consistency with R, W, and N">
        <P>
          Some systems let you tune consistency using <Term>quorums</Term>. Store
          each item on <Term>N</Term> replicas. A write succeeds after{" "}
          <Term>W</Term> replicas acknowledge it. A read asks <Term>R</Term>{" "}
          replicas and chooses the newest version. If <code>R + W &gt; N</code>,
          the read set and write set overlap on at least one replica, so a read
          can discover the latest acknowledged write.
        </P>
        <CodeBlock label="quorum overlap">{`N = 3 replicas: A, B, C
W = 2 replicas must accept a write
R = 2 replicas are read

Write x=7 reaches A and B.
Any read of 2 replicas must include at least one of A or B:
  read A+B → sees 7
  read A+C → sees 7
  read B+C → sees 7

Because R + W = 4 > N = 3, the sets overlap.`}</CodeBlock>
        <CompareTable
          headers={["Configuration", "Behavior", "Trade-off"]}
          rows={[
            ["R=1, W=1, N=3", "Fast reads and writes, but stale reads are possible", "Low latency, weak consistency"],
            ["R=2, W=2, N=3", "Read and write quorums overlap", "Stronger reads, more coordination"],
            ["R=1, W=3, N=3", "Writes wait for all replicas; reads are fast", "Slow writes, fast reads"],
            ["R=3, W=1, N=3", "Writes are fast; reads check all replicas", "Fast writes, slow reads"],
          ]}
        />
        <P>
          Cassandra and Dynamo-style systems popularized this tunable approach.
          It is powerful, but it is not magic. Clocks can disagree, replicas can
          be down, hinted handoff and read repair are asynchronous, and conflict
          resolution still matters. This connects directly to the trade-offs in{" "}
          <XLink href="/learn/cap-theorem">the CAP theorem</XLink>.
        </P>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>Strong reads from a replica may not be strong:</Term> if the
            replica lags, it can return old data unless the system checks
            freshness or routes to the leader.
          </LI>
          <LI>
            <Term>Last-write-wins can lose data:</Term> it converges, but it may
            discard a concurrent update that the product should have merged.
          </LI>
          <LI>
            <Term>Wall-clock timestamps are dangerous:</Term> clock skew can make
            an older write look newer. Logical clocks or server-assigned versions
            are safer for ordering.
          </LI>
          <LI>
            <Term>Indexes and search are replicas too:</Term> the database may be
            fresh while Elasticsearch, cache, or a materialized view is stale.
          </LI>
          <LI>
            <Term>Consistency can be per operation:</Term> a system might use
            strong consistency for username reservation and eventual consistency
            for follower counts.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A consistency model is the visibility promise for writes in a replicated system.",
          "Strong/linearizable consistency gives one-copy behavior but usually costs coordination, latency, and partition availability.",
          "Sequential, causal, read-your-writes, and monotonic reads are useful middle guarantees between strong and eventual.",
          "Replication lag causes concrete anomalies such as stale reads, time-travel reads, replies before parents, and lost updates.",
          "Quorums tune the trade-off: R + W > N creates overlap, but conflict resolution and failure behavior still matter.",
        ]}
      />

      <CheckYourself question="Which guarantee is missing if a user saves a profile and immediately sees the old value?">
        Read-your-writes. The write succeeded somewhere, but the user&apos;s next
        read was served by a copy that had not seen that write yet.
      </CheckYourself>

      <CheckYourself question="Why can last-write-wins be dangerous?">
        It makes replicas converge by choosing one version, but it can discard a
        concurrent update that should have been preserved. Shopping carts,
        collaborative edits, and counters usually need merge logic, not blind
        replacement.
      </CheckYourself>

      <CheckYourself question="What does R + W > N buy in a quorum system?">
        It guarantees that the set of replicas read overlaps with the set that
        acknowledged the write, so a read has a chance to observe the latest
        acknowledged version instead of only stale copies.
      </CheckYourself>
    </Prose>
  );
}
