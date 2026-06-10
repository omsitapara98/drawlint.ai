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
        Once you have more than one server, clients need one stable place to send
        traffic. A <Term>load balancer</Term> is that front door: it accepts
        incoming connections, chooses a healthy backend, and keeps users away
        from servers that are overloaded, deploying, or broken.
      </P>

      <Analogy>
        A load balancer is the host stand at a busy restaurant. Guests do not
        choose a random table or inspect the kitchen; they talk to the host. The
        host knows which tables are open, which sections are overwhelmed, and
        which tables are unavailable because a glass just broke.
      </Analogy>

      <LessonSection id="problem" title="The problem: clients cannot manage your fleet">
        <P>
          Without a load balancer, every client would need to know every server,
          retry failed machines, avoid overloaded ones, and learn when new
          servers appear. That pushes operational complexity to browsers, mobile
          apps, partner integrations, and old clients you cannot quickly update.
        </P>
        <CodeBlock label="why the fleet needs a front door">{`bad shape:
  client -> app-1 or app-2 or app-3
  client must know which nodes exist
  client may keep calling a dead node

good shape:
  client -> load balancer -> healthy app node
  clients keep one stable DNS name`}</CodeBlock>
        <UL>
          <LI>
            <Term>Performance:</Term> spread requests so one node does not melt
            while another sits idle.
          </LI>
          <LI>
            <Term>Availability:</Term> stop routing to nodes that fail health
            checks.
          </LI>
          <LI>
            <Term>Elasticity:</Term> add or remove servers without changing the
            public endpoint clients use.
          </LI>
          <LI>
            <Term>Operational safety:</Term> drain traffic before a deploy, then
            return the node after it passes health checks.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="l4-l7" title="Layer 4 vs Layer 7 load balancing">
        <P>
          Load balancers operate at different layers. The layer determines what
          the balancer can see and therefore what decisions it can make.
        </P>
        <CompareTable
          headers={["Dimension", "Layer 4: transport", "Layer 7: application"]}
          rows={[
            ["What it sees", "IP addresses, ports, TCP or UDP", "HTTP method, host, path, headers, cookies"],
            ["Routing style", "Connection forwarding", "Request-aware routing"],
            ["Strength", "Very fast and protocol-agnostic", "Smart policies and HTTP features"],
            ["Examples", "TCP database proxy, game traffic, raw TLS pass-through", "Route /api and /images to different pools"],
            ["Trade-off", "Less context", "More CPU and more behavior to configure"],
          ]}
        />
        <H3>How the mechanics differ</H3>
        <CodeBlock label="same request, different visibility">{`Layer 4 sees:
  source IP, destination IP, destination port 443, TCP state
  decision: choose a backend connection

Layer 7 sees after HTTP parsing or TLS termination:
  GET /checkout
  Host: shop.example.com
  Cookie: session=...
  decision: route checkout traffic to checkout-service`}</CodeBlock>
        <P>
          Use L4 when you need speed, simplicity, or non-HTTP traffic. Use L7
          when routing depends on HTTP meaning: hostnames, paths, headers,
          cookies, authentication, redirects, rate limits, or canary releases.
        </P>
      </LessonSection>

      <LessonSection id="algorithms" title="How a load balancer chooses a backend">
        <P>
          The algorithm is the policy for picking a server. There is no universal
          best choice; the right policy depends on whether requests have similar
          cost, whether servers have different sizes, and whether requests need
          affinity to cached or local state.
        </P>
        <CompareTable
          headers={["Algorithm", "How it works", "Best fit", "Gotcha"]}
          rows={[
            ["Round-robin", "Send request 1 to A, 2 to B, 3 to C, then repeat", "Similar servers and similar request cost", "Long requests can pile up unevenly"],
            ["Least connections", "Pick the backend with the fewest active connections", "Mixed request durations, WebSockets, slow clients", "Needs accurate connection accounting"],
            ["Weighted", "Give larger servers a larger share", "Heterogeneous fleets or gradual migration", "Bad weights overload weak nodes"],
            ["Hashing", "Hash a key such as IP, user ID, or cookie to choose a node", "Sticky routing, cache locality, session affinity", "Hot keys and node changes can skew load"],
          ]}
        />
        <CodeBlock label="weighted round-robin intuition">{`servers:
  app-a weight 1
  app-b weight 1
  app-c weight 2

schedule:
  a, b, c, c, a, b, c, c...

app-c receives about 50% of traffic because it has twice the weight`}</CodeBlock>
        <Callout type="tip" title="Sticky sessions are a trade-off">
          Hashing or cookie affinity can keep a user on the same server, which is
          useful for local caches or legacy in-memory sessions. Prefer making app
          servers stateless instead. Sticky routing can hide state problems and
          makes a node failure painful for the users pinned to it.
        </Callout>
      </LessonSection>

      <LessonSection id="health" title="Health checks and connection draining">
        <P>
          A load balancer is only useful if it knows which backends are safe to
          use. Health checks are repeated probes from the load balancer to each
          server. When a server fails enough checks, the balancer removes it from
          rotation; when it recovers, the balancer can add it back.
        </P>
        <CodeBlock label="health-check loop">{`every 5 seconds:
  GET /healthz on each backend

if 2 checks fail:
  mark backend unhealthy
  stop sending new requests

if 3 checks pass:
  mark backend healthy
  slowly return traffic`}</CodeBlock>
        <UL>
          <LI>
            <Term>Liveness:</Term> is the process alive enough to respond at all?
          </LI>
          <LI>
            <Term>Readiness:</Term> is it ready to receive real traffic after
            boot, warmup, migrations, or dependency checks?
          </LI>
          <LI>
            <Term>Connection draining:</Term> stop sending new requests to a node
            while allowing existing requests to finish before deploy or shutdown.
          </LI>
        </UL>
        <Callout type="warning" title="A health check can lie">
          A shallow endpoint that always returns <code>200</code> can mark a
          broken node as healthy. A deep check that calls every dependency can
          create cascading failure. Good readiness checks validate the local
          process and only the dependencies truly required to serve traffic.
        </Callout>
      </LessonSection>

      <LessonSection id="redundancy" title="The load balancer can be a single point of failure">
        <P>
          The load balancer removes single-server risk from the app tier, but the
          balancer itself must not become the new fatal box. Production systems
          run redundant load balancers and give clients a way to reach a healthy
          one.
        </P>
        <CompareTable
          headers={["Redundancy pattern", "How it works", "Trade-off"]}
          rows={[
            ["Active-passive", "One balancer serves traffic; a standby takes over on failure", "Simple, but failover can take seconds"],
            ["Active-active", "Multiple balancers serve traffic at once", "Better utilization, more coordination"],
            ["DNS failover", "DNS answers shift away from unhealthy endpoints", "Easy globally, limited by DNS caching"],
            ["Anycast", "Same IP announced from many locations; routing finds a nearby healthy site", "Excellent global failover, operationally advanced"],
          ]}
        />
        <CodeBlock label="redundant front door">{`users
  -> DNS name api.example.com
      -> load-balancer-a
      -> load-balancer-b
          -> app pool in zone 1
          -> app pool in zone 2`}</CodeBlock>
        <P>
          Managed cloud load balancers usually hide much of this machinery, but
          the design question remains: if one balancer, one zone, or one IP path
          fails, where does traffic go?
        </P>
      </LessonSection>

      <LessonSection id="examples" title="Real-world examples and gotchas">
        <UL>
          <LI>
            <Term>E-commerce:</Term> an L7 balancer can route <code>/checkout</code>
            to a smaller protected pool while static images go through a CDN.
          </LI>
          <LI>
            <Term>Chat or gaming:</Term> long-lived TCP or WebSocket connections
            often use least-connections so one node does not collect all slow
            clients.
          </LI>
          <LI>
            <Term>Canary releases:</Term> weighted routing can send 1% of traffic
            to a new version, then 10%, then 50%, while metrics are watched.
          </LI>
          <LI>
            <Term>Hot users:</Term> hashing by user ID can overload one backend if
            a celebrity account or giant tenant produces far more traffic than
            normal users.
          </LI>
          <LI>
            <Term>Retries:</Term> automatic retries can multiply traffic during an
            outage. Pair load balancing with timeouts, budgets, and backoff.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A load balancer gives clients one stable front door while distributing traffic across healthy backends.",
          "L4 balancing is fast and transport-level; L7 balancing understands HTTP and enables path, host, header, and cookie policies.",
          "Algorithms include round-robin, least-connections, weighted routing, and hashing or sticky sessions; each optimizes for a different workload.",
          "Health checks and connection draining turn node failures and deploys into routine events instead of visible outages.",
          "The load balancer must also be redundant through active-passive, active-active, DNS failover, anycast, or a managed multi-zone service.",
        ]}
      />

      <CheckYourself question="When would you choose Layer 7 instead of Layer 4 balancing?">
        Choose L7 when the routing decision needs HTTP context: host, path,
        method, header, cookie, redirects, rate limits, canaries, or TLS
        termination. If the balancer only needs to forward TCP or UDP quickly, L4
        may be simpler.
      </CheckYourself>

      <CheckYourself question="Why can sticky sessions be dangerous?">
        They make one server special for a user. If that server fails, the user
        can lose the local session or cached state, and load may become uneven.
        Shared session storage keeps app servers interchangeable.
      </CheckYourself>

      <CheckYourself question="How does a load balancer improve availability during a deploy?">
        It can mark a node not ready, drain existing connections, stop sending new
        requests, deploy the new version, verify health checks, and then return
        the node to rotation without exposing users to the intermediate state.
      </CheckYourself>
    </Prose>
  );
}