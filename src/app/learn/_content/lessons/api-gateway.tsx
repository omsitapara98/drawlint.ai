import {
  Prose,
  LessonSection,
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
        An <Term>API gateway</Term> is the single front door for client traffic.
        Mobile apps, browsers, partners, and devices call one public API surface;
        the gateway authenticates, protects, routes, and shapes those requests
        before they reach internal services.
      </P>

      <Analogy>
        Think of a secure office tower. Visitors do not wander directly into any
        team&apos;s room. They enter through reception, show identification, receive a
        badge, get routed to the right floor, and may be stopped if the building is
        at capacity. The gateway is that reception desk for your backend.
      </Analogy>

      <LessonSection id="problem" title="The problem: every service should not be its own front door">
        <P>
          In a service-oriented system, each backend could expose itself directly
          to the internet and implement TLS, authentication, logging, rate limits,
          request validation, and routing conventions. That design fails by
          duplication: every service becomes a security boundary, every team
          rebuilds the same middleware, and a bug in one public service can expose
          the whole platform.
        </P>
        <UL>
          <LI>
            <Term>Inconsistent policy:</Term> one service validates JWT audiences,
            another forgets, and a third has a stale allowlist.
          </LI>
          <LI>
            <Term>Client coupling:</Term> clients must know which host and version
            belongs to every backend.
          </LI>
          <LI>
            <Term>Operational sprawl:</Term> TLS certificates, WAF rules, request
            logs, and quota enforcement are scattered across many services.
          </LI>
        </UL>
        <Callout type="key" title="The core idea">
          Centralize cross-cutting edge concerns at the gateway, but keep domain
          business logic in the services that own it. A gateway is a policy and
          routing layer, not a replacement for your application.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanics" title="The single front door request path">
        <P>
          A gateway usually sits behind DNS and a load balancer. It terminates
          client TLS, validates the request, applies policies, chooses an upstream,
          forwards the request, and returns a normalized response. It may be an
          appliance, a managed service, an Envoy/Nginx/Kong deployment, or code in
          your edge platform.
        </P>
        <Figure caption="Clients call one gateway; the gateway applies policy and routes to services.">
          <svg viewBox="0 0 560 150" className="w-full h-auto">
            <rect x="18" y="58" width="82" height="32" rx="6" className="fill-zinc-700/40 stroke-zinc-500" strokeWidth="1.3" />
            <text x="59" y="78" textAnchor="middle" className="fill-zinc-300 text-[10px]">Clients</text>
            <rect x="170" y="54" width="118" height="40" rx="6" className="fill-violet-500/15 stroke-violet-500" strokeWidth="1.5" />
            <text x="229" y="78" textAnchor="middle" className="fill-violet-300 text-[10px]">API Gateway</text>
            <rect x="420" y="16" width="118" height="28" rx="6" className="fill-cyan-500/10 stroke-cyan-500" strokeWidth="1.2" />
            <text x="479" y="34" textAnchor="middle" className="fill-cyan-300 text-[10px]">Auth</text>
            <rect x="420" y="60" width="118" height="28" rx="6" className="fill-cyan-500/10 stroke-cyan-500" strokeWidth="1.2" />
            <text x="479" y="78" textAnchor="middle" className="fill-cyan-300 text-[10px]">Orders</text>
            <rect x="420" y="104" width="118" height="28" rx="6" className="fill-cyan-500/10 stroke-cyan-500" strokeWidth="1.2" />
            <text x="479" y="122" textAnchor="middle" className="fill-cyan-300 text-[10px]">Feed</text>
            <line x1="100" y1="74" x2="170" y2="74" className="stroke-zinc-500" strokeWidth="1.3" />
            <line x1="288" y1="74" x2="420" y2="30" className="stroke-zinc-500" strokeWidth="1.1" />
            <line x1="288" y1="74" x2="420" y2="74" className="stroke-zinc-500" strokeWidth="1.1" />
            <line x1="288" y1="74" x2="420" y2="118" className="stroke-zinc-500" strokeWidth="1.1" />
          </svg>
        </Figure>
        <CodeBlock label="gateway request pipeline">{`request arrives at api.example.com
  -> terminate TLS and attach request id
  -> authenticate token / API key
  -> enforce rate limit and WAF rules
  -> validate route and transform headers/body if needed
  -> route /v1/orders/* to order-service
  -> collect upstream response, normalize errors, emit logs/metrics
  -> return response to client`}</CodeBlock>
      </LessonSection>

      <LessonSection id="responsibilities" title="Cross-cutting concerns gateways commonly handle">
        <P>
          The gateway is attractive because many concerns apply to every API call
          regardless of which service ultimately owns the business operation.
        </P>
        <UL>
          <LI>
            <Term>Authentication and authorization:</Term> validate JWTs, API
            keys, mTLS client certificates, scopes, and tenant boundaries before
            traffic reaches services.
          </LI>
          <LI>
            <Term>Rate limiting and quotas:</Term> protect backends and enforce
            plan limits per user, IP, API key, tenant, or route. See
            <XLink href="/learn/rate-limiting"> rate limiting</XLink> for the
            algorithms behind this.
          </LI>
          <LI>
            <Term>Routing and service discovery:</Term> map hosts, paths, methods,
            and versions to upstream services.
          </LI>
          <LI>
            <Term>TLS termination:</Term> manage certificates and modern TLS
            settings in one hardened layer.
          </LI>
          <LI>
            <Term>Request/response transformation:</Term> rewrite paths, headers,
            and payload shapes for compatibility or version migration.
          </LI>
          <LI>
            <Term>Aggregation:</Term> combine several backend calls into one
            client response when that composition is truly an edge concern.
          </LI>
          <LI>
            <Term>Observability:</Term> emit uniform access logs, traces, metrics,
            request IDs, and error envelopes.
          </LI>
        </UL>
        <Callout type="warning" title="Do not build a god gateway">
          A gateway should not become a giant service that owns pricing, checkout,
          feed ranking, and every domain rule. Keep business logic behind the
          gateway in services with clear ownership.
        </Callout>
      </LessonSection>

      <LessonSection id="compare" title="Gateway vs. reverse proxy vs. load balancer">
        <P>
          These components overlap, but they are not the same abstraction. In real
          systems you may use all three: a cloud load balancer, an Envoy or Nginx
          reverse proxy, and an API gateway product or configuration layer.
        </P>
        <CompareTable
          headers={["Component", "Primary job", "Typical layer", "Example features"]}
          rows={[
            ["Load balancer", "Distribute traffic across healthy instances", "L4/L7 infrastructure", "Health checks, connection balancing, failover"],
            ["Reverse proxy", "Proxy client requests to upstream servers", "L7 networking", "TLS termination, caching, compression, path routing"],
            ["API gateway", "Manage public API policy and composition", "Application edge", "Auth, quotas, transformations, versioning, developer plans"],
          ]}
        />
        <P>
          A load balancer asks, &quot;Which healthy instance should receive this
          connection?&quot; A reverse proxy asks, &quot;Which upstream should receive this
          HTTP request and how should it be proxied?&quot; An API gateway asks,
          &quot;Is this caller allowed to use this API, under which policy, and what
          client-facing contract should they see?&quot;
        </P>
      </LessonSection>

      <LessonSection id="bff" title="Backend-for-Frontend (BFF) gateways">
        <P>
          A <Term>Backend-for-Frontend</Term> is a gateway specialized for one
          client experience: web, iOS, Android, partner API, or admin console. It
          gives each client a convenient API shape without forcing backend services
          to know about every screen and device constraint.
        </P>
        <CodeBlock label="BFF aggregation example">{`GET /mobile/home
  -> user-service: profile summary
  -> feed-service: first 20 cards
  -> notification-service: unread count
  -> experiment-service: feature flags

BFF returns one mobile-shaped payload optimized for the home screen.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Good fit:</Term> reducing mobile round trips, hiding backend
            service topology, or tailoring payloads for a specific UI.
          </LI>
          <LI>
            <Term>Bad fit:</Term> duplicating core business rules that should live
            in domain services.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="reliability" title="SPOF risk, latency, and production gotchas">
        <P>
          Because every request enters through the gateway, it is a potential
          <Term>single point of failure</Term>. Treat it like tier-zero
          infrastructure: redundant instances across zones, health checks, safe
          config rollout, rollback, overload protection, and strong observability.
        </P>
        <UL>
          <LI>
            <Term>High availability:</Term> run multiple gateway instances behind
            a load balancer and avoid regional singletons for global products.
          </LI>
          <LI>
            <Term>Fail closed vs. fail open:</Term> decide what happens if auth,
            quota, or policy dependencies are unavailable. Security-sensitive
            routes usually fail closed.
          </LI>
          <LI>
            <Term>Latency budget:</Term> every plugin and upstream policy check
            adds time. Cache JWKS keys, avoid synchronous heavy calls, and measure
            p95/p99 latency.
          </LI>
          <LI>
            <Term>Config safety:</Term> a bad route rule can take down an API.
            Use staged rollout, validation, canaries, and fast rollback.
          </LI>
          <LI>
            <Term>Header trust:</Term> services should only trust identity headers
            from the gateway on private networks or with signed context; never from
            arbitrary clients.
          </LI>
        </UL>
        <Callout type="tip" title="Defense in depth">
          Central auth at the gateway is useful, but critical services should still
          validate important authorization decisions locally. The gateway proves
          who the caller is; the service often decides whether that caller may
          mutate a specific resource.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "An API gateway is the single public front door that routes requests and centralizes edge policies for backend services.",
          "Common gateway concerns include auth, rate limiting, routing, TLS termination, transformations, aggregation, observability, and error normalization.",
          "Gateways overlap with reverse proxies and load balancers, but focus more on API policy, caller identity, quotas, and client-facing contracts.",
          "Backend-for-Frontend gateways tailor APIs for specific clients, reducing round trips while keeping domain logic in owned services.",
          "The gateway is a SPOF risk: run it redundantly, keep it lightweight, roll out config safely, and avoid turning it into a god service.",
        ]}
      />

      <CheckYourself question="Why centralize authentication at an API gateway instead of duplicating it in every public service?">
        It gives one hardened edge layer for token validation, rejects bad traffic
        before it reaches services, and avoids inconsistent authentication bugs
        across teams. Services can still perform resource-specific authorization
        after receiving verified identity context.
      </CheckYourself>

      <CheckYourself question="How is an API gateway different from a basic load balancer?">
        A load balancer mainly distributes traffic across healthy instances. An
        API gateway also understands API policy: caller identity, quotas, route
        versions, transformations, aggregation, and developer-facing contracts.
      </CheckYourself>

      <CheckYourself question="What makes the gateway a single point of failure, and how do you reduce that risk?">
        All client traffic depends on it, so a gateway outage or bad config can
        take down every API. Run redundant instances behind load balancers, deploy
        across zones, canary config, monitor p95/p99 and errors, and maintain quick
        rollback.
      </CheckYourself>
    </Prose>
  );
}
