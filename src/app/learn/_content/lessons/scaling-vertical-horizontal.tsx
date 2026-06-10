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
        Your system is getting more traffic than one server can comfortably
        handle. You have two fundamental moves: make the server <em>bigger</em>
        or add <em>more</em> servers. The first keeps the design simple; the
        second spreads work and failure across replaceable machines.
      </P>

      <Analogy>
        Vertical scaling is upgrading one restaurant kitchen with more ovens,
        more prep space, and faster equipment. Horizontal scaling is opening
        several kitchens and sending each order to whichever kitchen is ready.
        More kitchens create far more total capacity, but now recipes, inventory,
        and order state must live somewhere shared.
      </Analogy>

      <LessonSection id="problem" title="The problem: one box becomes the choke point">
        <P>
          A single server is a great starting point because everything is local:
          sessions in memory, temporary files on disk, background work in a local
          queue, and one process to deploy. The failure mode is concentration.
          If that machine is slow, every user is slow. If that machine dies, the
          service dies with it.
        </P>
        <CodeBlock label="single-server shape">{`clients
  -> app-server-1
      -> local memory: sessions, in-process cache
      -> local disk: temp files
      -> database
  <- response`}</CodeBlock>
        <UL>
          <LI>
            <Term>CPU saturation:</Term> requests wait because all cores are busy
            rendering, serializing JSON, encrypting TLS, or running business
            logic.
          </LI>
          <LI>
            <Term>Memory pressure:</Term> local sessions, caches, queues, and
            request buffers compete for RAM. Latency jumps when the process
            swaps or garbage collection dominates.
          </LI>
          <LI>
            <Term>I/O bottlenecks:</Term> disk, network, database connections, or
            kernel socket limits become the narrowest pipe.
          </LI>
          <LI>
            <Term>Single point of failure:</Term> a reboot, bad deploy, hardware
            fault, or runaway process can take the entire application offline.
          </LI>
        </UL>
        <Callout type="key" title="Scaling is also about failure isolation">
          A design with more capacity but the same single fatal node is only half
          improved. Staff engineers ask both &quot;Can it handle the load?&quot; and
          &quot;What disappears when this node disappears?&quot;
        </Callout>
      </LessonSection>

      <LessonSection id="vertical" title="Vertical scaling: make the box bigger">
        <P>
          <Term>Vertical scaling</Term>, or scaling up, means running the same
          software on a larger machine: more CPU, more RAM, faster disks, a
          larger network interface, or a bigger managed database instance. The
          topology barely changes, so it is often the fastest early win.
        </P>
        <CodeBlock label="scale up without changing the architecture">{`before: app-1 = 4 vCPU, 16 GB RAM
after:  app-1 = 32 vCPU, 128 GB RAM

same app process
same endpoint
same local assumptions`}</CodeBlock>
        <H3>Why teams scale up first</H3>
        <UL>
          <LI>
            <Term>Low engineering cost:</Term> no load balancer, service
            discovery, fleet deploys, or cross-node debugging is required.
          </LI>
          <LI>
            <Term>Existing state still works:</Term> local sessions, local caches,
            and local temp files keep working because there is still one app
            server.
          </LI>
          <LI>
            <Term>Operationally quick:</Term> resizing a VM or database tier can
            be much faster than changing the application to be distributed.
          </LI>
        </UL>
        <H3>The cost curve and ceiling</H3>
        <P>
          Vertical scaling is cheap and rational at small sizes, then becomes
          expensive near the top. The largest machines have premium pricing and
          eventually there is simply no larger box to buy. You can purchase more
          headroom, but not infinite headroom.
        </P>
        <CompareTable
          headers={["Stage", "Cost curve", "Design signal"]}
          rows={[
            ["Small to medium", "Usually predictable", "Scale up is a sensible first move"],
            ["Large", "More expensive per unit of capacity", "Measure carefully before resizing again"],
            ["Largest practical", "Very costly and capped", "Prepare to scale out or reduce work"],
            ["Failed node", "Capacity becomes zero", "The single point of failure remains"],
          ]}
        />
      </LessonSection>

      <LessonSection id="horizontal" title="Horizontal scaling: add more boxes">
        <P>
          <Term>Horizontal scaling</Term>, or scaling out, means running multiple
          copies of the service and distributing requests across them. One node
          no longer has to carry all traffic, and one node failure should reduce
          capacity rather than end the service.
        </P>
        <CodeBlock label="scale out behind a load balancer">{`clients
  -> load balancer
      -> app-1
      -> app-2
      -> app-3

if app-2 fails:
  health check marks it unhealthy
  new requests go to app-1 and app-3`}</CodeBlock>
        <UL>
          <LI>
            <Term>Capacity grows by adding nodes:</Term> ten app servers can
            handle much more traffic than one, until a shared dependency such as
            the database becomes the bottleneck.
          </LI>
          <LI>
            <Term>Availability improves:</Term> deploys can roll through the
            fleet, and failed nodes can be removed from rotation.
          </LI>
          <LI>
            <Term>Complexity increases:</Term> you now need load balancing,
            health checks, autoscaling, centralized logs, metrics, and safe fleet
            deploys.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="stateless" title="Stateless services unlock scale-out">
        <P>
          Horizontal scaling works best when app servers are <Term>stateless</Term>.
          A stateless server keeps no important per-user or per-job data in local
          memory between requests. Any healthy node can handle the next request
          because durable state lives in shared systems.
        </P>
        <CodeBlock label="externalize local state">{`problem:
  request 1 -> app-1 stores session in memory
  request 2 -> app-2 cannot find the session

fix:
  sessions -> Redis or signed cookies
  records  -> database
  files    -> object storage
  jobs     -> shared queue`}</CodeBlock>
        <CompareTable
          headers={["Concern", "Stateful app server", "Stateless app server"]}
          rows={[
            ["Sessions", "Stored in one process", "Stored in Redis, DB, or signed token"],
            ["Uploads", "Temp file on one node", "Object storage plus DB metadata"],
            ["Jobs", "Local in-memory queue", "Shared durable queue"],
            ["Node failure", "Local users or jobs are lost", "Another node can continue"],
            ["Load balancing", "May need sticky sessions", "Any node can serve any request"],
          ]}
        />
        <Callout type="tip" title="Stateful systems are still necessary">
          Databases, queues, caches, and search indexes are intentionally
          stateful. The goal is to keep app servers replaceable and put important
          state in systems designed for persistence, replication, and recovery.
        </Callout>
      </LessonSection>

      <LessonSection id="path" title="The usual path: vertical first, then horizontal">
        <P>
          Real teams usually follow a gradual path. Start simple, measure the
          bottleneck, buy easy headroom, then remove local-state assumptions
          before adding a fleet. This avoids paying distributed-system complexity
          before the product needs it.
        </P>
        <CodeBlock label="common migration path">{`1. one app server + one database
2. scale up app or database when metrics show saturation
3. add a load balancer and a second app server
4. move sessions, files, caches, and jobs out of app memory
5. autoscale stateless app servers horizontally
6. scale shared dependencies when they become the new bottleneck`}</CodeBlock>
        <CompareTable
          headers={["Dimension", "Vertical: scale up", "Horizontal: scale out"]}
          rows={[
            ["Basic move", "Use a bigger machine", "Use more machines"],
            ["Engineering effort", "Low; same topology", "Higher; distributed operations"],
            ["Capacity limit", "Largest affordable box", "Add nodes until another dependency limits you"],
            ["Cost curve", "Can get steep near the top", "More linear, plus operational overhead"],
            ["Failure model", "One node can still take everything down", "Node loss reduces capacity"],
            ["Best fit", "Early growth and quick relief", "High traffic and fault tolerance"],
          ]}
        />
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>The database may become the next bottleneck:</Term> after app
            servers scale out, shared storage often needs indexing, caching, read
            replicas, partitioning, or sharding.
          </LI>
          <LI>
            <Term>Sticky sessions hide state problems:</Term> pinning a user to
            one server can work temporarily, but that server is now special for
            that user and load can become uneven.
          </LI>
          <LI>
            <Term>Autoscaling is not instant:</Term> new nodes need time to boot,
            warm caches, pass health checks, and receive traffic.
          </LI>
          <LI>
            <Term>Local caches can disagree:</Term> each node may have a different
            in-memory view. Use short TTLs or a shared cache for correctness
            sensitive data.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Vertical scaling means a bigger machine: simple, fast, and useful early, but capped by hardware and cost.",
          "A vertically scaled service can still be a single point of failure; capacity and availability are different concerns.",
          "Horizontal scaling means more machines behind routing; it improves capacity and resilience but adds distributed operations.",
          "Stateless app servers make horizontal scaling practical because any node can handle any request.",
          "The normal path is scale up first, externalize state, then scale out when traffic or availability requires it.",
        ]}
      />

      <CheckYourself question="Why is vertical scaling usually the first move for a young service?">
        It buys capacity without changing the architecture. The team can keep the
        same code, local assumptions, and deployment model while gaining more CPU,
        memory, or I/O. The trade-off is that the bigger machine is still capped
        and still a single point of failure.
      </CheckYourself>

      <CheckYourself question="Why do stateless app servers matter for horizontal scaling?">
        With multiple servers, consecutive requests from the same user may land on
        different nodes. If the session or job state only lives in one node, the
        next node cannot continue correctly. Shared stores make the nodes
        interchangeable.
      </CheckYourself>

      <CheckYourself question="A team adds ten app servers but latency barely improves. What should they investigate next?">
        The bottleneck probably moved to a shared dependency: database queries,
        cache misses, a queue, the network, or an external API. Scaling the app
        tier only helps if the app tier was the limiting resource.
      </CheckYourself>
    </Prose>
  );
}