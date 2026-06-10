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
        Event sourcing stores the append-only stream of domain events as the
        source of truth. Instead of saving only &quot;account balance = $50&quot;,
        the system saves the sequence &quot;AccountOpened&quot;, &quot;Deposited
        $100&quot;, &quot;Withdrawn $30&quot;, and &quot;Withdrawn $20&quot;. Current state
        is a derived view produced by replaying the events in order.
      </P>

      <Analogy>
        A normal database table is the scoreboard. Event sourcing is the game
        tape. The scoreboard tells you the current score; the tape lets you replay
        every move, explain how the score changed, review a disputed call, and
        build new statistics later.
      </Analogy>

      <LessonSection id="problem" title="The problem: current state overwrites the story">
        <P>
          Current-state systems are easy to query, but every update destroys
          context unless you build separate audit tables. If a booking changed
          from <code>PENDING</code> to <code>CONFIRMED</code> to
          <code>CANCELLED</code>, the final row may not tell you who changed it,
          which payment event arrived first, or what the system believed at 10:05.
          Event sourcing makes the history the primary data.
        </P>
        <CompareTable
          headers={["Model", "Source of truth", "Strength", "Cost"]}
          rows={[
            ["Current-state CRUD", "Latest row values", "Simple queries and updates", "History must be bolted on separately"],
            ["Audit tables", "Latest row plus change log", "Good compliance trail", "Can drift from domain events and often lacks replay semantics"],
            ["Event sourcing", "Append-only event stream", "Audit, replay, time travel, rebuildable projections", "More design and operational complexity"],
          ]}
        />
        <Callout type="key" title="The core idea">
          Facts are immutable. Append what happened, never mutate the fact that it
          happened. Build today&apos;s convenient read views from those facts.
        </Callout>
      </LessonSection>

      <LessonSection id="stream" title="Event streams: append-only facts per aggregate">
        <P>
          Events are usually grouped by <Term>aggregate</Term>: one account, order,
          booking, cart, or document. Each stream has a monotonically increasing
          version. Commands validate against the current aggregate state, then
          append one or more new events if the command is allowed.
        </P>
        <CodeBlock label="event log and replay">{`account-42 event stream:
  v1 AccountOpened     { ownerId: "u1", currency: "USD" }
  v2 MoneyDeposited    { amountCents: 10000 }
  v3 MoneyWithdrawn    { amountCents: 3000 }
  v4 MoneyWithdrawn    { amountCents: 2000 }

replay(events):
  state = { opened: false, balanceCents: 0 }
  for event in events ordered by version:
    if event.type == "AccountOpened":
      state.opened = true
      state.currency = event.currency
    if event.type == "MoneyDeposited":
      state.balanceCents += event.amountCents
    if event.type == "MoneyWithdrawn":
      state.balanceCents -= event.amountCents
  return state

result: { opened: true, balanceCents: 5000, currency: "USD" }`}</CodeBlock>
        <H3>Optimistic concurrency</H3>
        <P>
          Appending usually includes an expected version: &quot;append
          <code>MoneyWithdrawn</code> only if the stream is still at version 4&quot;.
          If another writer appended version 5 first, the command reloads, checks
          business rules again, and retries or rejects. This protects invariants
          without locking the entire system.
        </P>
      </LessonSection>

      <LessonSection id="snapshots" title="Snapshots: replay faster without changing the truth">
        <P>
          Replaying ten events is cheap. Replaying ten million events for a hot
          aggregate on every request is not. A <Term>snapshot</Term> stores the
          derived state at a particular event version. To load the aggregate, read
          the latest snapshot and replay only events after it.
        </P>
        <CodeBlock label="snapshot load path">{`snapshot:
  aggregateId: account-42
  version: 100000
  state: { balanceCents: 918273, status: "OPEN" }

loadAggregate(account-42):
  snapshot = readLatestSnapshot(account-42)
  events = readEventsAfter(account-42, snapshot.version)
  return replayFrom(snapshot.state, events)`}</CodeBlock>
        <UL>
          <LI>
            <Term>Snapshot every N events:</Term> simple and predictable, common
            for aggregates with long histories.
          </LI>
          <LI>
            <Term>Snapshot by cost:</Term> create one when replay time exceeds a
            threshold rather than every fixed count.
          </LI>
          <LI>
            <Term>Snapshot is cache, not truth:</Term> if a snapshot is corrupted,
            you can rebuild it from the event stream.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="cqrs" title="CQRS and read models: write facts, query projections">
        <P>
          Event-sourced write models are not optimized for arbitrary queries like
          &quot;show the last 50 orders for this customer&quot;. The common pairing is
          <Term>CQRS</Term>: commands append events to the write model, and
          asynchronous projectors build read models tailored to screens, search,
          analytics, and APIs.
        </P>
        <CodeBlock label="event sourcing with CQRS projections">{`command API:
  CancelOrder(orderId)
    → validate by replaying order stream
    → append OrderCancelled v12

projectors consume events:
  OrderCancelled
    → update orders_by_customer table
    → remove shipment task
    → update support dashboard
    → publish integration event to Kafka`}</CodeBlock>
        <P>
          Those projection updates are often delivered through a log such as{" "}
          <XLink href="/learn/pattern-kafka">Kafka</XLink> or through an{" "}
          <XLink href="/learn/pattern-outbox-cdc">outbox/CDC</XLink> pipeline. Read
          models can lag behind the write stream, so user experience must handle
          eventual consistency with loading states or read-your-writes shortcuts.
        </P>
        <Callout type="info" title="Projection rebuilds are a superpower">
          Need a new analytics table? Start a new projector at event 1 and replay
          the log. You can build new views from old facts without changing the
          write path.
        </Callout>
      </LessonSection>

      <LessonSection id="benefits" title="Benefits: audit, time travel, and debugging">
        <P>
          Event sourcing shines where the history is valuable, not just the final
          value. Financial ledgers, booking systems, inventory movements, workflow
          engines, source control, collaboration logs, and payment systems all
          benefit from a trustworthy sequence of facts.
        </P>
        <UL>
          <LI>
            <Term>Audit:</Term> every decision can point to the events that caused
            it, including who initiated commands and when.
          </LI>
          <LI>
            <Term>Time travel:</Term> replay up to event version 123 to answer what
            the system believed at that moment.
          </LI>
          <LI>
            <Term>Debugging:</Term> copy one aggregate stream into a test and
            reproduce a bug exactly.
          </LI>
          <LI>
            <Term>Integration:</Term> downstream services can consume the same
            domain events that created the state.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="downsides" title="Downsides: schema evolution and operational complexity">
        <P>
          Event sourcing is a commitment. Events are long-lived APIs to your own
          future code. You cannot casually rename fields or reinterpret old facts
          without migration or upcasting. Teams also have to operate projectors,
          handle duplicate delivery, monitor lag, and explain eventual consistency
          to product owners.
        </P>
        <CompareTable
          headers={["Gotcha", "Why it matters", "Common mitigation"]}
          rows={[
            ["Event schema evolution", "Old events must still replay years later", "Version events and use upcasters"],
            ["Projection lag", "Read model may trail the write stream", "Expose pending states and monitor consumer lag"],
            ["Idempotency", "Projectors may process the same event more than once", "Store last processed event id per projector"],
            ["Privacy deletion", "Immutable logs conflict with erasure requirements", "Encrypt PII separately or store references that can be scrubbed"],
            ["Overuse", "CRUD domains become unnecessarily hard", "Use it only where history has product or compliance value"],
          ]}
        />
        <Callout type="warning" title="Do not event-source everything by default">
          A product catalog description or feature flag may not need replayable
          history. Event sourcing earns its keep when audit, ordering, rebuilding,
          and temporal questions are central to the domain.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Event sourcing stores immutable domain events as the source of truth; current state is derived by replaying them in order.",
          "Snapshots speed up loading long streams but remain rebuildable cache, not the authoritative record.",
          "CQRS pairs naturally with event sourcing: append events on the write side and build query-optimized read models asynchronously.",
          "The biggest benefits are audit, time travel, reproducible debugging, and rebuilding new projections from old facts.",
          "The biggest costs are schema evolution, projection lag, idempotent consumers, privacy handling, and added mental model complexity.",
        ]}
      />

      <CheckYourself question="In event sourcing, what is the source of truth: the account row or the event stream?">
        The event stream is the source of truth. The account row, balance cache, or
        read model is derived by replaying events and can be rebuilt if needed.
      </CheckYourself>

      <CheckYourself question="Why do snapshots not violate the event-sourcing model?">
        A snapshot is only a cached checkpoint of derived state at a known event
        version. The underlying events still define truth, and the snapshot can be
        discarded and rebuilt from the stream.
      </CheckYourself>

      <CheckYourself question="Why is event schema evolution harder than normal table migrations?">
        Old events may need to replay forever. Future code must understand past
        event shapes, so teams version events, write upcasters, and avoid changing
        the meaning of historical facts.
      </CheckYourself>
    </Prose>
  );
}
