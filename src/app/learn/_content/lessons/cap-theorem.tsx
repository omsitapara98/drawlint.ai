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
        The <Term>CAP theorem</Term> explains a hard choice in replicated
        distributed systems. When the network splits and replicas cannot talk to
        each other, the system must choose between <Term>Consistency</Term> and{" "}
        <Term>Availability</Term>. It cannot guarantee both for the same data at
        the same time during that partition.
      </P>

      <Analogy>
        Imagine two bank branches that normally share a live ledger. The phone
        line between them is cut. If both branches keep accepting withdrawals,
        they may overdraw the same account. If one branch refuses service until
        the line returns, balances stay correct but customers are turned away.
        That is CAP: during a communication break, serve everyone or preserve one
        correct truth.
      </Analogy>

      <LessonSection id="problem" title="The problem: replicas can lose contact">
        <P>
          Replication is how systems scale reads, survive machine failures, and
          place data near users. But replicas communicate over networks, and
          networks sometimes drop, delay, duplicate, or reorder messages. A{" "}
          <Term>network partition</Term> is a failure where some nodes can still
          run but cannot communicate with other nodes.
        </P>
        <CodeBlock label="partition creates two realities">{`Before partition:
  client writes x = 2 to Node A
  Node A replicates x = 2 to Node B
  reads from A or B return 2

During partition:
  Node A receives write x = 3
  A cannot send the update to B

        write x=3
client ─────────▶ Node A   ✂ network partition ✂   Node B ─────────▶ client
                  x = 3                              x = 2

Now a read on B cannot both be available and guaranteed latest.`}</CodeBlock>
        <P>
          The failure mode of ignoring CAP is promising impossible behavior:
          &quot;all replicas are always up, every request always succeeds, and every
          read always sees the latest write.&quot; In a partitioned system, that
          sentence contradicts itself.
        </P>
        <Callout type="key" title="The theorem in practical words">
          If a partition prevents replicas from coordinating, a read or write on
          the isolated side must either wait/fail to preserve consistency, or
          succeed using local state and risk being stale or conflicting.
        </Callout>
      </LessonSection>

      <LessonSection id="properties" title="The three properties">
        <P>
          CAP uses precise meanings. In system design interviews, define the
          words before applying them.
        </P>
        <CompareTable
          headers={["Property", "Meaning in CAP", "What users observe"]}
          rows={[
            [
              "Consistency (C)",
              "Every read sees the latest successful write, as if there is one copy of the data",
              "No stale reads; all replicas agree before answering",
            ],
            [
              "Availability (A)",
              "Every request to a non-failing node receives a non-error response",
              "The service keeps answering even if some nodes cannot coordinate",
            ],
            [
              "Partition tolerance (P)",
              "The system continues operating despite lost or delayed messages between nodes",
              "The design acknowledges that network splits happen",
            ],
          ]}
        />
        <H3>Partition tolerance is not a feature toggle</H3>
        <P>
          In a real distributed system, you do not get to choose whether the
          network can fail. It can. That is why the common slogan
          &quot;pick two of three&quot; is misleading. The meaningful choice is what
          you do <em>when P happens</em>: favor C or favor A.
        </P>
      </LessonSection>

      <LessonSection id="cp-ap" title="CP vs AP during a partition">
        <P>
          During a partition, a replicated data system usually behaves like a{" "}
          <Term>CP</Term> system or an <Term>AP</Term> system for a given
          operation.
        </P>
        <CompareTable
          headers={["Mode", "Partition behavior", "Good fit", "Examples"]}
          rows={[
            [
              "CP",
              "Preserve consistency by rejecting, blocking, or redirecting requests that cannot be safely coordinated",
              "Locks, metadata, bank ledgers, inventory reservations, leader election",
              "ZooKeeper, etcd, HBase, many strongly consistent SQL configurations",
            ],
            [
              "AP",
              "Preserve availability by accepting local reads/writes and reconciling conflicts later",
              "Feeds, likes, carts, presence, metrics, DNS-style data",
              "Cassandra, Amazon Dynamo-style systems, Riak, many DynamoDB single-region eventually consistent reads",
            ],
          ]}
        />
        <CodeBlock label="CP behavior">{`partition occurs

write arrives at minority replica
replica cannot reach quorum/leader
replica returns error or timeout

Result:
  availability is reduced
  accepted writes remain consistent`}</CodeBlock>
        <CodeBlock label="AP behavior">{`partition occurs

write arrives at isolated replica
replica accepts write locally
later, partition heals
system reconciles versions using timestamps, vector clocks, CRDTs, or application logic

Result:
  availability is preserved
  readers may see stale or conflicting values temporarily`}</CodeBlock>
        <P>
          Real systems can mix choices. A shopping app might make payment
          authorization CP, product recommendations AP, and inventory reservation
          somewhere in between. CAP is not a label for the entire company; it is
          a way to reason about a data operation under partition.
        </P>
      </LessonSection>

      <LessonSection id="misconceptions" title="The common misconception: do not say pick two always">
        <P>
          The beginner version of CAP says you can pick any two of consistency,
          availability, and partition tolerance. That wording is memorable but
          wrong enough to cause bad designs.
        </P>
        <UL>
          <LI>
            You cannot simply &quot;pick CA&quot; for a distributed system and ignore
            partitions. If nodes communicate over a network, partitions are part
            of reality.
          </LI>
          <LI>
            CAP does not say a CP system is always unavailable. It says
            availability may be sacrificed for affected operations during a
            partition.
          </LI>
          <LI>
            CAP does not say an AP system is always inconsistent. It may be
            perfectly consistent during normal operation and only allow divergence
            when coordination is impossible or too expensive.
          </LI>
          <LI>
            CAP is about a specific consistency guarantee. There are many weaker
            models such as causal, read-your-writes, monotonic reads, and
            eventual consistency. Those are covered in{" "}
            <XLink href="/learn/consistency-models">consistency models</XLink>.
          </LI>
        </UL>
        <Callout type="warning" title="Beware marketing labels">
          Vendors may describe a database as CP, AP, globally consistent, highly
          available, or serverless. Always ask: for which operation, in which
          region setup, at what isolation level, and during what failure?
        </Callout>
      </LessonSection>

      <LessonSection id="pacelc" title="PACELC: Else, latency vs consistency">
        <P>
          CAP focuses on partitions, but partitions are rare compared with normal
          operation. <Term>PACELC</Term> extends the reasoning: if there is a{" "}
          <Term>Partition</Term>, choose <Term>Availability</Term> or{" "}
          <Term>Consistency</Term>; <Term>Else</Term>, when the network is
          healthy, choose <Term>Latency</Term> or <Term>Consistency</Term>.
        </P>
        <CodeBlock label="PACELC in one line">{`P A / E L  = if Partition, choose Availability; Else choose Latency
P C / E C  = if Partition, choose Consistency;  Else choose Consistency

The first half is the failure choice.
The second half is the everyday performance choice.`}</CodeBlock>
        <CompareTable
          headers={["PACELC style", "Normal operation", "Partition behavior", "Typical shape"]}
          rows={[
            ["PA/EL", "Favor low latency reads/writes", "Keep serving if replicas split", "Dynamo-style, Cassandra-style workloads"],
            ["PC/EC", "Coordinate for stronger consistency", "Block unsafe operations", "ZooKeeper/etcd-style coordination, strongly consistent databases"],
            ["PC/EL", "Low latency when healthy, consistency during partition", "May use local fast paths but require quorum under failure", "Some tunable quorum systems by configuration"],
          ]}
        />
        <P>
          The PACELC lens is often more useful than CAP in day-to-day design. A
          globally replicated database can keep replicas consistent across
          continents, but every write may wait for cross-region coordination.
          That may be correct for a financial ledger and unacceptable for a
          social reaction counter.
        </P>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>Partial partitions:</Term> not every node is split from every
            other node. Some links fail while others work, creating asymmetric
            behavior that is hard to test.
          </LI>
          <LI>
            <Term>Timeouts are ambiguous:</Term> a timeout does not prove the
            other node failed. It may be slow, overloaded, or partitioned.
          </LI>
          <LI>
            <Term>Conflict resolution is product logic:</Term> last-write-wins
            may be fine for a display name but dangerous for a bank balance.
          </LI>
          <LI>
            <Term>Client retries can amplify conflicts:</Term> an AP write that
            times out may have succeeded locally. Retrying without idempotency can
            create duplicates.
          </LI>
          <LI>
            <Term>CAP is not capacity planning:</Term> it describes a correctness
            trade-off under network failure, not CPU, memory, or disk throughput.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "CAP says that during a network partition, a replicated system must choose consistency or availability for affected operations.",
          "Partition tolerance is not optional in real distributed systems; the practical choice is CP vs AP when coordination breaks.",
          "CP systems such as ZooKeeper, etcd, and HBase reject or block unsafe operations to preserve correctness.",
          "AP systems such as Cassandra and Dynamo-style stores keep serving and reconcile stale or conflicting data later.",
          "PACELC adds the normal-case trade-off: even without partitions, stronger consistency often costs latency.",
        ]}
      />

      <CheckYourself question="Why is the phrase pick two of three misleading?">
        Because partitions are not optional once data is distributed across a
        network. The practical question is not whether to pick partition
        tolerance; it is whether to favor consistency or availability when a
        partition actually prevents coordination.
      </CheckYourself>

      <CheckYourself question="What does a CP system do during a partition?">
        It refuses, blocks, or redirects operations that cannot be proven safe.
        The system sacrifices availability for those operations so it does not
        serve stale data or accept conflicting writes.
      </CheckYourself>

      <CheckYourself question="What extra question does PACELC ask beyond CAP?">
        PACELC asks what the system does when there is no partition: does it favor
        low latency by avoiding coordination, or stronger consistency by waiting
        for replicas to agree?
      </CheckYourself>
    </Prose>
  );
}
