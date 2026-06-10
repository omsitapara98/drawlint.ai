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
        <Term>Message queues</Term> and <Term>streams</Term> let one part of a
        system hand work to another asynchronously. Instead of making a user wait
        while every downstream service finishes, the producer records a message and
        returns. Consumers process messages at their own pace, with retries,
        ordering rules, and backpressure controls.
      </P>

      <Analogy>
        A restaurant does not make waiters stand beside the stove. A waiter writes
        an order ticket and clips it to a rail. Cooks pull tickets when they have
        capacity, and a manager can see when the rail is backing up. A queue is that
        rail: it decouples fast order taking from slower cooking.
      </Analogy>

      <LessonSection id="problem" title="The problem: slow work and fragile coupling">
        <P>
          Synchronous calls are simple until the downstream service is slow, down, or
          overwhelmed. If checkout directly calls email, analytics, warehouse,
          billing webhooks, and recommendation updates before returning, one weak
          dependency can ruin the user-facing request.
        </P>
        <CodeBlock label="async handoff">{`HTTP request
  -> write order in database
  -> publish OrderCreated message
  -> return 202/200 to user

workers later:
  -> send email
  -> reserve warehouse stock
  -> update search index
  -> notify analytics`}</CodeBlock>
        <UL>
          <LI>
            <Term>Decoupling:</Term> producers and consumers do not need to be
            online at the same time or scale at the same rate.
          </LI>
          <LI>
            <Term>Spike absorption:</Term> bursts become queue depth instead of
            immediate downstream overload.
          </LI>
          <LI>
            <Term>Background work:</Term> slow tasks leave the request path.
          </LI>
          <LI>
            <Term>Failure containment:</Term> retries and dead-letter queues isolate
            poison messages from healthy traffic.
          </LI>
        </UL>
        <Callout type="info" title="Reliability boundary">
          Publishing a message is often part of a larger workflow. The
          <XLink href="/learn/pattern-outbox-cdc"> outbox and CDC pattern</XLink>
          solves the classic bug where the database commit succeeds but the message
          publish fails.
        </Callout>
      </LessonSection>

      <LessonSection id="queue-vs-log" title="Traditional queues vs streaming logs">
        <P>
          People often say &quot;queue&quot; for every async system, but a work queue and a
          log have different semantics. A queue distributes tasks; a log records an
          ordered history that many consumers can replay independently.
        </P>
        <CompareTable
          headers={["Model", "Message lifecycle", "Consumer behavior", "Examples", "Best for"]}
          rows={[
            [
              "Queue",
              "Message is removed or hidden after a consumer succeeds",
              "Many workers compete; one worker handles each task",
              "SQS, RabbitMQ work queues, Redis lists",
              "Background jobs, email sending, image processing",
            ],
            [
              "Streaming log",
              "Message is appended and retained for time or size",
              "Each consumer group tracks its own offset",
              "Kafka, Pulsar, Kinesis, Redis Streams",
              "Event history, analytics pipelines, CDC, replayable integrations",
            ],
          ]}
        />
        <H3>Queue mental model</H3>
        <P>
          Use a queue when the message represents work to do once: send this email,
          charge this webhook, resize this image. Adding workers increases throughput
          because workers compete for tasks.
        </P>
        <H3>Log mental model</H3>
        <P>
          Use a log when the message is an event fact: order created, payment
          captured, user upgraded. Multiple teams can consume the same history at
          different speeds, and a new consumer can replay from the beginning.
        </P>
      </LessonSection>

      <LessonSection id="delivery" title="Delivery semantics: at-most-once, at-least-once, exactly-once">
        <P>
          Delivery semantics describe what can happen when producers, brokers, or
          consumers crash. They are not marketing words; they determine whether your
          consumer code must tolerate lost messages or duplicates.
        </P>
        <CompareTable
          headers={["Semantic", "Meaning", "Typical implementation", "Risk"]}
          rows={[
            ["At-most-once", "Message is delivered zero or one time", "Mark done before processing", "Failures can lose work"],
            ["At-least-once", "Message is delivered one or more times", "Process, then ack", "Duplicates are normal"],
            ["Exactly-once", "Effect appears once despite retries", "Broker transactions plus idempotent sinks", "Limited scope; end-to-end design still matters"],
          ]}
        />
        <CodeBlock label="at-least-once consumer">{`msg = queue.receive()
try:
    # use message_id as an idempotency key
    if not db.already_processed(msg.id):
        perform_side_effect(msg)
        db.mark_processed(msg.id)
    queue.ack(msg)
except Exception:
    # no ack: message becomes visible again or is redelivered
    raise`}</CodeBlock>
        <Callout type="key" title="Idempotency is the practical answer">
          Most production queues are at-least-once. Design consumers so processing
          the same message twice has the same external effect as processing it once:
          use unique constraints, idempotency keys, natural event ids, and upserts.
        </Callout>
      </LessonSection>

      <LessonSection id="ack-timeout-dlq" title="Ack, visibility timeout, retries, and dead-letter queues">
        <P>
          A broker needs to know whether work succeeded. In queue systems, the
          consumer receives a message, processes it, and sends an <Term>ack</Term>.
          If the ack never arrives, the broker assumes the worker died and makes the
          message available again.
        </P>
        <UL>
          <LI>
            <Term>Acknowledgement:</Term> deletes or commits the message only after
            successful processing.
          </LI>
          <LI>
            <Term>Visibility timeout:</Term> hides a message from other workers for a
            period while one worker processes it.
          </LI>
          <LI>
            <Term>Retry with backoff:</Term> transient failures should wait longer
            between attempts to avoid hammering a broken dependency.
          </LI>
          <LI>
            <Term>Dead-letter queue:</Term> after too many failures, move the
            message aside for investigation instead of blocking the main queue.
          </LI>
        </UL>
        <CodeBlock label="visibility timeout failure">{`t=00 worker A receives message M; M hidden for 30s
t=10 worker A calls payment API; API is slow
t=30 visibility timeout expires before A acked
t=31 worker B receives M and also processes it
t=35 worker A finally succeeds

Without idempotency, the user may be charged twice.`}</CodeBlock>
        <Callout type="warning" title="Set visibility timeout from real work time">
          Too short creates duplicate processing while the first worker is still
          alive. Too long delays retries after a real crash. Many systems extend the
          timeout as work progresses or split long jobs into smaller messages.
        </Callout>
      </LessonSection>

      <LessonSection id="ordering-groups" title="Ordering, partitions, and consumer groups">
        <P>
          Ordering is expensive because it limits parallelism. Systems usually offer
          order within a queue, partition, shard, or message group, not across the
          entire world. The design trick is choosing the key whose events must stay
          ordered.
        </P>
        <CompareTable
          headers={["Concept", "How it works", "Design implication"]}
          rows={[
            ["Partition", "Messages with the same key go to the same ordered lane", "Use order_id, account_id, or conversation_id when per-entity order matters"],
            ["Consumer group", "Many consumers share work from partitions", "Parallelism is limited by partition count and hot keys"],
            ["Offset", "A consumer group records its position in a log", "Replaying means moving offsets back or starting a new group"],
            ["FIFO group", "Queue preserves order per message group", "One hot group can serialize too much work"],
          ]}
        />
        <CodeBlock label="Kafka-style partitioning">{`topic: order-events
key = order_id

order 101 -> partition 3: Created, Paid, Shipped
order 202 -> partition 7: Created, Cancelled

Consumers in the same group divide partitions, but events for one order stay ordered.`}</CodeBlock>
        <Callout type="tip" title="Order only what needs order">
          Global ordering is rarely worth the throughput cost. Preserve order per
          account, order, conversation, or aggregate root, and let unrelated entities
          process in parallel.
        </Callout>
      </LessonSection>

      <LessonSection id="backpressure" title="Backpressure and capacity planning">
        <P>
          A queue can hide a downstream outage, but it cannot erase work. If
          producers enqueue 10,000 jobs per second and consumers process 2,000 per
          second, the backlog grows forever. <Term>Backpressure</Term> is the system
          pushing that reality back to producers or users before storage, latency, or
          costs explode.
        </P>
        <UL>
          <LI>
            Track queue depth, oldest message age, retry rate, DLQ count, consumer
            lag, and processing latency.
          </LI>
          <LI>
            Autoscale consumers when backlog rises, but cap concurrency to protect
            downstream dependencies.
          </LI>
          <LI>
            Shed low-priority work, pause producers, or return 429/503 when lag
            exceeds user promises.
          </LI>
          <LI>
            Separate priority queues so bulk analytics does not starve password
            reset emails.
          </LI>
        </UL>
        <CodeBlock label="backlog math">{`arrival_rate = 10000 messages/sec
processing_rate = 8000 messages/sec
backlog_growth = 2000 messages/sec

After 10 minutes:
  2000 * 60 * 10 = 1,200,000 messages waiting

Queues buy time; they do not remove capacity limits.`}</CodeBlock>
      </LessonSection>

      <LessonSection id="systems" title="SQS vs RabbitMQ vs Kafka">
        <P>
          The right broker depends on whether you want managed task queues, flexible
          broker routing, or a durable replayable log. These tools overlap, but their
          operational centers of gravity are different.
        </P>
        <CompareTable
          headers={["System", "Model", "Strengths", "Trade-offs"]}
          rows={[
            [
              "SQS",
              "Managed cloud queue",
              "Very low operations, visibility timeout, DLQ, elastic scale",
              "Limited routing semantics; standard queues are best-effort ordering",
            ],
            [
              "RabbitMQ",
              "Broker with exchanges and queues",
              "Flexible routing, acknowledgements, priorities, RPC-like patterns",
              "You operate broker clusters and capacity; replay is not the main model",
            ],
            [
              "Kafka",
              "Partitioned append-only log",
              "High-throughput streams, retention, replay, consumer groups",
              "Operationally heavier; ordering is per partition; consumers manage offsets",
            ],
          ]}
        />
        <Callout type="info" title="Related pattern">
          For event-stream architectures, see <XLink href="/learn/pattern-kafka">Kafka</XLink>.
          For reliable publishing from a database transaction, pair queues with
          <XLink href="/learn/pattern-outbox-cdc"> outbox and CDC</XLink>.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Queues decouple producers from consumers, move slow work off the request path, and absorb spikes as backlog.",
          "A queue distributes tasks to workers; a streaming log retains an ordered history that multiple consumer groups can replay.",
          "At-least-once delivery is the common default, so consumers must be idempotent and safe under duplicates.",
          "Ack, visibility timeout, retries, and DLQs are the core failure-handling mechanics for task queues.",
          "Ordering is usually per partition or message group, and backpressure is required because queues buy time but not infinite capacity.",
        ]}
      />

      <CheckYourself question="Why is at-least-once delivery both useful and dangerous?">
        It is useful because a worker crash does not lose the message; the broker can
        redeliver it. It is dangerous because the first worker may have completed the
        side effect before crashing or missing the ack, so a second worker can repeat
        the work. Idempotency prevents duplicate external effects.
      </CheckYourself>

      <CheckYourself question="When should you choose a log like Kafka instead of a task queue?">
        Choose a log when events are a durable history that many consumers need to
        read independently, replay, or process from different offsets. Use a task
        queue when each message represents work that one worker should perform and
        remove.
      </CheckYourself>

      <CheckYourself question="What does a dead-letter queue protect you from?">
        It prevents a poison message from being retried forever and blocking healthy
        work. After a configured number of failures, the message moves to a separate
        queue where operators can inspect, fix, replay, or discard it.
      </CheckYourself>
    </Prose>
  );
}
