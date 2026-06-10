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
        How do you reliably publish an event after a database write when the
        database and the message broker cannot share one atomic commit? The{" "}
        <Term>Outbox pattern</Term> writes the event into the same database
        transaction as the business change, then a <Term>CDC</Term> relay such
        as Debezium publishes it to <XLink href="/learn/pattern-kafka">Kafka</XLink>.
      </P>

      <Analogy>
        Imagine a restaurant kitchen that must both cook an order and tell the
        delivery counter about it. If the chef shouts across the room after
        plating, a fire alarm at the wrong second can leave a finished meal with
        no delivery ticket. The outbox is a carbon-copy ticket written while the
        meal is created; even if everyone evacuates, the delivery counter can
        later read the ticket stack and continue.
      </Analogy>

      <LessonSection id="problem" title="The problem: dual writes lose events">
        <P>
          The naive flow looks harmless: update Postgres, then publish an event
          to Kafka. But that is a <Term>dual write</Term>: one logical operation
          is split across two independent systems. The database can commit while
          the broker publish fails, or the broker can accept the event while the
          database transaction rolls back. There is no general, practical way for
          your app server to make both systems commit atomically.
        </P>
        <CodeBlock label="the dangerous gap between two systems">{`createOrder(request):
  tx = db.begin()
  db.orders.insert(order)
  tx.commit()                 # order is now durable

  kafka.publish("order.created", order)  # app may crash right here

# Result: the order exists, but billing/search/email never hear about it.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Lost event:</Term> the app dies after the DB commit but before
            the broker publish. Downstream services never learn about a real
            business fact.
          </LI>
          <LI>
            <Term>Phantom event:</Term> the app publishes first, then the DB
            transaction rolls back. Consumers react to something that never
            became true.
          </LI>
          <LI>
            <Term>Duplicate event:</Term> the publish succeeds, the app times out
            before seeing the acknowledgment, and retry publishes the same event
            again.
          </LI>
        </UL>
        <Callout type="warning" title="Do not hide the gap with retries">
          Retrying the publish makes lost events less likely, but it does not make
          the two writes atomic. Retries also create duplicates, so downstream
          consumers still need <XLink href="/learn/pattern-idempotency-keys">idempotency</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="transaction" title="The fix: write an outbox row in the same transaction">
        <P>
          The outbox moves the broker publish out of the user request path. When
          the application changes business state, it also inserts a row into an
          <code>outbox_events</code> table in the <em>same</em> database
          transaction. That gives you the one guarantee you really need: the
          event is durable if and only if the business change is durable.
        </P>
        <CodeBlock label="business row plus outbox row commit together">{`BEGIN;

INSERT INTO orders (id, user_id, status, total_cents)
VALUES (:order_id, :user_id, 'PLACED', :total_cents);

INSERT INTO outbox_events (
  id, aggregate_type, aggregate_id, event_type, payload, created_at
) VALUES (
  :event_id,
  'order',
  :order_id,
  'OrderPlaced',
  json_build_object('orderId', :order_id, 'totalCents', :total_cents),
  now()
);

COMMIT;  -- both rows become visible, or neither row does`}</CodeBlock>
        <P>
          Notice what did <em>not</em> happen in that transaction: the app did
          not call Kafka. The request can return once the database commit
          succeeds. Publishing is delegated to a separate relay that scans or
          tails the outbox.
        </P>
        <CompareTable
          headers={["Approach", "Crash after DB commit", "Crash after publish", "Operational feel"]}
          rows={[
            ["DB write then publish", "Event can be lost", "Usually safe, unless retry duplicates", "Simple but unsafe"],
            ["Publish then DB write", "Consumer can see a false event", "Event can be phantom", "Unsafe for business facts"],
            ["Outbox in same transaction", "Event row is still durable", "Relay may retry the event", "Reliable with idempotent consumers"],
          ]}
        />
      </LessonSection>

      <LessonSection id="relay" title="Relay and CDC: turning rows into broker messages">
        <P>
          A relay publishes outbox rows to a broker. The simplest relay polls
          <code>outbox_events</code> for unpublished rows, publishes them, and
          marks them sent. At scale, teams often prefer <Term>Change Data Capture</Term>:
          a tool such as Debezium tails the database write-ahead log (WAL), sees
          committed inserts into the outbox table, and streams them to Kafka.
        </P>
        <CodeBlock label="CDC relay from WAL to Kafka">{`Application transaction
  -> INSERT orders row
  -> INSERT outbox_events row
  -> COMMIT

Postgres WAL
  -> contains the committed outbox insert in commit order

Debezium connector
  -> tails WAL position LSN 0/7F3A90
  -> transforms outbox row into message
  -> publishes to Kafka topic order.events
     key   = aggregate_id      # keeps one order on one partition
     value = payload
  -> stores connector offset after Kafka acknowledges`}</CodeBlock>
        <H3>Polling relay versus CDC relay</H3>
        <CompareTable
          headers={["Relay style", "How it finds work", "Strengths", "Gotchas"]}
          rows={[
            ["Polling publisher", "SELECT unsent rows with locks", "Easy to build and debug", "Adds DB polling load; careful locking needed"],
            ["CDC with Debezium", "Tails the WAL after commit", "Low-latency, preserves commit order, avoids polling", "Requires connector ops and schema discipline"],
          ]}
        />
        <Callout type="info" title="The relay is allowed to be boring">
          The relay should not decide business logic. It translates a durable row
          into a broker message and advances its cursor only after the broker has
          acknowledged the publish.
        </Callout>
      </LessonSection>

      <LessonSection id="delivery" title="Delivery semantics: at-least-once, idempotency, and ordering">
        <P>
          Outbox plus CDC gives durable publication, not magical exactly-once
          effects everywhere. If the relay publishes to Kafka and crashes before
          saving its offset, it can publish the same outbox row again after
          restart. That is normal <Term>at-least-once delivery</Term>: every event
          eventually arrives, but some events can arrive more than once.
        </P>
        <UL>
          <LI>
            <Term>Make event IDs stable:</Term> generate <code>outbox_events.id</code>
            inside the original transaction. Consumers record processed IDs or
            use natural idempotency keys before applying side effects.
          </LI>
          <LI>
            <Term>Key by aggregate:</Term> publish Kafka messages with
            <code>aggregate_id</code> as the key so all events for one order,
            account, or conversation land on one partition and remain ordered.
          </LI>
          <LI>
            <Term>Keep transaction order:</Term> CDC reads committed WAL entries,
            so it can preserve database commit order within a table or partitioned
            stream. Cross-aggregate global order is rarely useful and often too
            expensive.
          </LI>
          <LI>
            <Term>Design consumers for replay:</Term> Kafka retention means a new
            consumer may reread old events. Replays should rebuild state, not
            resend duplicate emails or charge cards again.
          </LI>
        </UL>
        <Callout type="key" title="The real guarantee">
          The outbox guarantees that a committed business fact has a durable event
          waiting to be published. It does not remove duplicates; it makes
          duplicates manageable and lost events unacceptable.
        </Callout>
      </LessonSection>

      <LessonSection id="examples" title="Real-world examples and design choices">
        <P>
          Outbox is most valuable when other systems must react to committed
          business facts: an order was placed, a payment settled, a user changed
          email, or a file finished scanning. These events often feed read models,
          search indexes, notifications, analytics, and stream processors.
        </P>
        <UL>
          <LI>
            <Term>E-commerce:</Term> insert <code>OrderPlaced</code> with the order
            row; inventory reservation and email services consume the event.
          </LI>
          <LI>
            <Term>Payments:</Term> insert <code>PaymentCaptured</code> only after
            the ledger transaction commits; downstream reporting can trust that
            the event describes durable state.
          </LI>
          <LI>
            <Term>Collaboration apps:</Term> insert document-change events with
            the document version; consumers update search and activity feeds in
            version order.
          </LI>
        </UL>
        <H3>Schema fields that pay for themselves</H3>
        <CompareTable
          headers={["Column", "Why it matters", "Example"]}
          rows={[
            ["id", "Consumer dedupe and traceability", "evt_01J..."],
            ["aggregate_id", "Kafka key and per-entity ordering", "order_123"],
            ["event_type", "Consumer routing and schema selection", "OrderPlaced"],
            ["payload", "The event body", "{orderId,totalCents}"],
            ["created_at", "Lag monitoring and replay windows", "2026-06-10T07:00Z"],
          ]}
        />
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>Outbox table growth:</Term> CDC-based designs may keep rows for
            audit, while polling designs often mark or delete sent rows. Either
            way, partition or archive so the table does not become a hidden
            hot spot.
          </LI>
          <LI>
            <Term>Schema evolution:</Term> consumers outlive producers. Version
            payloads or use a schema registry so a new field does not break old
            consumers.
          </LI>
          <LI>
            <Term>Poison events:</Term> a malformed event can block one consumer.
            Use dead-letter topics and alarms rather than silently skipping it.
          </LI>
          <LI>
            <Term>Side effects in consumers:</Term> writing a read model is easy to
            make idempotent; sending email or charging money needs stronger
            dedupe around the external side effect.
          </LI>
        </UL>
        <Callout type="tip" title="Pair it with the right downstream primitive">
          Outbox commonly feeds <XLink href="/learn/pattern-kafka">Kafka</XLink>,
          and Kafka consumers should use <XLink href="/learn/pattern-idempotency-keys">idempotency keys</XLink>
          for safe retries and replay.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "The outbox pattern fixes the dual-write problem by making the event row part of the same database transaction as the business change.",
          "A relay or CDC tool such as Debezium tails committed outbox rows and publishes them to a broker after the user transaction commits.",
          "Delivery is at-least-once, so every consumer must dedupe by stable event ID or apply naturally idempotent updates.",
          "Ordering is usually per aggregate: key Kafka messages by aggregate_id so one entity maps to one partition.",
          "Operational details matter: table cleanup, schema evolution, poison events, relay lag, and replay-safe consumers are part of the design.",
        ]}
      />

      <CheckYourself question="Why does writing an outbox row in the same transaction prevent lost events?">
        Because the database commits the business row and the outbox row together.
        If the transaction rolls back, neither exists. If it commits, the event is
        durably stored even if the app crashes before publishing, so a relay can
        publish it later.
      </CheckYourself>

      <CheckYourself question="Why do consumers still need idempotency when CDC is reliable?">
        The relay can publish a message and crash before recording its new offset.
        On restart it may publish the same outbox row again. Reliable publication
        therefore means at-least-once delivery, and consumers must treat repeated
        event IDs as safe no-ops.
      </CheckYourself>

      <CheckYourself question="How do you preserve order for all events belonging to one order or chat?">
        Use the aggregate ID as the Kafka key. Kafka sends the same key to the
        same partition, and Kafka preserves order within a partition, so one
        order or chat is consumed in sequence while other aggregates run in
        parallel.
      </CheckYourself>
    </Prose>
  );
}
