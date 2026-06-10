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
  StatGrid,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Two-stage fanout</Term> separates two jobs that fight each other:
        assigning a single ordered sequence to messages, and delivering each
        message to many recipients in parallel. The pattern is common in group
        chat, notifications, and social feeds where users expect order but the
        system must deliver to thousands or millions of inboxes.
      </P>

      <Analogy>
        Think of an airport. Air traffic control assigns planes a runway order so
        landings are safe and monotonic. Baggage handlers then unload bags in
        parallel across many carts. If the tower also carried every suitcase, the
        runway would freeze; if baggage handlers chose landing order, planes
        would conflict.
      </Analogy>

      <LessonSection id="problem" title="The problem: ordering and delivery parallelism pull apart">
        <P>
          A group message has two very different requirements. First, everyone in
          the group should agree that message 104 comes after message 103. Second,
          the system may need to write that message into 10,000 recipient inboxes,
          push mobile notifications, update unread counts, and fan out WebSocket
          events. Doing all of that inline in the ordered path makes one large
          group block every later message.
        </P>
        <CodeBlock label="naive single-stage fanout blocks the ordered stream">{`handleMessage(group_id, message):
  seq = nextSequence(group_id)
  saveMessage(group_id, seq, message)

  for member in getMembers(group_id):
    writeInbox(member, group_id, seq, message)
    pushNotification(member, group_id, seq)

  # A 50,000-member group keeps the sequencer busy for seconds.
  # Later messages wait even though they only need a sequence number.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Ordering bottleneck:</Term> the component that decides sequence
            numbers is forced to wait for slow delivery work.
          </LI>
          <LI>
            <Term>Tail latency amplification:</Term> one slow inbox write or push
            provider call delays the whole group stream.
          </LI>
          <LI>
            <Term>Retry confusion:</Term> if delivery partially succeeds and the
            worker retries, some recipients may see duplicates unless inbox writes
            are idempotent.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="stages" title="The two stages: sequence first, deliver second">
        <P>
          Two-stage fanout creates a narrow ordered stage and a wide parallel
          stage. Stage 1 is a per-group sequencer. It consumes messages partitioned
          by group, assigns a monotonic sequence number, persists the canonical
          message, and emits a delivery job. Stage 2 is a fleet of delivery
          workers. They split the job into recipient tasks and write inboxes or
          feeds in parallel.
        </P>
        <CodeBlock label="two-stage fanout mechanics">{`Stage 1: ordered sequencer, partitioned by group_id

on IncomingMessage(group_id, client_msg_id, body):
  seq = incrementAndGet("group:" + group_id + ":seq")
  insert GroupMessage(group_id, seq, client_msg_id, body)
  publish DeliveryJob(key=group_id, value={group_id, seq})

Stage 2: parallel delivery workers, partitioned by recipient_id or shard

on DeliveryJob(group_id, seq):
  message = load GroupMessage(group_id, seq)
  recipients = loadMembers(group_id)

  for shard in split(recipients, 1000):
    publish RecipientBatch(key=shard.id, value={group_id, seq, shard})

on RecipientBatch(group_id, seq, recipients):
  for recipient in recipients:
    upsert Inbox(recipient, group_id, seq)  # unique(recipient, group_id, seq)
    enqueuePush(recipient, group_id, seq)`}</CodeBlock>
        <StatGrid
          stats={[
            { label: "Stage 1", value: "Ordered" },
            { label: "Stage 2", value: "Parallel" },
            { label: "Order key", value: "Group" },
          ]}
        />
        <Callout type="key" title="Do the smallest possible work in the ordered lane">
          The sequencer should assign sequence numbers and commit canonical
          message state. It should not wait for thousands of inbox writes or
          external notification providers.
        </Callout>
      </LessonSection>

      <LessonSection id="ordering" title="How this preserves order without giving up scale">
        <P>
          The trick is that order is attached to the message before fanout begins.
          Every recipient inbox write carries the same <code>{"{group_id, seq}"}</code>
          pair. Delivery workers can run in any order, retry independently, and
          still write deterministic inbox positions because the sequence was
          already chosen by the ordered stage.
        </P>
        <CompareTable
          headers={["Design", "Ordering behavior", "Scaling behavior", "Failure mode"]}
          rows={[
            ["Single worker per group does all delivery", "Simple per-group order", "Large groups block the worker", "One slow recipient stalls everyone"],
            ["Parallel workers assign order", "Race-prone and inconsistent", "Fast but unsafe", "Recipients can disagree on message order"],
            ["Two-stage fanout", "Sequencer assigns monotonic order once", "Delivery scales by recipient shards", "Requires idempotent delivery writes"],
          ]}
        />
        <UL>
          <LI>
            <Term>Canonical message table:</Term> store one durable copy keyed by
            <code>{"{group_id, seq}"}</code>. Inboxes reference it instead of
            duplicating the full message body everywhere.
          </LI>
          <LI>
            <Term>Recipient inbox index:</Term> write a row keyed by
            <code>{"{recipient_id, group_id, seq}"}</code> so retries become
            upserts rather than duplicates.
          </LI>
          <LI>
            <Term>Client rendering:</Term> clients sort by sequence number and can
            detect gaps, such as seeing 103 and 105 while 104 is still being
            delivered or fetched.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="backpressure" title="Backpressure and large groups">
        <P>
          Two-stage fanout does not remove fanout amplification; it controls where
          that amplification happens. A million-member group still creates a lot
          of delivery work. The design wins because stage 1 can keep assigning
          sequence numbers while stage 2 absorbs, throttles, retries, and sheds
          delivery work according to product priority.
        </P>
        <CodeBlock label="backpressure boundaries">{`incoming messages topic (key=group_id)
  -> sequencer lag should stay tiny
  -> emits delivery jobs quickly

delivery jobs topic (key=group_id)
  -> can accumulate during spikes
  -> workers split into recipient batches

recipient batch topic (key=recipient_shard)
  -> horizontal scale lever
  -> retries and dead letters isolated by shard`}</CodeBlock>
        <H3>Backpressure tools</H3>
        <UL>
          <LI>
            <Term>Separate queues:</Term> sequencer lag and delivery lag are
            different SLOs. Alert on both, but do not let delivery lag stop order
            assignment unless storage is at risk.
          </LI>
          <LI>
            <Term>Shard big jobs:</Term> split a giant group into recipient
            batches so one job does not monopolize a worker for minutes.
          </LI>
          <LI>
            <Term>Priority lanes:</Term> online users, mentions, or paid tenants
            may use higher-priority delivery queues than cold inbox backfills.
          </LI>
          <LI>
            <Term>Rate limits:</Term> push providers and downstream databases need
            token buckets so retries do not amplify an outage.
          </LI>
        </UL>
        <Callout type="warning" title="Backpressure is a product behavior">
          During a spike, you may choose to persist messages immediately, update
          online recipients first, and let offline push notifications lag. That is
          better than blocking sequence assignment and making the chat appear
          broken for everyone.
        </Callout>
      </LessonSection>

      <LessonSection id="examples" title="Real-world examples">
        <P>
          The same structure appears anywhere one ordered event must update many
          personalized views. It pairs naturally with the broader fanout trade-off
          between write-time and read-time fanout described in{" "}
          <XLink href="/learn/pattern-fanout-write-read">fanout on write versus read</XLink>.
        </P>
        <UL>
          <LI>
            <Term>Group chat:</Term> sequence per conversation, write per-recipient
            inbox rows, and push notifications through independent workers.
          </LI>
          <LI>
            <Term>Social feeds:</Term> assign a post version once, then fan out to
            follower home timelines in batches while preserving author-post order
            where the product requires it.
          </LI>
          <LI>
            <Term>Enterprise notifications:</Term> persist a canonical alert, then
            deliver to user inboxes, email, Slack, and mobile push with separate
            retry policies.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>Sequencer hot spots:</Term> a huge group is still a single order
            key. If it exceeds one partition&apos;s capacity, you need product-level
            compromises, substreams, or a more specialized ordering service.
          </LI>
          <LI>
            <Term>Gaps are normal during delivery:</Term> recipients may receive
            seq 105 before seq 104 is written to their inbox. Clients should fetch
            missing canonical messages or show a loading gap.
          </LI>
          <LI>
            <Term>Membership snapshots:</Term> decide whether delivery uses the
            member list at send time or delivery time. Most chat systems snapshot
            or version membership to avoid surprising recipients.
          </LI>
          <LI>
            <Term>Deletes and edits:</Term> sequence them too. An edit event at
            seq 110 should not race unpredictably with the original message or
            with moderation actions.
          </LI>
          <LI>
            <Term>Observability:</Term> track sequencer lag, delivery lag, inbox
            write failures, push failures, and per-group hot keys separately.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Two-stage fanout splits ordering from delivery: stage 1 assigns a monotonic per-group sequence, stage 2 delivers to recipients in parallel.",
          "The sequencer should do minimal durable work: choose the sequence number, store the canonical message, and emit delivery jobs.",
          "Delivery workers can retry safely when inbox writes are idempotent with a unique recipient/group/sequence key.",
          "The pattern scales group chat and feeds because large fanout work no longer blocks the ordered ingestion lane.",
          "Backpressure still matters: isolate sequencer lag from delivery lag, shard large groups, prioritize important recipients, and monitor hot keys.",
        ]}
      />

      <CheckYourself question="Why not let parallel delivery workers choose the message sequence number?">
        They would race. Different workers could assign conflicting or inconsistent
        order, and recipients might disagree about which message came first. A
        single per-group sequencer assigns order once before delivery fans out.
      </CheckYourself>

      <CheckYourself question="A 100,000-member group sends one message. What should stage 1 do before stage 2 starts?">
        Stage 1 should assign the next group sequence number, persist the
        canonical message, and enqueue delivery work. It should not write all
        100,000 inbox rows inline; stage 2 should split that delivery into
        parallel recipient batches.
      </CheckYourself>

      <CheckYourself question="How do retries avoid duplicate inbox entries?">
        Make inbox writes idempotent with a unique key such as
        <code>{"{recipient_id, group_id, seq}"}</code>. If a delivery batch is
        retried after a crash, the upsert sees the existing row and does not
        create a second copy.
      </CheckYourself>
    </Prose>
  );
}
