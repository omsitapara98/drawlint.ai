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
  Figure,
  CompareTable,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        A <Term>circuit breaker</Term> protects your service from repeatedly
        calling a dependency that is already failing or dangerously slow. Instead
        of letting every request wait on the same sick payment gateway, search
        cluster, or shipping API, the breaker trips and fails fast. That sounds
        harsh, but fast failure is often what keeps the rest of the system alive.
      </P>

      <Analogy>
        The electrical breaker in a house does not fix a short circuit. It cuts
        power so the fault does not overheat wires and burn the house down. A
        software circuit breaker does the same for remote calls: it stops feeding
        traffic into a failure until there is evidence the dependency can handle
        traffic again.
      </Analogy>

      <LessonSection id="problem" title="The problem: cascading failure">
        <P>
          Distributed systems fail by waiting. A dependency does not need to be
          fully down to hurt you; it can simply become slow. If your checkout API
          has 200 request threads and each payment call normally takes 100 ms, the
          system is healthy. If the payment provider starts taking 30 seconds,
          those 200 threads fill with waiting calls. Soon even requests that do
          not need payments cannot get a thread, and one slow dependency becomes
          a full checkout outage.
        </P>
        <CodeBlock label="how slowness cascades">{`healthy:
  checkout thread -> payment API returns in 100 ms -> thread is free

payment API degraded:
  checkout thread -> waits 30 seconds
  more requests arrive -> more threads wait
  thread pool fills -> queue grows
  callers retry -> even more traffic
  checkout appears down even though its own code is healthy`}</CodeBlock>
        <UL>
          <LI>
            <Term>Resource exhaustion:</Term> threads, sockets, connection pools,
            and memory are held by doomed calls.
          </LI>
          <LI>
            <Term>Retry storms:</Term> clients retry slow calls, multiplying load
            on both your service and the failing dependency.
          </LI>
          <LI>
            <Term>Backpressure arrives too late:</Term> by the time queues are
            full, latency has already spread to unrelated features.
          </LI>
        </UL>
        <Callout type="key" title="The core idea">
          Track recent failures. When the dependency crosses a threshold, stop
          calling it for a reset window. Return a fallback or a fast error until a
          small probe succeeds.
        </Callout>
      </LessonSection>

      <LessonSection id="states" title="The state machine: closed, open, half-open">
        <P>
          A breaker is a small state machine wrapped around a remote call. It is
          normally <Term>closed</Term>, meaning traffic flows through. After too
          many failures, it becomes <Term>open</Term>, meaning calls fail
          immediately. After a reset timeout, it becomes <Term>half-open</Term>,
          allowing a limited number of probe calls to test recovery.
        </P>
        <Figure caption="Circuit breaker state machine">
          <svg viewBox="0 0 720 180" className="h-auto w-full">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" className="fill-zinc-500" />
              </marker>
            </defs>
            <rect x="35" y="55" width="150" height="62" rx="10" className="fill-emerald-500/15 stroke-emerald-500" strokeWidth="1.5" />
            <text x="110" y="82" textAnchor="middle" className="fill-emerald-300 text-[13px] font-semibold">CLOSED</text>
            <text x="110" y="101" textAnchor="middle" className="fill-zinc-300 text-[10px]">calls pass through</text>
            <rect x="285" y="55" width="150" height="62" rx="10" className="fill-amber-500/15 stroke-amber-500" strokeWidth="1.5" />
            <text x="360" y="82" textAnchor="middle" className="fill-amber-300 text-[13px] font-semibold">OPEN</text>
            <text x="360" y="101" textAnchor="middle" className="fill-zinc-300 text-[10px]">fail fast</text>
            <rect x="535" y="55" width="150" height="62" rx="10" className="fill-violet-500/15 stroke-violet-500" strokeWidth="1.5" />
            <text x="610" y="82" textAnchor="middle" className="fill-violet-300 text-[13px] font-semibold">HALF-OPEN</text>
            <text x="610" y="101" textAnchor="middle" className="fill-zinc-300 text-[10px]">probe recovery</text>
            <line x1="185" y1="86" x2="285" y2="86" className="stroke-zinc-500" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="235" y="70" textAnchor="middle" className="fill-zinc-300 text-[10px]">failure threshold</text>
            <line x1="435" y1="86" x2="535" y2="86" className="stroke-zinc-500" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="485" y="70" textAnchor="middle" className="fill-zinc-300 text-[10px]">reset timeout</text>
            <path d="M610 117 C610 155 110 155 110 117" fill="none" className="stroke-zinc-500" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="360" y="166" textAnchor="middle" className="fill-zinc-300 text-[10px]">probe succeeds → close</text>
            <path d="M610 55 C610 25 360 25 360 55" fill="none" className="stroke-zinc-500" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="485" y="22" textAnchor="middle" className="fill-zinc-300 text-[10px]">probe fails → re-open</text>
          </svg>
        </Figure>
        <CodeBlock label="minimal breaker logic">{`state = "closed"

if state == "open" and now < opened_at + reset_timeout:
    return fallback_or_fast_error()

if state == "open" and now >= opened_at + reset_timeout:
    state = "half_open"

try:
    response = call_dependency_with_timeout()
    record_success()
    if state == "half_open":
        state = "closed"
    return response
except TimeoutOrError:
    record_failure()
    if failure_rate_over_window() > threshold:
        state = "open"
        opened_at = now
    return fallback_or_fast_error()`}</CodeBlock>
      </LessonSection>

      <LessonSection id="thresholds" title="Thresholds, windows, and reset timeouts">
        <P>
          A breaker needs a memory of recent calls. Most production libraries use
          a sliding window: the last N calls or the last T seconds. The breaker
          opens when enough calls have occurred and the failure percentage crosses
          a configured threshold. This avoids tripping on one random packet loss.
        </P>
        <CompareTable
          headers={["Setting", "Purpose", "Typical question"]}
          rows={[
            ["Minimum calls", "Avoids decisions on tiny samples", "Have we seen at least 20 calls?"],
            ["Failure threshold", "Defines when the dependency is unhealthy", "Are more than 50% failing?"],
            ["Slow-call threshold", "Treats dangerous latency as failure", "Are calls taking over 2 seconds?"],
            ["Reset timeout", "Waits before probing recovery", "Should we try again after 30 seconds?"],
            ["Half-open permits", "Limits recovery traffic", "Allow 1 to 10 probes, not full traffic"],
          ]}
        />
        <H3>Failures include latency</H3>
        <P>
          Count timeouts and slow calls, not only HTTP <code>500</code> responses.
          A dependency that returns after 60 seconds is effectively failing if
          your user-facing timeout is 2 seconds. Breakers work best when every
          dependency call has a strict timeout.
        </P>
        <Callout type="tip" title="Tune for the user journey">
          A search suggestion service can trip aggressively and show fewer
          suggestions. A payment authorization service may need a more cautious
          threshold and a clear error path. The breaker policy belongs to the
          business impact of the call, not to a generic global default.
        </Callout>
      </LessonSection>

      <LessonSection id="fallbacks" title="Fast-fail and fallback behavior">
        <P>
          When a breaker is open, you have two choices: return a fast error or
          return a degraded response. The important part is that you do not keep
          making the failing call. A fallback should be honest, cheap, and safe.
        </P>
        <CompareTable
          headers={["Dependency", "Possible fallback", "Risk"]}
          rows={[
            ["Recommendation API", "Show popular items from cache", "Less personalized"],
            ["Inventory estimate", "Show unavailable or ask user to retry", "May reduce conversions"],
            ["Payment gateway", "Fail checkout with a clear retry message", "User cannot complete purchase"],
            ["Fraud scoring", "Route to manual review", "More operational work"],
          ]}
        />
        <UL>
          <LI>
            <Term>Fail closed:</Term> block the action when safety matters, such
            as payment, authorization, or fraud checks.
          </LI>
          <LI>
            <Term>Fail open:</Term> degrade gracefully when the feature is
            optional, such as recommendations, avatars, or analytics.
          </LI>
          <LI>
            <Term>Cached fallback:</Term> serve a stale but acceptable value if
            users benefit more from partial data than from an error.
          </LI>
        </UL>
        <Callout type="warning" title="Fallbacks can become hidden dependencies">
          A fallback that calls another overloaded service can create a second
          cascade. Keep fallbacks local when possible: cached data, static
          defaults, queued work, or a clear fast error.
        </Callout>
      </LessonSection>

      <LessonSection id="resilience" title="Pairing breakers with timeouts, retries, and bulkheads">
        <P>
          Circuit breakers are one piece of a resilience toolkit. They should
          almost never be the only protection around a remote call. Use timeouts
          to bound waiting, retries to handle small transient failures, backoff
          and jitter to avoid synchronized retry storms, and bulkheads to isolate
          resources per dependency.
        </P>
        <CodeBlock label="resilience wrapper order">{`user request
  → bulkhead: acquire a small dependency-specific slot
  → circuit breaker: is this dependency currently allowed?
  → timeout: cap each attempt
  → retry: only safe errors, exponential backoff + jitter
  → dependency call
  → fallback or response`}</CodeBlock>
        <CompareTable
          headers={["Pattern", "Protects against", "How it pairs with breaker"]}
          rows={[
            ["Timeout", "Unbounded waiting", "Turns slow calls into counted failures"],
            ["Retry with backoff+jitter", "Brief network blips", "Must stop retrying when breaker opens"],
            ["Bulkhead", "One dependency consuming all resources", "Limits damage before breaker trips"],
            ["Rate limit", "Too much incoming or outgoing traffic", "Reduces pressure on a recovering service"],
          ]}
        />
        <P>
          In complex workflows, a breaker may cause one saga step to fail and
          trigger compensation. That is better than letting the workflow hang
          forever. See the <XLink href="/learn/pattern-saga">Saga Pattern</XLink>{" "}
          lesson for how long-running business flows recover from partial
          failure.
        </P>
      </LessonSection>

      <LessonSection id="libraries" title="Libraries, examples, and gotchas">
        <P>
          Most teams should use a battle-tested library instead of writing a
          breaker from scratch. Java services commonly use{" "}
          <Term>resilience4j</Term>. Older Netflix systems used{" "}
          <Term>Hystrix</Term>, which popularized circuit breakers and bulkheads
          but is now in maintenance mode. .NET teams often use Polly, and many
          service meshes provide outlier detection at the proxy layer.
        </P>
        <UL>
          <LI>
            <Term>Per-dependency breakers:</Term> do not share one breaker across
            unrelated APIs. The shipping provider should not trip the payment
            provider.
          </LI>
          <LI>
            <Term>Per-operation breakers:</Term> a cheap read endpoint and an
            expensive write endpoint may need different thresholds.
          </LI>
          <LI>
            <Term>Observability:</Term> emit breaker state, open duration,
            failure rate, slow-call rate, fallback count, and half-open probe
            outcomes.
          </LI>
          <LI>
            <Term>Cold starts:</Term> avoid opening on the first failure after a
            quiet period; require a minimum number of calls in the window.
          </LI>
        </UL>
        <Callout type="info" title="Real-world mental model">
          A breaker is not an error handler. It is an adaptive traffic controller
          for one dependency. Its job is to preserve capacity for work that can
          still succeed while the failing dependency recovers.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Circuit breakers stop cascading failure by failing fast when a dependency is repeatedly failing or too slow.",
          "The state machine is closed (normal calls), open (fast fail), and half-open (limited recovery probes).",
          "Configure failure thresholds, minimum call windows, slow-call detection, reset timeout, and half-open probe limits.",
          "Breakers work best with timeouts, retries using backoff and jitter, bulkheads, rate limits, and honest fallbacks.",
          "Use mature libraries such as resilience4j, Polly, or legacy Hystrix-style designs, and monitor breaker state as a first-class signal.",
        ]}
      />

      <CheckYourself question="Why can a slow dependency be as dangerous as a down dependency?">
        Slow calls hold threads, sockets, and connection-pool entries while they
        wait. As traffic continues, those resources fill up, queues grow, and
        unrelated requests cannot be served. A breaker turns repeated slowness
        into fast failure so the service keeps capacity for other work.
      </CheckYourself>

      <CheckYourself question="What happens in half-open state?">
        After the reset timeout, the breaker allows a small number of probe calls
        through. If probes succeed, the breaker closes and normal traffic resumes.
        If a probe fails or is too slow, the breaker re-opens and waits for
        another reset window.
      </CheckYourself>

      <CheckYourself question="Why should retries use backoff and jitter when paired with a circuit breaker?">
        Backoff spaces retries out, and jitter randomizes them so thousands of
        clients do not retry at the same instant. Without those controls, retries
        can amplify load on the failing dependency and make the breaker open more
        often.
      </CheckYourself>
    </Prose>
  );
}
