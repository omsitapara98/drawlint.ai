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
  CodeBlock,
  CompareTable,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        Distributed databases need to answer two hard questions for every write:
        &quot;Will this survive a crash?&quot; and &quot;Which replicas must see it
        before we call it successful?&quot; The <Term>Write-Ahead Log</Term>{" "}
        answers the durability question by recording changes before applying
        them. <Term>Quorum</Term> replication answers the consistency question by
        requiring enough replicas to acknowledge reads and writes.
      </P>

      <Analogy>
        Imagine a store with three clerks maintaining copies of the inventory
        book. Before changing the shelf count, each clerk writes the change in an
        ink ledger. That ledger is the WAL. For important updates, the manager
        might require two clerks to record the change before telling the customer
        it is done. That majority acknowledgement is a write quorum.
      </Analogy>

      <LessonSection id="problem" title="The problem: crashes and replica disagreement">
        <P>
          A single database can crash halfway through a write. A distributed
          database adds another failure mode: some replicas receive a write while
          others are slow, partitioned, or offline. If the system acknowledges too
          early, a crash can lose data. If reads ask the wrong replica, users can
          see stale data. WAL and quorum rules are the mechanical tools that make
          those trade-offs explicit.
        </P>
        <CodeBlock label="two independent failure modes">{`Crash durability problem:
  server receives write
  server updates memory
  server crashes before disk flush
  after restart, the write is gone unless it was logged first

Replica consistency problem:
  N = 3 replicas: A, B, C
  write reaches A only
  read asks B only
  read returns old value unless quorum settings force overlap`}</CodeBlock>
        <Callout type="key" title="The core idea">
          WAL makes a single replica recoverable after a crash. Quorums make a
          replicated system choose how many copies must participate before a read
          or write is considered successful.
        </Callout>
      </LessonSection>

      <LessonSection id="wal" title="Write-Ahead Log: durability before mutation">
        <P>
          A <Term>write-ahead log</Term> is an append-only file of changes. The
          database writes the intended mutation to the log and flushes it to
          stable storage before updating its main data structures. If the process
          crashes after the log append but before the in-memory table or on-disk
          page is updated, restart can replay the log and finish the change.
        </P>
        <CodeBlock label="single-replica WAL flow">{`write(key="user:42", value="active"):
  1. append record to WAL:
       {lsn: 981, op: "put", key: "user:42", value: "active"}
  2. fsync WAL so the record survives power loss
  3. apply change to memtable / buffer pool
  4. acknowledge success to the client

crash recovery:
  read last checkpoint
  replay WAL records after that checkpoint
  rebuild the latest committed state`}</CodeBlock>
        <UL>
          <LI>
            <Term>Append is fast:</Term> sequential disk writes are much cheaper
            than random page updates.
          </LI>
          <LI>
            <Term>Fsync is the price of durability:</Term> waiting for the log to
            reach stable storage adds latency, but it defines what survives a
            crash.
          </LI>
          <LI>
            <Term>Log sequence number:</Term> each record gets an ordered LSN so
            recovery and replication know exactly how far they have progressed.
          </LI>
          <LI>
            <Term>Checkpointing:</Term> the database periodically writes a compact
            snapshot so recovery does not replay the entire log from the
            beginning of time.
          </LI>
        </UL>
        <Callout type="info" title="WAL is everywhere">
          PostgreSQL, MySQL/InnoDB, SQLite, Cassandra commit logs, Kafka logs,
          and many storage engines use this same principle: log first, apply
          second, recover by replay.
        </Callout>
      </LessonSection>

      <LessonSection id="replication" title="Replication to N nodes">
        <P>
          A distributed database stores each piece of data on{" "}
          <Term>N replicas</Term>. In systems inspired by Dynamo and Cassandra,
          clients or coordinators can choose how many replicas must acknowledge a
          write (<Term>W</Term>) and how many replicas are queried for a read (
          <Term>R</Term>). Those knobs create tunable consistency.
        </P>
        <CodeBlock label="replicating one write to three nodes">{`N = 3 replicas for key "cart:7": A, B, C
W = 2 write acknowledgements required

coordinator receives PUT cart:7 = "paid"
  → append to WAL on A
  → append to WAL on B
  → append to WAL on C

A ack arrives
B ack arrives
coordinator returns success to client because W=2
C may finish later, or repair may update it later`}</CodeBlock>
        <P>
          Each replica still uses its WAL locally. A write acknowledgement should
          mean the replica can recover that write after a crash, not merely that
          it placed the value in memory.
        </P>
        <CompareTable
          headers={["Parameter", "Meaning", "Example impact"]}
          rows={[
            ["N", "How many replicas store the data", "N=3 survives one or more replica failures depending on settings"],
            ["W", "How many replicas must acknowledge a write", "Higher W improves durability/consistency but adds latency"],
            ["R", "How many replicas are consulted for a read", "Higher R improves freshness but adds latency"],
            ["Coordinator", "Node that contacts replicas for one request", "Merges responses and resolves versions"],
          ]}
        />
      </LessonSection>

      <LessonSection id="quorum" title="Quorum reads and writes: why W + R &gt; N matters">
        <P>
          The key quorum rule is simple but powerful: if{" "}
          <code>{"W + R > N"}</code>, then the set of replicas that acknowledged
          the latest write and the set of replicas consulted by a read must
          overlap on at least one node. That overlapping node has the latest
          acknowledged write, so the read can discover it.
        </P>
        <CodeBlock label="W/R/N examples">{`N = 3 replicas

Strong read-after-write choice:
  W = 2, R = 2
  W + R = 4 > 3
  any read set of 2 overlaps any successful write set of 2

Fast eventual choice:
  W = 1, R = 1
  W + R = 2 <= 3
  write may land on A, read may ask B, so stale reads are possible

Read-heavy strong-ish choice:
  W = 3, R = 1
  W + R = 4 > 3
  writes are slower, reads are fast and fresh after acknowledged writes`}</CodeBlock>
        <CompareTable
          headers={["N", "W", "R", "Behavior"]}
          rows={[
            ["3", "2", "2", "Majority read and write; common balanced quorum"],
            ["3", "3", "1", "Slow writes, fast reads, overlap guaranteed"],
            ["3", "1", "3", "Fast writes, slow reads, overlap guaranteed"],
            ["3", "1", "1", "Lowest latency, eventual consistency"],
            ["5", "3", "3", "Majority quorum across more replicas"],
          ]}
        />
        <Callout type="warning" title="Quorum reads still need version comparison">
          Reading from R replicas returns multiple versions. The coordinator must
          compare timestamps, vector clocks, ballot numbers, or another version
          marker and return the newest valid value. Overlap tells you a fresh
          copy is present; versioning tells you which copy it is.
        </Callout>
      </LessonSection>

      <LessonSection id="sloppy" title="Sloppy quorum and hinted handoff">
        <P>
          Real clusters have node failures and network partitions. Strict quorum
          says the write must reach W of the correct N replicas for that key.
          <Term>Sloppy quorum</Term> relaxes this by allowing nearby healthy
          nodes to temporarily accept writes on behalf of unavailable replicas.
          The system stores a <Term>hint</Term> saying where the write really
          belongs and forwards it later. This improves availability, but it weakens
          the clean quorum-overlap story while the cluster is healing.
        </P>
        <CodeBlock label="hinted handoff example">{`Key K should live on replicas A, B, C
Configured W = 2

B is down.
Coordinator writes to:
  A  (real replica)
  D  (temporary handoff node with hint: "deliver to B")

Client receives success because two nodes stored the write.
Later:
  B recovers
  D sends the hinted write to B
  B catches up and D can delete the hint`}</CodeBlock>
        <CompareTable
          headers={["Mode", "Availability", "Consistency caveat"]}
          rows={[
            ["Strict quorum", "Lower during replica outages", "Overlap math is easier to reason about"],
            ["Sloppy quorum", "Higher during outages", "A later read of original replicas may miss handoff data until repair"],
            ["Hinted handoff", "Helps failed replicas catch up", "Hints can be delayed, lost after retention, or conflict with newer writes"],
          ]}
        />
      </LessonSection>

      <LessonSection id="repair" title="Read repair, anti-entropy, and convergence">
        <P>
          Replicas drift. Some writes arrive late, some nodes are down, and some
          reads intentionally use low R for speed. Distributed databases therefore
          need background mechanisms that make replicas converge over time.
        </P>
        <UL>
          <LI>
            <Term>Read repair:</Term> when a read contacts multiple replicas and
            sees stale values, the coordinator returns the newest value to the
            client and writes that value back to stale replicas.
          </LI>
          <LI>
            <Term>Anti-entropy repair:</Term> background jobs compare replica data
            ranges, often using Merkle trees or checksums, and stream missing or
            outdated rows to peers.
          </LI>
          <LI>
            <Term>Hinted handoff replay:</Term> temporary nodes deliver stored
            hints to recovered replicas.
          </LI>
          <LI>
            <Term>Conflict resolution:</Term> concurrent writes may need
            last-write-wins, vector clocks, application merge logic, or
            lightweight transactions depending on the database.
          </LI>
        </UL>
        <CodeBlock label="read repair in miniature">{`read key K with R=2 from replicas A and B
A returns value="paid", version=12
B returns value="pending", version=9

coordinator:
  chooses version 12 for the client
  asynchronously sends value="paid", version=12 to B

next read from B is no longer stale`}</CodeBlock>
        <Callout type="tip" title="Eventual consistency needs active maintenance">
          Eventual consistency does not mean &quot;hope replicas match someday&quot;.
          It relies on concrete repair loops: read repair, anti-entropy, hinted
          handoff, compaction, and operational monitoring of replica lag.
        </Callout>
      </LessonSection>

      <LessonSection id="tradeoffs" title="Tunable consistency in Dynamo and Cassandra-style systems">
        <P>
          Dynamo-style systems and <XLink href="/learn/pattern-cassandra">Cassandra</XLink>{" "}
          expose consistency as a dial. For a shopping cart, low-latency writes
          with occasional merge conflict may be acceptable. For an account
          balance, you might choose stronger quorum settings or a different
          database model. The system lets you trade latency, availability, and
          freshness per operation.
        </P>
        <CompareTable
          headers={["Workload", "Possible setting", "Reason"]}
          rows={[
            ["User presence", "W=1, R=1", "Freshness is nice, but low latency matters more"],
            ["Product catalog", "W=2, R=1 or cached reads", "Writes are rare; stale reads are tolerable briefly"],
            ["Shopping cart", "Quorum or application merge", "Availability matters, conflicts can be resolved"],
            ["Financial ledger", "Strong quorum or single-leader consensus", "Stale or conflicting reads are unacceptable"],
          ]}
        />
        <H3>Gotchas</H3>
        <UL>
          <LI>
            <Term>Latency tails:</Term> higher W or R waits for more replicas, so
            the slowest contacted replica affects request latency.
          </LI>
          <LI>
            <Term>Clock-based conflicts:</Term> last-write-wins can lose updates
            if clocks skew or writes are concurrent.
          </LI>
          <LI>
            <Term>Durability assumptions:</Term> an acknowledgement should mean
            the replica logged the write durably; memory-only acknowledgements are
            weaker.
          </LI>
          <LI>
            <Term>Operational repair:</Term> low consistency settings demand
            strong monitoring for hinted handoff backlog, repair progress, and
            replica lag.
          </LI>
        </UL>
        <Callout type="info" title="Related theory">
          Quorum settings are one practical face of broader{" "}
          <XLink href="/learn/consistency-models">consistency models</XLink>.
          They help you reason about read-your-writes, monotonic reads, eventual
          convergence, and the latency/availability trade-offs behind each.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A write-ahead log appends and fsyncs changes before applying them, so a replica can recover committed writes after a crash.",
          "Replication stores each key on N nodes; W controls write acknowledgements and R controls how many replicas a read consults.",
          "When W + R > N, every successful read set overlaps every successful write set, enabling strong read-after-write behavior when versions are compared correctly.",
          "Sloppy quorum and hinted handoff improve availability during failures but temporarily weaken simple quorum guarantees until repair completes.",
          "Read repair, anti-entropy, hinted handoff, and conflict resolution are the maintenance loops that make Dynamo/Cassandra-style tunable consistency converge.",
        ]}
      />

      <CheckYourself question="Why does a database write to the WAL before updating its main data structures?">
        The WAL is the durable record of intent. If the process crashes after the
        log is flushed but before the main table or page is updated, recovery can
        replay the log and finish the write. Without the log-first rule, a crash
        could lose an acknowledged mutation.
      </CheckYourself>

      <CheckYourself question="With N=3, why do W=2 and R=2 provide stronger reads than W=1 and R=1?">
        With W=2 and R=2, the write set and read set must overlap because{" "}
        <code>{"2 + 2 > 3"}</code>. At least one replica read has the latest
        acknowledged write. With W=1 and R=1, the write may land on A while the
        read asks B, so stale data is possible.
      </CheckYourself>

      <CheckYourself question="What problem do read repair and anti-entropy solve?">
        They make replicas converge after missed writes, low-quorum reads,
        partitions, or hinted handoff delays. Read repair fixes stale replicas
        discovered during a read; anti-entropy scans data ranges in the
        background and synchronizes differences.
      </CheckYourself>
    </Prose>
  );
}
