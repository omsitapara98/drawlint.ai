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
        Almost every backend eventually faces the same question: should this data
        live in a <Term>SQL</Term> relational database or in a <Term>NoSQL</Term>
        store? The answer is not about which technology is newer. It is about the
        shape of the data, the queries you must support, the correctness guarantees
        the product needs, and the failure modes you can tolerate.
      </P>

      <Analogy>
        A SQL database is a city hall records office: every form has required
        fields, clerks check references, and changing ownership of a house updates
        several ledgers as one official transaction. NoSQL stores are specialized
        workshops: a key cabinet for instant lookup, a JSON folder room for flexible
        documents, a wide time-series shelf for huge append-only writes, or a map
        of relationships for graph traversal.
      </Analogy>

      <LessonSection id="problem" title="The problem: one word hides many trade-offs">
        <P>
          &quot;Database&quot; sounds like a single product category, but system design
          interviews and real architectures care about behavior under pressure. A
          shopping cart, a bank ledger, an activity feed, a feature flag lookup, and
          a social graph all store data, but they fail in different ways.
        </P>
        <UL>
          <LI>
            If a payment debit commits but the matching credit does not, users lose
            money. That is a <Term>correctness</Term> failure.
          </LI>
          <LI>
            If a feed write path cannot absorb millions of likes per minute, the
            product falls behind. That is a <Term>throughput</Term> failure.
          </LI>
          <LI>
            If a profile document changes shape every sprint and every migration is
            painful, the team slows down. That is a <Term>schema evolution</Term>
            failure.
          </LI>
          <LI>
            If a query needs to jump across friends-of-friends and you model it as
            thousands of joins or API calls, latency explodes. That is an
            <Term>access pattern</Term> failure.
          </LI>
        </UL>
        <Callout type="key" title="Start from the access pattern">
          Do not choose SQL or NoSQL from a brand name. Write down the reads, writes,
          invariants, expected data size, and growth path. The right store is the one
          whose native model makes your most important operations simple and safe.
        </Callout>
      </LessonSection>

      <LessonSection id="relational-model" title="SQL: the relational model, normalization, joins, and ACID">
        <P>
          A relational database stores facts in <Term>tables</Term>. Each row has a
          stable shape, columns have types, and constraints enforce rules before bad
          data lands. Relationships are represented with keys: a customer row has an
          id, an order row points at that id, and order items point at the order.
        </P>
        <CodeBlock label="normalized relational model">{`customers(id, email, created_at)
orders(id, customer_id, status, total_cents)
order_items(id, order_id, sku, quantity, unit_price_cents)

-- The database can enforce:
-- orders.customer_id must reference customers.id
-- order_items.order_id must reference orders.id
-- quantity must be positive`}</CodeBlock>
        <H3>Normalization reduces duplication</H3>
        <P>
          <Term>Normalization</Term> means storing each fact once and referring to it
          by key. Instead of copying a customer email onto every order item, you keep
          it in <code>customers</code>. This prevents update anomalies: changing an
          email in one place cannot leave half the old values behind.
        </P>
        <H3>Joins reconstruct the view you need</H3>
        <P>
          Because normalized data is split across tables, SQL gives you
          <Term>joins</Term> to combine rows at query time. The database optimizer
          chooses indexes and join algorithms so application code does not manually
          stitch many requests together.
        </P>
        <CodeBlock label="join normalized tables into an order summary">{`SELECT o.id, c.email, SUM(oi.quantity * oi.unit_price_cents) AS subtotal
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.id = 123
GROUP BY o.id, c.email;`}</CodeBlock>
        <H3>ACID protects invariants</H3>
        <UL>
          <LI>
            <Term>Atomicity:</Term> all changes in a transaction commit, or none
            do. A failed checkout does not leave inventory reserved without an
            order.
          </LI>
          <LI>
            <Term>Consistency:</Term> constraints and transaction logic move the
            database from one valid state to another.
          </LI>
          <LI>
            <Term>Isolation:</Term> concurrent transactions do not accidentally see
            half-finished work in ways that violate your chosen isolation level.
          </LI>
          <LI>
            <Term>Durability:</Term> once committed, the write survives crashes via
            logs and storage replication.
          </LI>
        </UL>
        <Callout type="info" title="Common SQL examples">
          PostgreSQL, MySQL, SQL Server, Oracle, and SQLite are relational systems.
          They are a strong default for accounts, orders, payments, inventory,
          permissions, subscriptions, and other data with important relationships.
        </Callout>
      </LessonSection>

      <LessonSection id="nosql-families" title="NoSQL is a family, not one database">
        <P>
          <Term>NoSQL</Term> means &quot;not only SQL&quot;. The useful mental model is
          not SQL versus one alternative; it is SQL versus several specialized data
          models. Each family optimizes a different access path and usually gives up
          some combination of joins, global transactions, or immediate consistency.
        </P>
        <CompareTable
          headers={["Family", "Data model", "Examples", "Great for", "Watch out for"]}
          rows={[
            [
              "Key-value",
              "Opaque value at a key",
              "Redis, DynamoDB, Riak",
              "Sessions, feature flags, carts, counters, cache entries",
              "Queries by anything except the key are awkward or impossible",
            ],
            [
              "Document",
              "JSON-like document with nested fields",
              "MongoDB, Couchbase, Firestore",
              "Profiles, catalogs, CMS content, product metadata",
              "Duplicated embedded data can drift; joins are limited",
            ],
            [
              "Wide-column",
              "Rows partitioned by key with sparse columns",
              "Cassandra, HBase, Bigtable, ScyllaDB",
              "Time-series, event writes, IoT, large append-heavy workloads",
              "You must design tables around queries up front",
            ],
            [
              "Graph",
              "Nodes and edges with properties",
              "Neo4j, JanusGraph, Amazon Neptune",
              "Social graph, fraud rings, recommendations, dependency graphs",
              "Not a general replacement for OLTP rows or cheap bulk scans",
            ],
          ]}
        />
        <H3>Document stores trade joins for locality</H3>
        <P>
          A document store often embeds related data together so one read returns
          the whole aggregate. For a product catalog, keeping variants and marketing
          copy inside one product document can be convenient. For payments, copying
          account balances into many documents would be dangerous.
        </P>
        <CodeBlock label="document-shaped product">{`{
  "_id": "sku_123",
  "name": "Trail Shoe",
  "variants": [
    { "color": "red", "sizes": [8, 9, 10] },
    { "color": "black", "sizes": [7, 8, 9, 10] }
  ],
  "searchTags": ["running", "outdoor"]
}`}</CodeBlock>
        <H3>Wide-column stores start with the query</H3>
        <P>
          Cassandra-style modeling asks, &quot;What exact query must be fast?&quot; You
          may create one table for messages by conversation and another for messages
          by sender. This duplication is intentional: the write path updates the
          query-shaped tables so reads avoid expensive joins.
        </P>
      </LessonSection>

      <LessonSection id="consistency-and-schema" title="BASE, schema flexibility, and consistency trade-offs">
        <P>
          Many NoSQL systems are described as <Term>BASE</Term>: basically
          available, soft state, eventually consistent. That does not mean
          &quot;inconsistent and broken&quot;. It means the system often accepts writes
          and serves reads during partitions or failures, then converges through
          replication, conflict resolution, or last-write-wins rules.
        </P>
        <CompareTable
          headers={["Idea", "SQL tendency", "NoSQL tendency"]}
          rows={[
            ["Schema", "Declared and enforced before writes", "Flexible, often enforced by application code"],
            ["Consistency", "Strong within a primary transaction", "Often tunable or eventually consistent"],
            ["Transactions", "Multi-row and multi-table are common", "Often per item, partition, or document"],
            ["Data modeling", "Normalize first, join later", "Denormalize for known reads"],
            ["Failure posture", "Prefer correctness and reject unsafe writes", "Prefer availability for selected access patterns"],
          ]}
        />
        <Callout type="warning" title="Schemaless does not mean designless">
          Flexible schema moves responsibility from the database to your code. You
          still need versioned documents, validation, backfills, and compatibility
          logic so old and new application versions can read the same collection.
        </Callout>
      </LessonSection>

      <LessonSection id="scaling" title="How each option scales">
        <P>
          SQL databases traditionally scale up first: bigger CPU, more RAM, faster
          disks, better indexes, connection pooling, and read replicas. They can also
          shard, but cross-shard joins and transactions become hard, so teams often
          delay sharding until a single primary is truly the bottleneck.
        </P>
        <P>
          NoSQL systems are often built around horizontal partitioning from day one.
          A key-value store hashes keys across nodes; Cassandra partitions by a
          partition key; Kafka-like logs partition by topic key. This makes write
          throughput and storage scale linearly when the access pattern fits, but it
          makes arbitrary ad hoc queries harder.
        </P>
        <CodeBlock label="same product, different scaling pressure">{`Relational default:
  users, orders, payments on Postgres
  add indexes, read replicas, then shard only if needed

NoSQL scale path:
  session:{token} in Redis/DynamoDB
  events_by_user:{user_id, timestamp} in Cassandra
  product:{sku} in MongoDB

Each store is chosen for a specific query, not because one is universally best.`}</CodeBlock>
        <Callout type="tip" title="Default that works surprisingly often">
          Start with a relational database such as Postgres when requirements are
          still changing. Add a specialized store when a concrete access pattern has
          outgrown the relational model or needs latency/scale that a relational
          primary cannot comfortably deliver.
        </Callout>
      </LessonSection>

      <LessonSection id="choosing-polyglot" title="Choosing and combining stores">
        <P>
          Mature systems often use <Term>polyglot persistence</Term>: more than one
          storage technology in the same architecture. The source of truth might be
          Postgres, while Redis caches hot reads, Elasticsearch powers search,
          Cassandra stores high-volume events, and Neo4j answers graph questions.
        </P>
        <UL>
          <LI>
            Pick SQL when relationships, constraints, ad hoc querying, and
            multi-row correctness are central to the product.
          </LI>
          <LI>
            Pick key-value when the operation is &quot;given this key, fetch or update
            this value&quot; at very low latency or massive scale.
          </LI>
          <LI>
            Pick document when the aggregate naturally fits in one JSON-like record
            and the schema changes frequently.
          </LI>
          <LI>
            Pick wide-column when the workload is huge, write-heavy, and queryable
            by a known partition key plus sort key.
          </LI>
          <LI>
            Pick graph when the question is about traversing relationships many
            hops deep.
          </LI>
        </UL>
        <Callout type="info" title="Related lessons">
          The choice interacts with <XLink href="/learn/database-replication">replication</XLink>,
          <XLink href="/learn/sharding-partitioning"> sharding</XLink>, and
          <XLink href="/learn/consistency-models"> consistency models</XLink>.
          Storage is never isolated from scaling and correctness.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "SQL databases model related facts in tables, normalize duplicated data, use joins to reconstruct views, and protect invariants with ACID transactions.",
          "NoSQL is a family: key-value, document, wide-column, and graph stores each optimize a different data shape and access pattern.",
          "BASE and eventual consistency trade immediate global agreement for availability and horizontal scale; that trade must match the product failure mode.",
          "Flexible schema helps teams evolve documents quickly, but validation, versioning, and backfills still matter.",
          "Use polyglot persistence deliberately: keep a clear source of truth and add specialized stores for proven access patterns, not fashion.",
        ]}
      />

      <CheckYourself question="Why is SQL often the safest default for a new product?">
        Early products change requirements constantly. A relational database gives
        strong constraints, transactions, indexes, and flexible ad hoc queries while
        you are still learning the domain. You can add specialized stores later when
        one workload has a measurable scaling or latency problem.
      </CheckYourself>

      <CheckYourself question="What does a document database buy you, and what does it cost?">
        It lets you keep a whole aggregate, such as a product profile, in one
        flexible JSON-like record, so reads are local and schema changes are easy.
        The cost is weaker relational enforcement: duplicated embedded data can
        drift, joins are limited, and application code must handle document versions.
      </CheckYourself>

      <CheckYourself question="What is polyglot persistence?">
        It is using multiple storage systems for different jobs in one architecture:
        for example Postgres as the source of truth, Redis for hot cache entries,
        Cassandra for append-heavy events, and a graph store for relationship
        traversal. The key is keeping ownership and synchronization boundaries clear.
      </CheckYourself>
    </Prose>
  );
}
