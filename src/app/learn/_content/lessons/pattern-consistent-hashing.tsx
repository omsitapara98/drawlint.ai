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
        <Term>Consistent hashing</Term> is a placement strategy for stateful
        clusters: caches, storage shards, CDN routing tables, and message
        partitions. It maps keys to nodes so adding or removing capacity moves
        only a small, predictable slice of data instead of forcing the entire
        cluster to reshuffle at once.
      </P>

      <Analogy>
        Imagine assigning library books to shelves by the last digit of the book
        ID. With 10 shelves, book 427 goes to shelf 7. If you add an 11th shelf,
        the last-digit rule no longer works and nearly every book needs a new
        home. Consistent hashing is more like arranging shelves around a circular
        hallway: add one shelf, and only the books in the small hallway segment
        before it move.
      </Analogy>

      <LessonSection id="modulo-problem" title="The problem: modulo hashing remaps everything">
        <P>
          The first idea most engineers reach for is <code>hash(key) % N</code>:
          hash the key, divide by the number of nodes, and use the remainder as
          the node index. It is simple, fast, and works beautifully while{" "}
          <code>N</code> stays constant. The failure mode appears the moment you
          add or remove a node.
        </P>
        <CodeBlock label="why mod-N causes a rehash storm">{`// Three cache nodes: A, B, C
owner(key) = hash(key) % 3

// Add one more cache node: A, B, C, D
owner(key) = hash(key) % 4

// A key whose hash is 42:
42 % 3 = 0  // A
42 % 4 = 2  // C

// A key whose hash is 43:
43 % 3 = 1  // B
43 % 4 = 3  // D

// Most keys change owners, so the cluster behaves like a cold cache.`}</CodeBlock>
        <P>
          For random hashes, changing from <code>N</code> to <code>N + 1</code>{" "}
          changes the remainder for almost every key. In a cache, that means a
          huge miss storm against the database. In a storage system, it means an
          expensive data migration. In a CDN routing layer, it can throw users at
          different edge nodes and destroy locality.
        </P>
        <CompareTable
          headers={["Approach", "When nodes change", "Operational failure mode"]}
          rows={[
            [
              "Modulo hashing",
              "Almost every key can map to a different node",
              "Cache stampede, huge rebalance, high tail latency",
            ],
            [
              "Consistent hashing",
              "Only the keys in the changed ring slice move",
              "Small controlled migration; most keys stay warm",
            ],
          ]}
        />
        <Callout type="key" title="The design goal">
          When the cluster changes by one node out of <code>N</code>, move about{" "}
          <code>1/N</code> of keys, not nearly all keys. That is the central
          promise of consistent hashing.
        </Callout>
      </LessonSection>

      <LessonSection id="hash-ring" title="The hash ring: keys walk clockwise">
        <P>
          Consistent hashing treats the hash space as a circle, often from{" "}
          <code>0</code> to <code>2^32 - 1</code> or <code>2^64 - 1</code>. Hash
          each physical node onto the ring. Hash each key onto the same ring. A
          key belongs to the first node encountered while walking clockwise from
          the key position.
        </P>
        <CodeBlock label="minimal consistent-hash ring lookup">{`ring = [
  (10, "cache-a"),
  (35, "cache-b"),
  (72, "cache-c"),
  (91, "cache-d"),
]

function ownerFor(key):
  point = hash(key) % 100

  for (nodePoint, nodeName) in ring sorted by nodePoint:
    if point <= nodePoint:
      return nodeName

  // Wrap around to the first node on the ring.
  return ring[0].nodeName

// hash("user:42") = 40  => first node clockwise is cache-c at 72
// hash("post:9")  = 96  => wrap around to cache-a at 10`}</CodeBlock>
        <P>
          Adding a node inserts a new point on the ring. The new node only takes
          ownership of keys between the previous node and itself. Removing a node
          gives its interval to the next node clockwise. That locality is what
          prevents whole-cluster reshuffles.
        </P>
        <H3>Why only a fraction moves</H3>
        <P>
          If the ring is reasonably balanced and there are <code>N</code> equal
          nodes, each node owns about <code>1/N</code> of the hash space. Add one
          more node and it should take about <code>1/(N + 1)</code> of the key
          space. In practical terms, if a 10-node cache cluster adds one node, you
          want roughly 9 percent to 10 percent of keys to move, not 90 percent.
        </P>
      </LessonSection>

      <LessonSection id="virtual-nodes" title="Virtual nodes: balance the ring">
        <P>
          Hashing one point per physical node is risky. Random placement can give
          one node a huge arc and another node a tiny arc, which means uneven
          memory, uneven CPU, and uneven request volume. Production systems solve
          this with <Term>virtual nodes</Term>, also called tokens or vnodes.
        </P>
        <P>
          Instead of placing <code>cache-a</code> once, place{" "}
          <code>cache-a#0</code>, <code>cache-a#1</code>,{" "}
          <code>cache-a#2</code>, and so on. Each virtual point maps back to the
          same physical machine. With hundreds of points per machine, random
          gaps average out and load becomes much smoother.
        </P>
        <CompareTable
          headers={["Design", "Benefit", "Cost"]}
          rows={[
            [
              "One token per node",
              "Very simple lookup table",
              "Poor balance if node positions are unlucky",
            ],
            [
              "Many virtual nodes per node",
              "Smoother distribution and easier weighted capacity",
              "Larger ring metadata and slightly more lookup work",
            ],
            [
              "Weighted virtual nodes",
              "Bigger machines can own more ring slices",
              "Requires capacity-aware token assignment",
            ],
          ]}
        />
        <Callout type="tip" title="Vnodes make heterogeneity practical">
          If one cache server has twice the memory of another, give it roughly
          twice as many virtual nodes. It will own about twice as much key space
          without needing a separate placement algorithm.
        </Callout>
      </LessonSection>

      <LessonSection id="replication" title="Replication: continue along the ring">
        <P>
          A single owner is not enough for durable storage or highly available
          reads. The standard ring trick is to choose the primary owner, then keep
          walking clockwise to choose replicas on distinct physical nodes. With a
          replication factor of three, each key is stored on three successive
          nodes in ring order.
        </P>
        <CodeBlock label="replicas are the next distinct nodes clockwise">{`function replicasFor(key, replicationFactor):
  point = hash(key)
  replicas = []

  for vnode in ring.clockwiseFrom(point):
    node = vnode.physicalNode
    if node not in replicas:
      replicas.append(node)
    if len(replicas) == replicationFactor:
      return replicas

// key k maps to vnode on node B
// replicas might be [B, D, A] after skipping duplicate vnodes for B`}</CodeBlock>
        <UL>
          <LI>
            <Term>Failure tolerance:</Term> if one node dies, reads can fall back
            to another replica while repair or re-replication runs.
          </LI>
          <LI>
            <Term>Placement awareness:</Term> real systems avoid putting all
            replicas in the same rack, availability zone, or power domain.
          </LI>
          <LI>
            <Term>Read and write quorums:</Term> Dynamo-style systems can require
            acknowledgements from <code>R</code> read replicas and <code>W</code>{" "}
            write replicas, trading latency for consistency.
          </LI>
        </UL>
        <Callout type="info" title="Where you have seen this">
          DynamoDB lineage systems, Cassandra, Riak, many CDN routing layers, and
          distributed cache clients use variants of this idea. The details differ,
          but the same ring mental model appears again and again.
        </Callout>
      </LessonSection>

      <LessonSection id="bounded-load" title="Bounded-load consistent hashing">
        <P>
          Basic consistent hashing balances key count in expectation, but it does
          not guarantee request load. A few very popular keys can make one node
          hot even if the ring is balanced. <Term>Bounded-load</Term> variants add
          a guardrail: a node may receive assignments only up to some limit above
          the average load. If it is already too full, the lookup continues to the
          next acceptable node.
        </P>
        <CodeBlock label="bounded-load lookup sketch">{`maxLoad = averageLoad * 1.25

function boundedOwnerFor(key):
  point = hash(key)

  for vnode in ring.clockwiseFrom(point):
    node = vnode.physicalNode
    if currentLoad(node) < maxLoad:
      return node

  // In overload, either relax the bound or shed traffic explicitly.
  return leastLoadedNode()`}</CodeBlock>
        <P>
          This is useful for request routing, CDN edge assignment, and cache
          clients where the system can observe load in real time. It is less
          straightforward for durable storage because moving ownership based on
          momentary load can fight replication, repair, and consistency rules.
        </P>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and design gotchas">
        <UL>
          <LI>
            <Term>Hash quality matters:</Term> use a stable, uniform hash. A poor
            hash creates clumps and defeats the balance assumptions.
          </LI>
          <LI>
            <Term>Ring metadata must be consistent:</Term> clients need the same
            view of nodes and tokens, or different clients will route the same key
            to different owners during deployments.
          </LI>
          <LI>
            <Term>Membership changes should be staged:</Term> adding 100 nodes at
            once still moves a lot of data. Throttle rebalancing so background
            migration does not compete with foreground traffic.
          </LI>
          <LI>
            <Term>Hot keys still exist:</Term> consistent hashing spreads keys,
            not popularity. Pair it with caching, replication, and{" "}
            <XLink href="/learn/pattern-hot-key">hot-key mitigation</XLink>.
          </LI>
          <LI>
            <Term>Partitioning is broader:</Term> the ring is one way to shard.
            For range shards, directory-based shards, and split strategies, see{" "}
            <XLink href="/learn/sharding-partitioning">sharding and partitioning</XLink>.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Modulo hashing is fragile for stateful clusters because changing N remaps almost every key.",
          "Consistent hashing places keys and nodes on a ring; a key walks clockwise to its owner.",
          "Adding or removing one node remaps only the affected ring slice, roughly K/N keys rather than nearly all K keys.",
          "Virtual nodes smooth balance, support weighted capacity, and reduce unlucky ring gaps.",
          "Replication walks farther around the ring; bounded-load variants add live load guardrails for routing-heavy systems.",
        ]}
      />

      <CheckYourself question="Why does hash(key) % N cause a cache stampede when you add one cache node?">
        The divisor changes, so most keys compute a different remainder and route
        to a different cache server. The cluster behaves like a cold cache:
        requests miss, fall through to the database, and create a sudden load
        spike.
      </CheckYourself>

      <CheckYourself question="How do virtual nodes improve a consistent-hash ring?">
        They place each physical machine at many points on the ring. Many small
        slices average out random gaps, so each machine owns a more even share of
        keys. They also let larger machines receive more slices than smaller
        machines.
      </CheckYourself>

      <CheckYourself question="How does replication usually work on a hash ring?">
        Find the primary owner by walking clockwise from the key hash, then keep
        walking clockwise to select the next distinct physical nodes as replicas.
        Production systems also spread replicas across racks or availability
        zones so one failure domain does not contain every copy.
      </CheckYourself>
    </Prose>
  );
}
