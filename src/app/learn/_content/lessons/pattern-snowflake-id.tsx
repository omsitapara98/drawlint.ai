import {
  Prose,
  LessonSection,
  H3,
  P,
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
        Distributed systems need ids that are unique without asking one central
        database for permission. <Term>Snowflake IDs</Term> solve this by packing
        time, worker identity, and a per-millisecond sequence into one 64-bit
        integer. The result is globally unique, roughly time-sortable, compact,
        and generated locally at very high speed.
      </P>

      <Analogy>
        Imagine every factory line has a unique stamp. Each product gets stamped
        with the current millisecond, the line number, and the item&apos;s sequence
        number on that line for that millisecond. No central office hands out
        numbers, but the labels still sort mostly in production order.
      </Analogy>

      <LessonSection id="problem" title="The problem: unique ids without a single bottleneck">
        <P>
          Auto-increment ids are wonderfully simple on one database. They become a
          bottleneck when writes are sharded across regions, partitions, or
          services. Random UUIDv4 values avoid coordination but scatter inserts
          across B-tree indexes and are long in URLs. Snowflake-style ids are a
          middle ground: local generation with enough structure to sort by time.
        </P>
        <CompareTable
          headers={["Scheme", "Coordination", "Sortability", "Size", "Common pain"]}
          rows={[
            ["Auto-increment integer", "Central database or shard-specific allocator", "Perfect within one sequence", "Small", "Hard to scale globally; leaks row counts"],
            ["UUIDv4", "None", "Random", "128 bits / 36 chars", "Poor index locality and long URLs"],
            ["ULID / UUIDv7", "None", "Time-sortable", "128 bits", "Larger than Snowflake, but very portable"],
            ["Snowflake", "Only worker id assignment", "Roughly time-sortable", "64 bits", "Requires clock-skew handling"],
          ]}
        />
        <Callout type="key" title="The core idea">
          Put enough information in the id itself that independent machines can
          generate ids safely: when, which machine, and which number on that
          machine during that millisecond.
        </Callout>
      </LessonSection>

      <LessonSection id="layout" title="The 64-bit layout: timestamp | worker | sequence">
        <P>
          The classic Twitter Snowflake layout uses 41 bits for milliseconds since
          a custom epoch, 10 bits for machine or worker id, and 12 bits for a
          sequence counter. Many companies tune the bit split, but the mechanical
          idea is the same.
        </P>
        <CodeBlock label="classic Snowflake bit layout">{`0 | 41-bit timestamp | 10-bit worker id | 12-bit sequence
  |                 |                  |
  |                 |                  └─ 0..4095 ids per millisecond per worker
  |                 └─ 0..1023 workers
  └─ sign bit kept 0 so the id stays positive

id = ((timestampMillis - customEpoch) << 22)
   | (workerId << 12)
   | sequence`}</CodeBlock>
        <UL>
          <LI>
            <Term>41-bit timestamp:</Term> roughly 69 years of millisecond values
            from a custom epoch. Choosing a recent epoch keeps the number smaller
            for longer.
          </LI>
          <LI>
            <Term>10-bit worker id:</Term> 1024 unique generators. You can split
            this further into region bits, rack bits, and process bits.
          </LI>
          <LI>
            <Term>12-bit sequence:</Term> 4096 ids per millisecond per worker,
            or about 4 million ids per second per worker if the clock advances
            normally.
          </LI>
        </UL>
        <H3>Generation algorithm</H3>
        <CodeBlock label="local id generator">{`generateId():
  now = currentTimeMillis()

  if now < lastTimestamp:
    handleClockMovedBackwards(lastTimestamp - now)

  if now == lastTimestamp:
    sequence = (sequence + 1) & 4095
    if sequence == 0:
      now = waitUntilNextMillis(lastTimestamp)
  else:
    sequence = 0

  lastTimestamp = now
  return ((now - epoch) << 22) | (workerId << 12) | sequence`}</CodeBlock>
      </LessonSection>

      <LessonSection id="properties" title="Properties: time-sortable and globally unique">
        <P>
          Snowflake ids are unique as long as two workers never use the same
          worker id at the same time and a worker never emits the same sequence for
          the same millisecond. Because the timestamp occupies the high bits,
          numeric ordering is also roughly chronological.
        </P>
        <UL>
          <LI>
            <Term>No per-id coordination:</Term> the generator does not call a
            database, Redis, or central service for every id. It only needs a
            unique worker id assignment at startup or deployment time.
          </LI>
          <LI>
            <Term>Index locality:</Term> new ids tend to append near the end of a
            B-tree primary key rather than landing randomly across pages like
            UUIDv4.
          </LI>
          <LI>
            <Term>Readable timing:</Term> you can decode approximate creation time
            from the id, which helps debugging but may be a privacy concern.
          </LI>
        </UL>
        <Callout type="warning" title="Roughly ordered does not mean causally ordered">
          Two regions with slightly different clocks can produce ids that sort in
          surprising order. Snowflake gives practical time locality, not a proof
          that event A happened before event B across the whole world.
        </Callout>
      </LessonSection>

      <LessonSection id="clock-skew" title="Clock skew and worker id assignment">
        <P>
          Clock movement is the sharp edge. If a worker generated ids at timestamp
          10,000 and the machine clock jumps back to 9,990, reusing the same
          sequence range could create duplicates. Production generators must
          define an explicit policy.
        </P>
        <CompareTable
          headers={["Problem", "Typical handling", "Trade-off"]}
          rows={[
            ["Small backward jump", "Wait until the previous timestamp catches up", "Adds latency but preserves monotonicity"],
            ["Large backward jump", "Refuse to generate ids and alert", "Availability hit, but avoids duplicates"],
            ["Worker id collision", "Lease worker ids through config, Zookeeper, etcd, or Kubernetes identity", "Operational dependency at startup"],
            ["Sequence overflow in one ms", "Block until next millisecond", "Very brief pause under extreme local burst"],
          ]}
        />
        <CodeBlock label="safe response to clock moving backward">{`if nowMillis < lastTimestamp:
  drift = lastTimestamp - nowMillis

  if drift <= 5:
    sleep(drift)
    nowMillis = currentTimeMillis()
  else:
    raise FatalGeneratorError("clock moved backwards; refusing ids")`}</CodeBlock>
        <P>
          Worker ids also deserve discipline. Static config is fine for a small
          fleet; large fleets usually allocate worker ids as leases so a restarted
          process cannot accidentally share an id with an old process still alive.
        </P>
      </LessonSection>

      <LessonSection id="base62" title="Base62: shortening ids for URLs">
        <P>
          A 64-bit integer can be shown in decimal, but decimal ids are longer
          than necessary. <Term>Base62</Term> uses digits, lowercase letters, and
          uppercase letters, so each character carries more information. It turns a
          large numeric id into a shorter URL-safe string without changing the
          underlying id.
        </P>
        <CodeBlock label="decimal to Base62 shape">{`Snowflake decimal:  1992462857987428352
Base62 encoded:     2eX4r1YpQnK

alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
while id > 0:
  output.prepend(alphabet[id % 62])
  id = floor(id / 62)`}</CodeBlock>
        <UL>
          <LI>
            <Term>Good for:</Term> short URLs, paste ids, invite codes, ticket ids,
            and public resource ids that should remain compact.
          </LI>
          <LI>
            <Term>Not encryption:</Term> Base62 is just representation. Anyone can
            decode it back to the numeric id unless you add separate obfuscation.
          </LI>
          <LI>
            <Term>Case sensitivity:</Term> Base62 relies on uppercase and lowercase
            being distinct. Avoid it in channels that fold case.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and real-world examples">
        <P>
          Snowflake-style ids show up in social posts, chat messages, orders,
          analytics events, and URL shorteners. They are especially useful when
          many write nodes need to create ids before a database write. They are not
          automatically the right choice for secret tokens, password resets, or
          anything that must be unpredictable.
        </P>
        <UL>
          <LI>
            <Term>Predictability:</Term> time-sortable ids leak approximate volume
            and creation time. Use random tokens for security-sensitive links.
          </LI>
          <LI>
            <Term>JavaScript precision:</Term> 64-bit integers exceed safe integer
            precision in JavaScript numbers. Send them as strings to browsers.
          </LI>
          <LI>
            <Term>Custom epoch rollover:</Term> 41 bits lasts decades, not forever.
            Document the epoch and migration plan.
          </LI>
          <LI>
            <Term>Shard hints:</Term> do not overload worker bits as your only
            routing scheme unless you are comfortable exposing infrastructure
            details in public ids.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Snowflake ids pack timestamp, worker id, and sequence into a compact 64-bit integer generated without per-id coordination.",
          "The timestamp in high bits makes ids roughly time-sortable, improving database index locality compared with UUIDv4.",
          "Uniqueness depends on unique worker ids and safe handling of sequence overflow and backward clock jumps.",
          "Base62 shortens the decimal representation for URLs, but it is encoding, not encryption or unpredictability.",
          "Use Snowflake for high-volume entities and events; use random tokens when secrecy or non-guessability matters.",
        ]}
      />

      <CheckYourself question="Why can Snowflake ids be generated without asking a central database for each id?">
        Each generator owns a unique worker id and combines it with the current
        millisecond plus a local sequence counter. That combination is enough to
        avoid collisions locally and across workers without a per-id network call.
      </CheckYourself>

      <CheckYourself question="What should a generator do if the clock moves backward?">
        For a tiny drift it can wait until the clock catches up. For a larger jump
        it should stop generating ids and alert, because continuing could reuse a
        timestamp and sequence range that already produced ids.
      </CheckYourself>

      <CheckYourself question="Why send Snowflake ids to JavaScript clients as strings?">
        JavaScript numbers cannot exactly represent every 64-bit integer. Sending
        the id as a string preserves the exact value for display, routing, and API
        calls.
      </CheckYourself>
    </Prose>
  );
}
