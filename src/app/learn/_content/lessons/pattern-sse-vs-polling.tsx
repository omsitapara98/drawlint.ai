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
        When a page needs fresh data, you have four common choices: short polling,
        long polling, Server-Sent Events, and WebSockets. They all deliver
        &quot;updates&quot;, but they make very different trade-offs in latency,
        network overhead, server complexity, and whether the browser needs to send
        messages back over the same connection.
      </P>

      <Analogy>
        Short polling is checking your mailbox every minute. Long polling is
        waiting at the post office counter until mail arrives. SSE is the post
        office calling your name over a one-way speaker. WebSockets is a phone
        call where both sides can interrupt each other naturally.
      </Analogy>

      <LessonSection id="problem" title="The problem: fresh data without wasting work">
        <P>
          The failure mode is choosing a real-time primitive that is either too
          weak or too expensive for the job. Polling every second for a status that
          changes once per hour burns requests and database reads. WebSockets for a
          one-way notification feed force you to operate stateful connections when
          a simpler HTTP stream would do. The right choice starts with the shape of
          communication.
        </P>
        <CodeBlock label="four ways to wait for updates">{`short polling:
  browser: GET /job/123/status every 5 seconds
  server: 200 { status }

long polling:
  browser: GET /job/123/events
  server: hold request until event or timeout, then respond

SSE:
  browser: new EventSource("/job/123/events")
  server: stream text/event-stream events over one HTTP response

WebSocket:
  browser: upgrade HTTP connection to WebSocket
  both sides: send frames whenever they have data`}</CodeBlock>
        <Callout type="key" title="The core question">
          Ask whether the flow is occasional, one-way, or truly bidirectional. Most
          systems do not need the most powerful primitive; they need the simplest
          primitive that meets the latency and direction requirements.
        </Callout>
      </LessonSection>

      <LessonSection id="short-polling" title="Short polling: simplest and often enough">
        <P>
          In short polling, the client asks on a fixed interval: every 2 seconds,
          10 seconds, or minute. The server replies immediately with the current
          state, even if nothing changed. This is the easiest model to reason about
          because every call is ordinary HTTP and works through caches, gateways,
          auth middleware, and load balancers.
        </P>
        <CodeBlock label="short polling loop">{`setInterval(async () => {
  const res = await fetch("/api/jobs/123/status");
  const job = await res.json();
  render(job.status);
}, 5000);`}</CodeBlock>
        <UL>
          <LI>
            <Term>Best for:</Term> status pages, admin dashboards, import jobs,
            payment verification, and anything where seconds of delay are fine.
          </LI>
          <LI>
            <Term>Failure mode:</Term> many clients polling frequently can create
            a read storm full of &quot;nothing changed&quot; responses.
          </LI>
          <LI>
            <Term>Mitigation:</Term> use backoff, conditional requests with ETags,
            and longer intervals after the item reaches a terminal state.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="long-polling" title="Long polling: near-real-time over ordinary HTTP">
        <P>
          Long polling keeps the HTTP request open until an update exists or a
          timeout fires. When the server responds, the client immediately issues
          the next long-poll request. It feels push-like to the user while still
          being implemented as repeated HTTP requests.
        </P>
        <CodeBlock label="long polling lifecycle">{`client GET /notifications?cursor=42
server waits up to 30 seconds

case A: new notification arrives at cursor 43
  server returns 200 { events: [43] }
  client processes event and immediately sends GET /notifications?cursor=43

case B: timeout with no events
  server returns 204 No Content
  client immediately sends GET /notifications?cursor=42`}</CodeBlock>
        <P>
          Long polling can be a good bridge for environments where SSE or
          WebSockets are blocked, but it ties up server resources and still has
          reconnect churn. You also have to handle duplicate deliveries and cursor
          resume because the response may be lost after the server sent it.
        </P>
      </LessonSection>

      <LessonSection id="sse" title="Server-Sent Events: one-way push with auto-reconnect">
        <P>
          <Term>Server-Sent Events</Term> use one long-lived HTTP response with
          content type <code>text/event-stream</code>. The server writes newline
          delimited text events; the browser exposes them through
          <code>EventSource</code>. SSE is intentionally one-way: server to client.
          The client can still send normal <code>fetch</code> requests for actions,
          but not on the SSE stream itself.
        </P>
        <CodeBlock label="SSE stream format">{`HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 101
event: progress
data: {"percent":42}

id: 102
event: progress
data: {"percent":43}

: comment lines can be used as heartbeats`}</CodeBlock>
        <UL>
          <LI>
            <Term>Auto-reconnect:</Term> browsers reconnect automatically and send
            the last event id, letting the server resume from a cursor.
          </LI>
          <LI>
            <Term>Simple operations:</Term> it works over HTTP, is easy to debug
            with curl, and avoids WebSocket-specific infrastructure.
          </LI>
          <LI>
            <Term>One-way only:</Term> for chat input, collaborative editing, or
            multiplayer commands, pair SSE with POST requests or use WebSockets.
          </LI>
        </UL>
        <Callout type="tip" title="Great default for server → browser updates">
          Job progress, notification feeds, dashboards, queue depth, and order
          status are often better as SSE than as WebSockets because they do not
          need bidirectional frames.
        </Callout>
      </LessonSection>

      <LessonSection id="websockets" title="WebSockets: bidirectional and stateful">
        <P>
          WebSockets upgrade an HTTP request into a persistent full-duplex
          connection. Both browser and server can send frames at any time. That is
          powerful, but the server now holds connection state, needs heartbeat
          logic, and usually needs a backplane for presence and fanout across many
          connection servers.
        </P>
        <CodeBlock label="WebSocket shape">{`client ── HTTP Upgrade ──▶ connection server
client ◀─ WebSocket frame ─▶ server
client ◀─ WebSocket frame ─▶ server

examples:
  client sends: typing, cursor moved, game action
  server sends: message delivered, cursor positions, room events`}</CodeBlock>
        <P>
          Use WebSockets when the browser must send low-latency events over the
          same channel or when the protocol is naturally conversational. For the
          scaling mechanics, see{" "}
          <XLink href="/learn/pattern-websockets-presence">WebSockets + Presence</XLink>.
        </P>
      </LessonSection>

      <LessonSection id="comparison" title="Choosing: latency, overhead, and complexity">
        <CompareTable
          headers={["Method", "Direction", "Latency", "Overhead", "Complexity", "Choose when"]}
          rows={[
            ["Short polling", "Client asks; server replies", "Interval-bound; 5s polling means up to 5s stale", "High if frequent because most responses may be empty", "Very low; plain HTTP", "Updates are occasional and seconds of staleness are acceptable"],
            ["Long polling", "Client asks; server holds until event", "Usually low after request is open", "Moderate; requests churn after every event or timeout", "Medium; held requests, timeouts, cursors", "Need near-real-time but want to stay on request/response HTTP"],
            ["SSE", "Server → client only", "Low; server writes immediately", "Low; one open stream plus small text events", "Medium-low; HTTP stream and reconnect cursors", "One-way feeds, job progress, notifications, dashboards"],
            ["WebSocket", "Bidirectional", "Lowest for two-way interactive flows", "Low per message after upgrade, but holds stateful sockets", "High; heartbeats, backplane, presence, drains", "Chat, collaboration, multiplayer, trading terminals"],
          ]}
        />
        <H3>Rules of thumb</H3>
        <UL>
          <LI>
            If a stale answer is okay, start with short polling. It is boring and
            boring is valuable.
          </LI>
          <LI>
            If the server needs to push one-way updates to a browser, prefer SSE
            before WebSockets.
          </LI>
          <LI>
            If both sides need to send frequent low-latency messages, use
            WebSockets and design reconnect from day one.
          </LI>
          <LI>
            If intermediaries or corporate proxies block streams, long polling is
            a pragmatic fallback.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and real-world examples">
        <P>
          A payment page can poll every few seconds until a charge succeeds. A CI
          build page can use SSE to stream logs and progress. A support chat uses
          WebSockets because the agent and customer both type and receive messages.
          A legacy enterprise dashboard might use long polling because streaming
          connections are unreliable through customer proxies.
        </P>
        <UL>
          <LI>
            <Term>Backoff matters:</Term> reconnecting thousands of clients at once
            after a deploy can stampede your servers. Add jitter.
          </LI>
          <LI>
            <Term>Idle timeouts:</Term> proxies may close quiet connections. Send
            comments for SSE or ping frames for WebSockets.
          </LI>
          <LI>
            <Term>Cursors:</Term> any streaming design needs event ids so clients
            can resume without gaps after a disconnect.
          </LI>
          <LI>
            <Term>Mobile networks:</Term> background tabs and phones sleep. Treat
            reconnect as normal behavior, not as an exception.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Short polling is simplest but wastes work when the interval is short and changes are rare.",
          "Long polling reduces latency while staying on HTTP, but held requests and timeout churn add server complexity.",
          "SSE is the best default for one-way server-to-browser streams: text/event-stream, automatic reconnect, and simple HTTP semantics.",
          "WebSockets are for bidirectional, low-latency conversations, and they require stateful connection management.",
          "Pick the weakest primitive that satisfies direction, latency, and reliability requirements; simpler operations usually win.",
        ]}
      />

      <CheckYourself question="A background export updates progress once every few seconds, and the browser never sends messages on that stream. Which primitive fits best?">
        SSE is the best fit. The server can push progress events over a single
        <code>text/event-stream</code> response, the browser auto-reconnects, and
        you avoid the stateful bidirectional machinery of WebSockets.
      </CheckYourself>

      <CheckYourself question="Why can short polling become expensive even when each response is tiny?">
        The cost is multiplied by clients and intervals. One hundred thousand
        browsers polling every second create one hundred thousand requests per
        second, even if almost every response says nothing changed.
      </CheckYourself>

      <CheckYourself question="What makes WebSockets operationally harder than SSE?">
        WebSockets are bidirectional and stateful. Servers hold long-lived sockets,
        need heartbeat and backpressure logic, and need a backplane to route
        messages across a fleet. SSE is one-way HTTP streaming and usually simpler.
      </CheckYourself>
    </Prose>
  );
}
