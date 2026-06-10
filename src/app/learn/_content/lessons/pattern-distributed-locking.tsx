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
        Some resources cannot be safely shared at the same moment: one concert
        seat, the last item in a warehouse, a scheduled appointment slot, or a
        background job that must have only one leader. A{" "}
        <Term>distributed lock</Term> grants temporary exclusive access across a
        fleet of servers. A <Term>seat hold</Term> is the product version of the
        same idea: reserve a scarce thing for a short time while the user checks
        out.
      </P>

      <Analogy>
        A distributed lock is a fitting-room token. If you hold token{" "}
        <code>{"#7"}</code>, nobody else can use stall <code>{"#7"}</code>. But
        the token expires if you walk away, because the store cannot let one
        absent shopper block the stall forever. The expiry is the lock lease.
      </Analogy>

      <LessonSection id="problem" title="The problem: temporary exclusivity under concurrency">
        <P>
          Overselling is a race condition. Two users see one remaining seat, two
          API servers process checkout, and both believe they won. In a single
          database transaction you might use a row lock, but many systems have
          multiple application servers, caches, payment steps, and user think
          time. You need a bounded claim that says &quot;this user has first
          right to finish&quot; without holding a database transaction open for
          five minutes.
        </P>
        <CodeBlock label="without a hold, reads race writes">{`T0: inventory says seat A12 is available
T1: user 1 starts checkout on server 1
T1: user 2 starts checkout on server 2
T2: both read "available"
T3: both attempt payment
T4: both mark A12 sold unless a lock, constraint, or version check stops one`}</CodeBlock>
        <P>
          The pattern is not just for tickets. It also protects coupon redemption,
          limited inventory, one-at-a-time cron jobs, migration runners, and any
          workflow where duplicate execution is expensive.
        </P>
        <Callout type="key" title="Lease, not ownership forever">
          A distributed lock should almost always be a <Term>lease</Term>: an
          exclusive claim with a TTL. If the holder crashes, the TTL releases the
          resource automatically.
        </Callout>
      </LessonSection>

      <LessonSection id="redis" title="Redis SET NX PX: the common fast lock">
        <P>
          Redis is popular because acquiring a lock is a single atomic command:
          set the key only if it does not exist, and attach an expiry in the same
          operation. Older examples call this <code>SETNX</code>; modern Redis
          uses <code>SET key value NX PX milliseconds</code>.
        </P>
        <CodeBlock label="acquire and release with owner token">{`# Acquire a 5-second lease.
owner = random_uuid()
ok = redis.set("lock:seat:A12", owner, nx=True, px=5000)
if not ok:
    return "seat is already held"

try:
    hold_seat_for_checkout("A12", user_id)
finally:
    # Release only if we still own the lock.
    redis.eval("""
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    """, keys=["lock:seat:A12"], args=[owner])`}</CodeBlock>
        <UL>
          <LI>
            <Term>NX:</Term> means &quot;only set if missing&quot;, so only one
            contender wins.
          </LI>
          <LI>
            <Term>PX:</Term> attaches a millisecond TTL, so the lock eventually
            disappears after a crash.
          </LI>
          <LI>
            <Term>Owner token:</Term> prevents a stale process from deleting a
            lock that someone else acquired after the TTL expired.
          </LI>
        </UL>
        <Callout type="warning" title="Never release with a blind DEL">
          If your process pauses longer than the TTL, another process can acquire
          the same lock. A later <code>DEL lock</code> from the old process would
          delete the new owner&apos;s lock. Always compare the owner token before
          deleting.
        </Callout>
      </LessonSection>

      <LessonSection id="fencing" title="Fencing tokens: protect the real resource from stale writers">
        <P>
          A lock only controls entry to a critical section; it does not magically
          stop a paused process from waking up and writing to the database. The
          classic failure is: process A acquires a lock, pauses during garbage
          collection, its TTL expires, process B acquires the lock and writes,
          then A wakes and writes stale data. <Term>Fencing tokens</Term> fix
          this by giving every successful lock acquisition a monotonically
          increasing number. Downstream storage rejects writes with an older
          token.
        </P>
        <CodeBlock label="acquire, write, and release with a fencing token">{`# Redis Lua script: claim the lock and issue a monotonic token.
token = redis.incr("lock-token:seat:A12")
ok = redis.set("lock:seat:A12", f"{owner}:{token}", nx=True, px=5000)
if not ok:
    return "already held"

# Every write carries the token.
UPDATE seat_holds
SET user_id = $user, fencing_token = $token, expires_at = now() + interval '5 minutes'
WHERE seat_id = 'A12'
  AND fencing_token < $token;

# If an old holder wakes up with token 41 after token 42 committed,
# the WHERE clause affects 0 rows. The stale write is fenced off.

# Release still compares the owner+token so an old holder cannot delete
# a newer holder's lease.
redis.eval("""
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
""", keys=["lock:seat:A12"], args=[f"{owner}:{token}"])`}</CodeBlock>
        <H3>Why the token belongs at the write target</H3>
        <P>
          The database, inventory service, or storage system that owns the
          resource must enforce the token comparison. Checking the token only in
          the lock service is not enough, because the stale process may already
          have passed that check before it paused.
        </P>
      </LessonSection>

      <LessonSection id="redlock" title="Redlock and the debate around Redis locks">
        <P>
          <Term>Redlock</Term> is an algorithm for acquiring locks across several
          independent Redis nodes. The client tries to obtain a majority of locks
          within a bounded time and treats the lease as valid only if enough nodes
          agree. It was designed to survive a single Redis node failure better
          than one standalone lock key.
        </P>
        <CompareTable
          headers={["Approach", "Good for", "Caveat"]}
          rows={[
            ["Single Redis lock", "Fast best-effort coordination, seat holds with final DB checks", "Redis failover or clock pauses can break assumptions"],
            ["Redlock", "Higher availability than one Redis node", "Debated for correctness under partitions, pauses, and timing assumptions"],
            ["DB row lock", "Strong correctness inside one database transaction", "Poor fit for long user think time"],
            ["Optimistic concurrency", "High-throughput inventory counters", "Losers retry after version conflict"],
          ]}
        />
        <Callout type="warning" title="The caveat: locks are timing-sensitive">
          Redis locks rely on TTLs, clocks, and bounded pauses. For correctness
          that protects money or scarce legal rights, pair the lock with a final
          source-of-truth check, a database unique constraint, or fencing tokens.
          Treat Redlock as a tool with assumptions, not as a universal distributed
          transaction.
        </Callout>
      </LessonSection>

      <LessonSection id="seat-hold" title="Worked example: a ticket seat hold">
        <P>
          A practical ticketing flow separates the temporary hold from the final
          sale. The hold gives a user a few minutes to pay. The final sale uses a
          durable database constraint so the seat cannot be sold twice even if the
          cache disappears.
        </P>
        <CodeBlock label="seat-hold lifecycle">{`1. User clicks seat A12
2. API acquires lock:seat:A12 with TTL = 5 minutes
3. API writes seat_holds(A12, user, expires_at, fencing_token)
4. UI shows countdown and starts checkout
5. User pays before expiry
6. API confirms sale with a DB transaction:
     - verify hold belongs to user and has not expired
     - INSERT INTO sold_seats(seat_id, order_id)  -- UNIQUE(seat_id)
     - delete hold / release Redis key
7. If user disappears, TTL expires and a sweeper marks the hold available`}</CodeBlock>
        <UL>
          <LI>
            <Term>Renewal:</Term> if checkout legitimately takes longer, renew
            the lock only while the owner token still matches. Cap total renewal
            time so one user cannot hold a seat indefinitely.
          </LI>
          <LI>
            <Term>Expiry:</Term> the UI countdown is advisory. The server decides
            whether the hold is still valid based on its stored expiry.
          </LI>
          <LI>
            <Term>Final constraint:</Term> a unique index on <code>sold_seats</code>{" "}
            is the last line of defense against oversell.
          </LI>
        </UL>
        <Callout type="info" title="Related building block">
          Redis is a common lock coordinator because its atomic commands are
          simple and fast. See the <XLink href="/learn/pattern-redis">Redis</XLink>{" "}
          lesson for the cache and data-structure primitives behind this pattern.
        </Callout>
      </LessonSection>

      <LessonSection id="alternatives" title="Alternatives and gotchas">
        <P>
          Distributed locks are often overused. If the resource already lives in
          one database, the database may provide a simpler and stronger primitive.
          Prefer the narrowest mechanism that protects the invariant.
        </P>
        <CompareTable
          headers={["Primitive", "Use when", "Watch out for"]}
          rows={[
            ["SELECT ... FOR UPDATE", "Short critical section inside one SQL transaction", "Do not hold while waiting for user input"],
            ["Unique constraint", "Exactly one row may exist for a resource", "Handle duplicate-key errors as normal control flow"],
            ["Optimistic version", "Many users update a counter or record", "Conflicting writers must retry"],
            ["Redis lease", "Short temporary holds across app servers", "Needs TTL, owner token, and final validation"],
            ["Queue partitioning", "One worker per key should process events", "Throughput is limited by hot keys"],
          ]}
        />
        <UL>
          <LI>
            <Term>TTL too short:</Term> valid work loses the lease, and a second
            holder may enter.
          </LI>
          <LI>
            <Term>TTL too long:</Term> crashed holders block the resource and
            frustrate users.
          </LI>
          <LI>
            <Term>Clock assumptions:</Term> prefer server-side expiries and
            monotonic tokens over trusting client clocks.
          </LI>
          <LI>
            <Term>Missing observability:</Term> track lock wait time, contention,
            expired holds, renewal failures, and final-sale conflicts.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Distributed locks and seat holds grant temporary exclusive access to scarce resources across many servers.",
          "A safe Redis lock uses SET key value NX PX ttl, a random owner token, and compare-before-delete release logic.",
          "Locks are leases: tune TTLs, renew carefully, and expect expiry after crashes or long pauses.",
          "Fencing tokens are the correctness upgrade: every acquisition gets a higher token, and the real resource rejects stale writes.",
          "Use alternatives such as DB row locks, unique constraints, optimistic concurrency, or queues when they protect the invariant more simply.",
        ]}
      />

      <CheckYourself question="Why must a Redis lock include a TTL?">
        Without a TTL, a process that crashes after acquiring the lock can block
        the resource forever. The TTL turns the lock into a lease, so the system
        eventually releases the seat, inventory item, or job leadership claim.
      </CheckYourself>

      <CheckYourself question="What stale-holder bug do fencing tokens prevent?">
        They prevent an old lock holder from writing after its lease expired and
        a newer holder acquired the resource. Because the newer holder has a
        higher token, the database or resource owner rejects the stale lower-token
        write.
      </CheckYourself>

      <CheckYourself question="Why might a ticketing system use both a Redis hold and a database unique constraint?">
        Redis gives a fast temporary hold and a good user experience during
        checkout. The database unique constraint is the durable final defense
        when confirming the sale, ensuring one seat ID can be sold only once even
        if the cache or application logic misbehaves.
      </CheckYourself>
    </Prose>
  );
}
