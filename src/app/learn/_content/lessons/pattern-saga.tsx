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
        A business workflow often spans several services: order, payment,
        inventory, shipping, email, loyalty points, and fraud checks. Each
        service owns its own database, so you cannot wrap the whole workflow in
        one ACID transaction. The <Term>Saga pattern</Term> coordinates the work
        as a sequence of local transactions, with explicit{" "}
        <Term>compensating actions</Term> that undo completed steps when a later
        step fails.
      </P>

      <Analogy>
        Booking a vacation is a saga. You reserve a flight, then a hotel, then a
        car. There is no single database transaction across the airline, hotel,
        and rental company. If the car is unavailable, you cancel the hotel and
        flight. Those cancellations are compensations: real business actions that
        move the world back toward a consistent outcome.
      </Analogy>

      <LessonSection id="problem" title="The problem: no one ACID transaction across services">
        <P>
          In a monolith with one database, checkout can be one transaction:
          insert order, decrement inventory, insert payment, commit. In a
          microservice architecture, those records live behind different services
          and databases. Holding a global lock across all of them would be slow,
          fragile, and often impossible. Two-phase commit exists, but many
          modern services and message brokers avoid it because it couples
          availability to every participant.
        </P>
        <CodeBlock label="why a single transaction does not fit">{`Order DB transaction starts
  → call Payment service       # remote network call
  → call Inventory service     # remote network call
  → call Shipping service      # remote network call
Order DB transaction commits?

Problems:
  - remote calls can hang while locks are held
  - each service owns its own database
  - one participant outage blocks the whole transaction
  - rollback cannot undo external side effects like a card authorization`}</CodeBlock>
        <P>
          The saga answer is to accept that the workflow will move through
          intermediate states. The system becomes <Term>eventually consistent</Term>
          instead of instantly atomic. Users may briefly see &quot;payment
          captured, shipment pending&quot;, but the workflow has a clear path to
          completion or compensation.
        </P>
        <Callout type="key" title="The core idea">
          A saga is a state machine of local transactions. Each forward step
          commits in one service. If a later step fails, compensating steps run in
          reverse order for the steps that already committed.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanics" title="How it works: local transactions plus compensations">
        <P>
          Every saga step needs two pieces of design: the forward action and the
          compensation. The compensation is not always a perfect undo. A refund
          does not erase the fact that a charge happened; it creates a new
          financial event that balances it. A release-inventory action does not
          pretend the reservation never existed; it makes the units available
          again.
        </P>
        <CodeBlock label="saga shape">{`Step 1: create order        Compensation: cancel order
Step 2: authorize payment  Compensation: void/refund payment
Step 3: reserve inventory  Compensation: release inventory
Step 4: create shipment    Compensation: cancel shipment if possible

If step 3 fails:
  run compensation for step 2
  run compensation for step 1
  mark saga failed with a reason`}</CodeBlock>
        <H3>Compensations must be idempotent</H3>
        <P>
          Sagas run over unreliable networks and queues, so both forward steps
          and compensations may be retried. A refund command might be delivered
          twice. A cancel-order command might race with an already-cancelled
          order. Each handler should use an{" "}
          <XLink href="/learn/pattern-idempotency-keys">idempotency key</XLink>{" "}
          or a state check so repeated attempts have the same final effect.
        </P>
        <CompareTable
          headers={["Forward step", "Compensation", "Idempotency rule"]}
          rows={[
            ["Create pending order", "Cancel order", "Cancel only if not already completed or cancelled"],
            ["Capture payment", "Refund payment", "Use one refund key per payment capture"],
            ["Reserve inventory", "Release reservation", "Release by reservation id once"],
            ["Create shipment", "Cancel shipment", "No-op if carrier already cancelled it"],
          ]}
        />
      </LessonSection>

      <LessonSection id="styles" title="Choreography vs orchestration">
        <P>
          There are two common ways to drive a saga. In{" "}
          <Term>choreography</Term>, services react to events and publish the
          next event. In <Term>orchestration</Term>, a coordinator commands each
          step and records the saga state. Both can work; the trade-off is where
          the workflow logic lives.
        </P>
        <CompareTable
          headers={["Dimension", "Choreography", "Orchestration"]}
          rows={[
            ["Control flow", "Emerges from services reacting to events", "Explicit in a coordinator"],
            ["Coupling", "No central workflow service", "Services depend on coordinator commands"],
            ["Visibility", "Harder to see the whole flow in one place", "One state machine shows progress and failures"],
            ["Best for", "Simple flows with few steps and low branching", "Complex flows with many failure paths"],
            ["Failure handling", "Each service must know what event to publish next", "Coordinator decides retry and compensation order"],
          ]}
        />
        <CodeBlock label="orchestrated order saga">{`OrderSagaCoordinator:
  start(orderId):
    create_order(orderId)
    authorize_payment(orderId)
    reserve_inventory(orderId)
    create_shipment(orderId)
    mark_order_confirmed(orderId)

  on_failure(failed_step):
    compensate_completed_steps_in_reverse_order()
    mark_order_failed(orderId)`}</CodeBlock>
        <Callout type="tip" title="Beginner rule of thumb">
          Use choreography for small, obvious flows. Prefer orchestration once
          you need branching, timeouts, human-visible status, retries, and clear
          debugging. A coordinator makes the saga state explicit.
        </Callout>
      </LessonSection>

      <LessonSection id="worked-example" title="Worked example: order → payment → inventory → shipping">
        <P>
          Imagine an ecommerce checkout. The business wants either a confirmed
          order with payment, inventory, and shipment, or a clean failure where
          the customer is not charged and inventory is not stuck. The saga records
          each step, retries transient failures, and compensates permanent
          failures.
        </P>
        <CodeBlock label="successful order saga">{`1. Order service:
     local transaction → create order {status: "PENDING"}
     publish OrderCreated

2. Payment service:
     local transaction → authorize/capture payment
     publish PaymentCaptured

3. Inventory service:
     local transaction → reserve SKU units
     publish InventoryReserved

4. Shipping service:
     local transaction → create shipment label
     publish ShipmentCreated

5. Order service:
     local transaction → mark order {status: "CONFIRMED"}`}</CodeBlock>
        <CodeBlock label="failure and compensation">{`Inventory reservation fails after payment succeeded:

forward history:
  order created
  payment captured
  inventory reserve failed

compensation:
  refund payment using refund idempotency key
  cancel order
  notify user that checkout failed

final state:
  order = FAILED
  payment = REFUNDED
  inventory = unchanged`}</CodeBlock>
        <P>
          Notice that the saga does not hide intermediate states. For a short
          period, the order may be pending while payment is captured and inventory
          is not yet reserved. That is acceptable only if the product and support
          teams understand the states and the system has repair jobs for stuck
          sagas.
        </P>
      </LessonSection>

      <LessonSection id="reliability" title="Reliability: events, outbox, retries, and timeouts">
        <P>
          Sagas need reliable messaging. If a service commits its local database
          transaction but crashes before publishing the event that starts the next
          step, the saga can get stuck. The common fix is the{" "}
          <XLink href="/learn/pattern-outbox-cdc">outbox/CDC pattern</XLink>:
          write the business row and an outbox event in the same transaction,
          then publish the event asynchronously.
        </P>
        <UL>
          <LI>
            <Term>Retries:</Term> transient failures should retry with backoff
            and jitter. Permanent business failures should trigger compensation.
          </LI>
          <LI>
            <Term>Timeouts:</Term> a saga step that never responds needs a
            deadline. After the deadline, the coordinator retries, queries state,
            or compensates.
          </LI>
          <LI>
            <Term>Idempotent handlers:</Term> every command and event handler
            should tolerate duplicate delivery.
          </LI>
          <LI>
            <Term>Observability:</Term> store saga ID, current step, completed
            steps, compensation status, retry count, and last error.
          </LI>
        </UL>
        <Callout type="warning" title="Compensation is a business decision">
          Some actions cannot be fully undone. A shipped package may require a
          return process, not a simple cancel. A sent email cannot be unsent.
          Design compensations with product, finance, and support teams, not only
          with code.
        </Callout>
      </LessonSection>

      <LessonSection id="tradeoffs" title="Trade-offs, gotchas, and when to avoid sagas">
        <P>
          Sagas buy availability and service autonomy at the cost of complexity.
          They are powerful when a workflow truly crosses service boundaries, but
          they are not a reason to split a simple transaction across services too
          early.
        </P>
        <CompareTable
          headers={["Concern", "What can go wrong", "Mitigation"]}
          rows={[
            ["Intermediate states", "Users see pending or inconsistent status", "Model states explicitly and explain them in UI"],
            ["Duplicate messages", "A step or compensation runs twice", "Use idempotency keys and state checks"],
            ["Lost events", "Saga stalls after a local commit", "Use outbox/CDC and reconciliation jobs"],
            ["Compensation failure", "Rollback path also fails", "Retry, alert, and provide manual repair tools"],
            ["Debugging", "Events span many services", "Trace with saga ID and central status views"],
          ]}
        />
        <UL>
          <LI>
            Keep a single ACID transaction if all data belongs in one service and
            the transaction is short.
          </LI>
          <LI>
            Use a saga when steps are independently owned, long-running, or have
            external side effects.
          </LI>
          <LI>
            Build admin repair tools before production. Eventually consistent
            systems need operational escape hatches.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A saga coordinates a multi-service workflow as local transactions plus compensating actions, not one global ACID transaction.",
          "Choreography uses events between services; orchestration uses a coordinator that records state and commands each step.",
          "Compensations are real business actions, often imperfect, and must be idempotent because they may be retried.",
          "Sagas are eventually consistent: intermediate states are normal, so model them explicitly and make them observable.",
          "Use outbox/CDC, idempotency keys, retries, timeouts, tracing, and repair jobs to make sagas reliable in production.",
        ]}
      />

      <CheckYourself question="Why not hold one database transaction across order, payment, inventory, and shipping services?">
        Each service owns its own database and may call external systems. Holding
        locks across remote calls would be slow and fragile, and many side
        effects cannot be rolled back by a database abort. A saga commits each
        local step and uses compensating actions if a later step fails.
      </CheckYourself>

      <CheckYourself question="Payment succeeds but inventory reservation fails. What should the saga do?">
        It should compensate the completed payment step, usually by refunding or
        voiding the payment with an idempotent refund key, then cancel or fail the
        order and notify the user. The final state is consistent even though the
        system passed through a temporary paid-but-not-reserved state.
      </CheckYourself>

      <CheckYourself question="When is orchestration often easier than choreography?">
        Orchestration is easier when the workflow has many steps, branches,
        retries, timeouts, and compensations. The coordinator provides one place
        to see the current state and decide what happens after each success or
        failure.
      </CheckYourself>
    </Prose>
  );
}
