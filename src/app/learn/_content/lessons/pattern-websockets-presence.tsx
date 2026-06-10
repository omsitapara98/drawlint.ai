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
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        WebSockets are the tool you reach for when the browser and server both
        need to talk at any moment: chat messages, typing indicators, multiplayer
        moves, collaborative cursors, and live presence. They start as ordinary
        HTTP, then upgrade into a persistent <Term>full-duplex</Term> connection
        where either side can send frames without waiting for a request.
      </P>

      <Analogy>
        Polling is repeatedly knocking on a classroom door to ask if your friend
        is inside. A WebSocket is leaving the door open and talking through it.
        Presence is the attendance sheet on the wall, continuously refreshed so
        everyone knows who is currently in the room.
      </Analogy>

      <LessonSection id="problem" title="The problem: real-time state lives on one server">
        <P>
          Plain HTTP is stateless: any request can land on any application server.
          WebSockets are different. Once a client connects, the TCP connection is
          physically held by one process on one machine. That server now owns a
          small piece of sticky, in-memory state: socket id, subscribed rooms, last
          heartbeat, and user identity.
        </P>
        <CodeBlock label="why naive WebSockets stop scaling">{`client A ───── WebSocket ─────▶ ws-server-1
client B ───── WebSocket ─────▶ ws-server-7

User A sends "hello B"
  app code on ws-server-1 must somehow reach B's socket on ws-server-7

If ws-server-7 crashes:
  B's socket disappears
  presence must expire
  B must reconnect and resume missed messages`}</CodeBlock>
        <P>
          The failure mode is not that one WebSocket is hard. The failure mode is
          that millions of WebSockets create millions of tiny stateful anchors
          spread across your fleet. If you only keep presence in local memory,
          other servers cannot find users. If you only broadcast locally, users on
          other boxes miss messages. If a server dies, stale &quot;online&quot; state can
          linger forever unless it has an expiry.
        </P>
        <Callout type="key" title="The core idea">
          Split the system into connection servers plus a shared backplane. The
          connection server owns sockets; Redis or another pub/sub system tells
          every connection server what to deliver and stores short-lived presence
          keys that expire automatically.
        </Callout>
      </LessonSection>

      <LessonSection id="upgrade" title="HTTP upgrade: how the connection begins">
        <P>
          A WebSocket does not begin as magic new transport. The browser sends an
          HTTP request with <code>{"Upgrade: websocket"}</code>. If the server
          accepts, it responds with <code>101 Switching Protocols</code>. After
          that point the same TCP connection stops carrying HTTP request/response
          messages and starts carrying WebSocket frames.
        </P>
        <CodeBlock label="HTTP upgrade handshake">{`GET /socket?token=eyJ... HTTP/1.1
Host: api.example.com
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

-- from here on, both sides exchange WebSocket frames over the same TCP connection --`}</CodeBlock>
        <UL>
          <LI>
            <Term>Authentication:</Term> validate the cookie or bearer token during
            the upgrade. After the upgrade there is no ordinary per-request auth
            middleware, so bind the authenticated <code>userId</code> to the
            connection context immediately.
          </LI>
          <LI>
            <Term>Full-duplex frames:</Term> the server can send a notification
            while the client sends a typing event. Neither side has to wait for the
            other side to initiate a request.
          </LI>
          <LI>
            <Term>Load balancers:</Term> the load balancer must support HTTP
            upgrade and long-lived idle connections. Timeouts that are fine for
            REST endpoints can kill WebSockets unexpectedly.
          </LI>
        </UL>
        <Callout type="info" title="When SSE is enough">
          If updates only flow server → browser, compare this with{" "}
          <XLink href="/learn/pattern-sse-vs-polling">SSE vs polling</XLink>.
          WebSockets are worth the extra operational cost when the client also
          needs to send low-latency messages over the same channel.
        </Callout>
      </LessonSection>

      <LessonSection id="backplane" title="Scaling: connection servers + Redis pub/sub">
        <P>
          A common production shape is a stateless API tier plus a separate
          WebSocket tier. Each WebSocket server keeps only its own local sockets in
          memory. Cross-server routing goes through a <Term>backplane</Term> such
          as Redis Pub/Sub, Redis Streams, NATS, or Kafka, depending on durability
          needs.
        </P>
        <CodeBlock label="connection servers with a Redis backplane">{`onConnect(socket, userId):
  localSockets.add(socket.id, socket)
  redis.setex("presence:user:" + userId, 30, serverId + ":" + socket.id)
  redis.sadd("room:doc:42", userId)
  redis.subscribe("deliver:" + serverId)

sendToUser(userId, event):
  location = redis.get("presence:user:" + userId)
  if location == null:
    storeOfflineNotification(userId, event)
    return

  targetServerId, socketId = parse(location)
  redis.publish("deliver:" + targetServerId, { socketId, event })

onRedisMessage({ socketId, event }):
  socket = localSockets.get(socketId)
  if socket != null:
    socket.send(JSON.stringify(event))`}</CodeBlock>
        <H3>What the backplane does</H3>
        <UL>
          <LI>
            <Term>Location lookup:</Term> Redis tells the system which connection
            server currently owns a user&apos;s socket. The API server does not need
            to know local process memory.
          </LI>
          <LI>
            <Term>Fanout:</Term> when a document changes, publish one event to a
            room channel and let every connection server deliver it to its local
            subscribers for that room.
          </LI>
          <LI>
            <Term>Decoupling:</Term> application services emit events; connection
            servers translate those events into WebSocket frames.
          </LI>
        </UL>
        <CompareTable
          headers={["Approach", "How it routes", "Failure mode"]}
          rows={[
            ["Local memory only", "Each server knows only its own sockets", "Messages to users on other servers are lost"],
            ["Sticky sessions only", "Load balancer tries to keep user on same box", "Crash or rescale still loses location; no cross-server fanout"],
            ["Redis presence + pub/sub", "Shared presence keys and per-server delivery channels", "Redis becomes critical infrastructure; design reconnect and expiry"],
            ["Durable log backplane", "Kafka or streams retain events for replay", "More latency and complexity, but better resume semantics"],
          ]}
        />
      </LessonSection>

      <LessonSection id="presence" title="Presence: heartbeats, TTL keys, and fanout">
        <P>
          Presence is not a boolean column called <code>online</code>. It is a
          lease. The client proves it is still connected by sending heartbeats; the
          server refreshes a Redis key with a short TTL. If the process crashes,
          the network disappears, or the user closes a laptop, the key expires
          naturally and the user becomes offline without a perfect cleanup path.
        </P>
        <CodeBlock label="heartbeat-backed presence">{`every 10 seconds from client:
  socket.send({ type: "ping", lastSeenEventId: 18421 })

onHeartbeat(userId, socketId):
  redis.setex("presence:user:" + userId, 30, serverId + ":" + socketId)
  redis.zadd("presence:last_seen", nowMillis(), userId)

onDisconnect(userId, socketId):
  // best effort only; TTL is the real safety net
  redis.delIfValueMatches("presence:user:" + userId, serverId + ":" + socketId)`}</CodeBlock>
        <P>
          For a chat room or collaborative document, each connection also
          subscribes to one or more topics: <code>room:team-7</code>,{" "}
          <code>doc:42</code>, or <code>game:abc</code>. When an event arrives,
          connection servers fan it out only to local sockets that subscribed to
          that topic. This avoids one central server writing to every user socket
          directly.
        </P>
        <Callout type="warning" title="Presence is approximate">
          A user can appear online for one TTL after a sudden disconnect, and can
          briefly appear offline during reconnect. Product features should treat
          presence as a hint, not a financial transaction.
        </Callout>
      </LessonSection>

      <LessonSection id="reconnect" title="Reconnect and resume missed work">
        <P>
          Reconnection is the normal path, not an edge case. Mobile devices switch
          networks, browsers sleep, load balancers drain nodes, and deploys restart
          processes. A resilient client reconnects with exponential backoff and
          sends the last event id it processed. The server then resumes from a
          durable store when the product requires no gaps.
        </P>
        <CodeBlock label="resume with last-seen event id">{`client state:
  lastSeenEventId = 18421

on reconnect:
  CONNECT /socket?lastSeenEventId=18421

server:
  missed = messageStore.readAfter(userId, 18421)
  for event in missed:
    socket.send(event)
  socket.send({ type: "resume_complete" })`}</CodeBlock>
        <UL>
          <LI>
            <Term>Ephemeral events:</Term> typing indicators and cursor positions
            can be dropped. Sending old typing events after reconnect is actively
            confusing.
          </LI>
          <LI>
            <Term>Durable events:</Term> chat messages, notifications, and document
            edits need ids and replay from a database or log.
          </LI>
          <LI>
            <Term>Backpressure:</Term> slow clients need bounded queues. If a
            socket cannot keep up, disconnect it and force resume rather than
            letting memory grow without limit.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and real-world examples">
        <P>
          Real systems usually combine this pattern with other primitives. A chat
          app stores messages in a database, publishes delivery events to Redis,
          and uses WebSockets for immediate delivery. A collaborative editor stores
          operations durably, uses WebSockets for low-latency cursors, and treats
          presence as TTL-backed hints. A delivery app may use WebSockets for the
          driver console, but use SSE for customer-facing one-way location updates.
        </P>
        <UL>
          <LI>
            <Term>Ordering:</Term> Redis Pub/Sub does not give a global ordering
            across every channel. Put sequence numbers on events when clients must
            detect gaps or reorder.
          </LI>
          <LI>
            <Term>Multi-device users:</Term> one user may have a phone, laptop,
            and tablet connected. Store presence per connection, not just per user,
            when delivery to all devices matters.
          </LI>
          <LI>
            <Term>Deploys:</Term> drain servers gracefully: stop accepting new
            connections, tell clients to reconnect, then wait for active sockets to
            leave before killing the process.
          </LI>
          <LI>
            <Term>Redis limits:</Term> Pub/Sub is fast but not durable. If missing
            an event is unacceptable, publish to a durable log and use Redis only
            for live fanout.
          </LI>
        </UL>
        <Callout type="tip" title="Related primitive">
          Presence and fanout often sit beside{" "}
          <XLink href="/learn/pattern-redis">Redis</XLink>: TTL keys for liveness,
          sets for room membership, and pub/sub or streams for cross-server
          delivery.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "WebSockets begin with an HTTP upgrade, then become a persistent full-duplex connection over the same TCP socket.",
          "The scaling problem is sticky state: each socket lives on exactly one connection server, so other servers need a shared backplane to find it.",
          "Presence should be modeled as a short-lived lease refreshed by heartbeats, not as a permanent boolean column.",
          "Fanout works by publishing events to the servers or rooms that have subscribers, then each server writes only to its local sockets.",
          "Reconnect and resume are mandatory: clients send last-seen ids, durable events replay, and ephemeral events can be safely dropped.",
        ]}
      />

      <CheckYourself question="Why is a load-balanced WebSocket fleet harder than a load-balanced REST API fleet?">
        REST requests are short and stateless, so any server can answer the next
        request. A WebSocket is a long-lived TCP connection owned by one process.
        To message a user, the system must know which server currently holds that
        user&apos;s socket and route through a backplane.
      </CheckYourself>

      <CheckYourself question="Why use TTL keys for presence instead of setting online=false only on disconnect?">
        Disconnect handlers are best effort. Servers crash, networks vanish, and
        phones sleep without a clean close frame. A TTL key expires automatically
        when heartbeats stop, so stale online state eventually cleans itself up.
      </CheckYourself>

      <CheckYourself question="A reconnecting chat client sends lastSeenEventId=100. What should the server replay?">
        It should replay durable chat events with ids greater than 100 from the
        message store, then resume live delivery. It should not replay ephemeral
        events like old typing indicators because those are only meaningful in the
        moment.
      </CheckYourself>
    </Prose>
  );
}
