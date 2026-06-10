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
        <Term>Rate limiting</Term> controls how many requests a caller can make in
        a period of time. It protects shared resources from abuse, bugs, scrapers,
        brute-force attacks, and sudden traffic spikes while preserving fairness
        for well-behaved users.
      </P>

      <Analogy>
        A rate limiter is the bouncer and ticket dispenser at a busy venue. People
        can enter quickly when there is spare capacity, but the door never lets an
        unlimited crowd stampede inside. Some guests have VIP tickets, some have
        general admission, and everyone gets a clear answer about when to try
        again.
      </Analogy>

      <LessonSection id="problem" title="The problem: one caller can consume the shared system">
        <P>
          The failure mode is not only malicious denial-of-service. A mobile app
          bug can retry in a tight loop, a partner integration can batch the wrong
          way, a crawler can walk every URL, or a login attacker can try millions
          of passwords. Without limits, one actor can exhaust CPU, database
          connections, queue capacity, third-party quotas, or your cloud budget.
        </P>
        <UL>
          <LI>
            <Term>Availability:</Term> protect backends so one noisy caller does
            not starve everyone else.
          </LI>
          <LI>
            <Term>Security:</Term> slow brute-force logins, credential stuffing,
            scraping, and token guessing.
          </LI>
          <LI>
            <Term>Fairness:</Term> enforce per-plan or per-tenant quotas so paid
            capacity is shared predictably.
          </LI>
          <LI>
            <Term>Cost control:</Term> cap expensive operations such as AI calls,
            exports, SMS sends, and search aggregations.
          </LI>
        </UL>
        <Callout type="key" title="The core idea">
          Identify a caller, choose a quota policy, atomically record consumption,
          and either allow the request or reject it with a clear retry contract.
        </Callout>
      </LessonSection>

      <LessonSection id="dimensions" title="What key are you limiting?">
        <P>
          Rate limiting is only as good as the identity key behind it. Different
          endpoints need different dimensions, and production systems often stack
          several limits on the same request.
        </P>
        <CompareTable
          headers={["Dimension", "Good for", "Caution"]}
          rows={[
            ["Per IP", "Anonymous traffic, login attempts, public pages", "NATs and mobile carriers put many users behind one IP"],
            ["Per user", "Authenticated product limits and fairness", "Attackers may create many accounts"],
            ["Per API key", "Developer platforms and partner quotas", "Keys can be leaked or shared"],
            ["Per tenant / org", "B2B plan enforcement", "One tenant can contain many users with different roles"],
            ["Per route / action", "Protect expensive endpoints", "Policies become complex if every route is unique"],
          ]}
        />
        <P>
          A login endpoint might limit per IP, per username, and per device
          fingerprint. An API platform might limit per API key globally, per route
          for expensive exports, and per organization for monthly plan quotas.
        </P>
      </LessonSection>

      <LessonSection id="algorithms" title="Algorithms: fixed, sliding, token, and leaky buckets">
        <P>
          The algorithm decides how strict the limiter is about bursts and how much
          state it must store. There is no universal best choice; pick the simplest
          algorithm that matches the product and abuse pattern.
        </P>
        <CompareTable
          headers={["Algorithm", "How it works", "Strength", "Gotcha"]}
          rows={[
            ["Fixed window", "Count requests in wall-clock buckets such as 10:00:00-10:00:59", "Very simple and cheap", "Allows double bursts at boundaries"],
            ["Sliding window log", "Store timestamps for each request and count those within the last N seconds", "Accurate rolling limit", "Potentially high memory for hot keys"],
            ["Sliding window counter", "Blend previous and current fixed-window counts by elapsed time", "Good approximation with low state", "Approximate, not exact"],
            ["Token bucket", "Tokens refill steadily up to a capacity; each request spends tokens", "Allows controlled bursts with a long-run rate", "Needs careful atomic math across servers"],
            ["Leaky bucket", "Requests drain at a constant rate like a queue", "Smooths downstream traffic", "Can add latency or drop when queue is full"],
          ]}
        />
        <H3>Token bucket mechanics</H3>
        <P>
          Token bucket is popular because it separates burst size from average
          rate. A caller can save up tokens during idle time and spend them in a
          short burst, but over time tokens refill only at the configured rate.
        </P>
        <CodeBlock label="token bucket pseudocode">{`# capacity = maximum burst, refill_rate = tokens per second
now = current_time_seconds()
bucket = load(key)  # { tokens, last_refill_at }

elapsed = now - bucket.last_refill_at
bucket.tokens = min(capacity, bucket.tokens + elapsed * refill_rate)
bucket.last_refill_at = now

if bucket.tokens >= cost:
    bucket.tokens -= cost
    save(key, bucket)
    allow_request()
else:
    retry_after = (cost - bucket.tokens) / refill_rate
    save(key, bucket)
    reject_429(retry_after)`}</CodeBlock>
        <Callout type="tip" title="Requests can have different costs">
          Not all requests are equal. A cheap <code>GET /profile</code> might cost
          one token, while <code>POST /exports</code> or an AI inference endpoint
          costs 50 tokens because it consumes more CPU, queue time, or money.
        </Callout>
      </LessonSection>

      <LessonSection id="distributed" title="Distributed rate limiting with Redis">
        <P>
          A limiter on one server is easy; a limiter across a fleet is harder. If
          you run ten API servers and each keeps its own in-memory counter, a user
          can receive ten times the intended quota. The decision must be made in a
          shared, atomic place or partitioned carefully by key.
        </P>
        <CodeBlock label="fixed-window Redis limiter with atomic increment">{`key = f"rl:{api_key}:{epoch_minute}"
count = redis.incr(key)
if count == 1:
    redis.expire(key, 60)

if count > LIMIT:
    return 429
return allow`}</CodeBlock>
        <P>
          Redis is common because operations such as increment, expire, sorted-set
          updates, and Lua scripts are fast and atomic on a single key. For token
          bucket or sliding-window logic, use a Lua script or Redis function so
          read-modify-write happens as one operation.
        </P>
        <CodeBlock label="why Lua/atomic scripts matter">{`# unsafe if two servers do this concurrently:
tokens = redis.get(key)
if tokens > 0:
    redis.set(key, tokens - 1)

# safe pattern:
EVAL token_bucket_script key now capacity refill_rate cost
# Redis executes the script atomically for that key`}</CodeBlock>
        <UL>
          <LI>
            <Term>Hot keys:</Term> a global limit can concentrate all traffic on
            one Redis key. Prefer per-caller keys or sharded counters when needed.
          </LI>
          <LI>
            <Term>Redis outage policy:</Term> decide whether to fail open, fail
            closed, or use a small local fallback for each route.
          </LI>
          <LI>
            <Term>Clock behavior:</Term> token calculations depend on time. Use
            server-side Redis time or consistent gateway clocks when possible.
          </LI>
        </UL>
        <Callout type="info" title="Related building block">
          Redis is the usual shared counter store. Review
          <XLink href="/learn/pattern-redis"> the Redis pattern</XLink> for cache,
          counter, and atomic-operation design details.
        </Callout>
      </LessonSection>

      <LessonSection id="responses" title="Response semantics: 429, Retry-After, and RateLimit headers">
        <P>
          A good limiter does not just say no; it teaches clients how to behave.
          The standard rejection status is <code>429</code>
          <Term> Too Many Requests</Term>. Include retry information so SDKs,
          browsers, and partner integrations can back off instead of hammering the
          endpoint.
        </P>
        <CodeBlock label="rate limit response example">{`HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 17
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 17

{
  "error": "rate_limited",
  "message": "Too many requests. Retry after 17 seconds."
}`}</CodeBlock>
        <UL>
          <LI>
            <Term>Retry-After:</Term> seconds or an HTTP date indicating when the
            client should retry.
          </LI>
          <LI>
            <Term>RateLimit-Limit:</Term> the quota being applied, such as 100
            requests per minute.
          </LI>
          <LI>
            <Term>RateLimit-Remaining:</Term> how many requests remain in the
            current policy view.
          </LI>
          <LI>
            <Term>RateLimit-Reset:</Term> when capacity is expected to become
            available again.
          </LI>
        </UL>
        <Callout type="warning" title="Do not leak sensitive policy details">
          Headers are useful for legitimate clients, but auth and abuse endpoints
          may intentionally return coarser information. For example, login limits
          should avoid revealing whether a username exists.
        </Callout>
      </LessonSection>

      <LessonSection id="where" title="Where to enforce rate limits">
        <P>
          Rate limits can be enforced at several layers. The right answer is often
          layered: coarse protection at the edge, product quotas at the gateway,
          and domain-specific limits near the expensive resource.
        </P>
        <CompareTable
          headers={["Layer", "Best at", "Example"]}
          rows={[
            ["CDN / WAF edge", "Absorbing obvious abuse before it reaches your network", "Block IPs sending thousands of requests per second"],
            ["API gateway", "Consistent API-key, user, tenant, and route quotas", "1000 requests/min per partner key"],
            ["Service", "Domain-specific costs and permissions", "Only 3 password reset emails per account per hour"],
            ["Queue / worker", "Smoothing expensive asynchronous work", "Limit report generation concurrency per tenant"],
            ["Database / third-party client", "Protecting scarce downstream capacity", "Cap SMS sends or payment-provider calls"],
          ]}
        />
        <P>
          Edge enforcement is fast and cheap but may not know the authenticated
          user. Service enforcement knows the domain but happens after traffic has
          already consumed gateway and network capacity. Use both when the endpoint
          is important.
        </P>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and production gotchas">
        <UL>
          <LI>
            <Term>Window boundary bursts:</Term> fixed windows can allow nearly
            double the intended rate around reset time.
          </LI>
          <LI>
            <Term>Identity evasion:</Term> attackers rotate IPs, accounts, or API
            keys. Combine dimensions and anomaly detection for sensitive routes.
          </LI>
          <LI>
            <Term>Legitimate shared IPs:</Term> schools, offices, and mobile
            carriers can make many real users appear as one IP.
          </LI>
          <LI>
            <Term>Retries amplify load:</Term> clients that ignore
            <code>Retry-After</code> can turn a small overload into a retry storm.
          </LI>
          <LI>
            <Term>Multi-region limits:</Term> globally strict limits require
            cross-region coordination, which adds latency; many systems accept
            approximate regional limits for availability.
          </LI>
          <LI>
            <Term>Observability:</Term> track allowed, rejected, shadow-rejected,
            and near-limit counts by route and caller type before tightening
            policies.
          </LI>
        </UL>
        <Callout type="tip" title="Roll out in shadow mode first">
          Before rejecting real traffic, compute the limit and log what would have
          been blocked. Shadow mode reveals accidental customer impact and helps
          tune thresholds.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Rate limiting protects availability, security, fairness, and cost by controlling how much work each caller can create.",
          "Choose the right identity key: per IP, user, API key, tenant, route, or a layered combination depending on the endpoint.",
          "Fixed windows are simple, sliding logs are accurate, sliding counters approximate rolling limits, token buckets allow controlled bursts, and leaky buckets smooth output.",
          "Distributed limiters need shared atomic state, commonly Redis with INCR/EXPIRE, sorted sets, or Lua scripts for token bucket logic.",
          "Reject with HTTP 429 plus Retry-After and RateLimit headers, and enforce limits at the edge, gateway, service, or queue depending on what you are protecting.",
        ]}
      />

      <CheckYourself question="Why does a fixed-window limiter allow boundary bursts?">
        The counter resets at a sharp wall-clock boundary. A caller can send the
        full quota at the end of one minute and the full quota again at the start
        of the next, creating a short burst near twice the intended rate.
      </CheckYourself>

      <CheckYourself question="Why do distributed limiters usually need Redis or another shared atomic store?">
        If every API server keeps only local counters, each server can allow the
        full quota independently. A shared atomic store lets the fleet make one
        consistent decision for a caller and prevents race conditions during
        read-modify-write updates.
      </CheckYourself>

      <CheckYourself question="What should a well-behaved API return when rejecting a request for rate limiting?">
        Return HTTP <code>429</code> with a clear error body and retry metadata,
        especially <code>Retry-After</code>. RateLimit headers can also tell the
        client the policy, remaining capacity, and reset time.
      </CheckYourself>
    </Prose>
  );
}
