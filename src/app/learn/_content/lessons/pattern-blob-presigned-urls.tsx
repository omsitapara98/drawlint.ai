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
        Large binary files — images, videos, PDFs, backups — do not belong in
        your database or in your application server&apos;s memory. Store them in{" "}
        <Term>object storage</Term> (S3, Azure Blob, GCS) and let clients upload
        and download the bytes <em>directly</em> using short-lived{" "}
        <Term>presigned URLs</Term>. Your servers stay on the thin coordination
        path; the heavy data never touches them.
      </P>

      <Analogy>
        A presigned URL is a time-stamped warehouse pass. The front office issues
        a pass that opens one specific door for the next five minutes; your truck
        drives straight to the loading dock. The office staff never carry a single
        box — they just check IDs and write down what arrived.
      </Analogy>

      <LessonSection id="problem" title="The problem: your server becomes the bottleneck">
        <P>
          Imagine the &quot;obvious&quot; design where a user uploads a 2 GB video
          by POSTing it to your API, and your API forwards it to S3:
        </P>
        <CodeBlock label="naive proxy upload — every byte crosses your server twice">{`client ──(2 GB)──▶ app server ──(2 GB)──▶ S3
                     │
                     └─ holds the whole stream while it relays`}</CodeBlock>
        <P>Even though it &quot;works&quot;, this design quietly destroys your fleet:</P>
        <UL>
          <LI>
            <Term>Bandwidth doubling:</Term> every uploaded byte is received{" "}
            <em>and</em> re-sent by your server, so a 2 GB upload burns ~4 GB of
            server network. Your egress bill and NIC saturate fast.
          </LI>
          <LI>
            <Term>Memory &amp; connection pressure:</Term> a slow client on a
            phone can hold a server thread/connection open for minutes. A few
            thousand concurrent uploads exhaust your connection pool and RAM, and
            requests for <em>other</em> endpoints start timing out.
          </LI>
          <LI>
            <Term>Head-of-line blocking:</Term> the box is busy shovelling bytes
            instead of serving cheap API calls. One viral upload event can choke
            an entire service.
          </LI>
          <LI>
            <Term>It doesn&apos;t scale horizontally for free:</Term> you&apos;d
            have to over-provision app servers purely to act as a dumb pipe — work
            S3 already does, globally, for cheap.
          </LI>
        </UL>
        <Callout type="key" title="The core idea">
          Take your application servers <em>off the data path</em>. They should
          only issue permission and record metadata (small, fast calls). The
          actual gigabytes flow client&nbsp;↔&nbsp;object store directly.
        </Callout>
      </LessonSection>

      <LessonSection id="presigned" title="Presigned URLs: how the offload works">
        <P>
          A presigned URL is a normal object-store URL with a cryptographic
          signature baked into the query string. Your server holds the secret
          credentials and signs a request <em>on the client&apos;s behalf</em>;
          the signature encodes exactly one operation (e.g. <code>PUT</code> this
          one key), an expiry, and often constraints like max size or content
          type. The client then talks straight to S3 — S3 verifies the signature
          and serves the request as if your server made it.
        </P>
        <CodeBlock label="what a presigned PUT encodes">{`PUT https://bucket.s3.amazonaws.com/uploads/u_42/clip.mp4
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=...           // which key signed it
  &X-Amz-Date=20260610T070000Z
  &X-Amz-Expires=300              // valid for 5 minutes
  &X-Amz-SignedHeaders=host;content-type
  &X-Amz-Signature=9f86d0...      // HMAC over the above`}</CodeBlock>
        <UL>
          <LI>
            <Term>Least privilege:</Term> the URL grants exactly one verb on one
            key. It cannot list the bucket or touch other objects.
          </LI>
          <LI>
            <Term>Short TTL:</Term> minutes, not hours. A leaked URL expires
            quickly, and it can only do the one thing it was signed for.
          </LI>
          <LI>
            <Term>No client credentials:</Term> the browser/app never sees your
            S3 keys — only a disposable signature.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="lifecycle" title="The upload lifecycle: create → upload → finalize">
        <P>
          A single direct upload creates a classic consistency gap: the file
          lands in S3, but your database doesn&apos;t automatically know about it
          — and a client can always drop off mid-upload. The fix is a three-step
          flow backed by an explicit <Term>state machine</Term> in your database.
        </P>
        <CodeBlock label="three-step direct upload">{`1. POST /uploads            → server inserts row {status: "pending"},
                              returns presigned PUT url (5-min TTL)
2. PUT bytes ─────────────▶ S3        (direct, bypasses app servers)
3. POST /uploads/:id/finalize → server verifies the object exists,
                              flips row to {status: "ready"}`}</CodeBlock>
        <H3>The database state machine</H3>
        <P>
          Model the row&apos;s lifecycle explicitly so you never serve a
          half-written file and never leak storage:
        </P>
        <CompareTable
          headers={["Status", "Meaning", "Set when"]}
          rows={[
            ["pending", "Row reserved, key chosen, URL issued", "On POST /uploads"],
            ["uploaded", "Bytes are in S3, not yet validated", "On finalize / S3 event"],
            ["ready", "Validated & safe to serve", "After size/type/scan checks pass"],
            ["failed / orphaned", "Upload never completed or failed checks", "By a sweeper job after TTL"],
          ]}
        />
        <H3>Verifying completion — two ways</H3>
        <UL>
          <LI>
            <Term>Client-driven finalize:</Term> the client calls{" "}
            <code>finalize</code>; the server issues a <code>HEAD</code> on the
            object to confirm it exists and to read its real size/ETag before
            flipping to <code>ready</code>. Simple, but relies on the client
            making the call.
          </LI>
          <LI>
            <Term>Event-driven (more robust):</Term> configure an{" "}
            <Term>S3 event notification</Term> (→ SNS/SQS/Lambda) that fires on{" "}
            <code>s3:ObjectCreated:*</code>. A worker consumes the event and marks
            the row <code>ready</code> — so completion is recorded even if the
            client crashes right after the upload. This is the{" "}
            <XLink href="/learn/pattern-outbox-cdc">event-driven</XLink> cousin of
            finalize.
          </LI>
        </UL>
        <Callout type="warning" title="Don't trust the client's numbers">
          Never accept the file size or content-type the client claims at{" "}
          <code>POST /uploads</code> as truth. Read the real size/ETag from S3 on
          finalize, re-check the content-type, and run a virus/content scan before
          marking <code>ready</code>. The presign can also be constrained with a
          content-length range and content-type condition so S3 rejects oversized
          or wrong-type uploads at the door.
        </Callout>
        <H3>Cleaning up orphans</H3>
        <P>
          Clients disappear: closed tabs, dead batteries, cancelled uploads. Rows
          stuck in <code>pending</code> past their TTL — and the stray S3 objects
          or incomplete multipart uploads behind them — are garbage. Two janitors
          keep storage clean:
        </P>
        <UL>
          <LI>
            A periodic <Term>sweeper job</Term> deletes <code>pending</code> rows
            older than, say, 24h and removes any partial object.
          </LI>
          <LI>
            An <Term>S3 lifecycle rule</Term> auto-aborts incomplete multipart
            uploads after N days, so half-uploaded parts don&apos;t silently
            accrue cost.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="multipart" title="Multipart upload: big files, in parallel, resumable">
        <P>
          A single <code>PUT</code> is fine up to a few GB, but it&apos;s
          all-or-nothing: lose the connection at 99% and you start over.{" "}
          <Term>Multipart upload</Term> splits one object into many independent
          parts that upload <em>in parallel</em> and can be retried or resumed
          individually. S3 stitches them back into one object at the end.
        </P>
        <H3>The multipart API surface</H3>
        <CompareTable
          headers={["Operation", "What it does", "Returns"]}
          rows={[
            ["CreateMultipartUpload", "Opens a session for one key", "An UploadId"],
            ["UploadPart", "Uploads one chunk (PartNumber + UploadId)", "An ETag for that part"],
            ["ListParts", "Lists parts already received for an UploadId", "Parts + their ETags"],
            ["CompleteMultipartUpload", "Assembles parts (ordered list of {PartNumber, ETag})", "The final object"],
            ["AbortMultipartUpload", "Discards the session and all its parts", "—"],
          ]}
        />
        <CodeBlock label="multipart flow with presigned part URLs">{`1. POST /uploads/multipart        → server: CreateMultipartUpload
                                    returns { uploadId, key }
2. For each 8 MB chunk:
   GET  /uploads/:id/part-url?n=3  → server presigns UploadPart url for part 3
   PUT  chunk ─────────────────▶ S3   → responds with ETag "a1b2..."
   (parts 1..N upload in parallel; client collects each ETag)
3. POST /uploads/:id/complete
   body: [{n:1,etag},{n:2,etag},...] → server: CompleteMultipartUpload
                                       → object assembled, row → ready`}</CodeBlock>
        <P>The mechanics that matter:</P>
        <UL>
          <LI>
            <Term>Part size &amp; count limits:</Term> each part is 5&nbsp;MiB
            minimum (except the last) up to 5&nbsp;GiB, with at most{" "}
            <strong>10,000 parts</strong> per object (so up to a 5&nbsp;TiB
            object). Pick a part size that keeps you under 10,000 parts for the
            largest file you support.
          </LI>
          <LI>
            <Term>ETags are the receipt:</Term> each <code>UploadPart</code>
            returns an ETag (the part&apos;s MD5). You must send the exact{" "}
            {"{PartNumber, ETag}"} list back in <code>CompleteMultipartUpload</code>
            ; S3 validates it and rejects mismatches, guaranteeing integrity.
          </LI>
          <LI>
            <Term>Parallelism = throughput:</Term> uploading 6–10 parts at once
            saturates the client&apos;s uplink far better than one serial stream,
            and a single flaky part retries without restarting the whole file.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="resumable" title="Resumable & reliable transfers">
        <P>
          Connections die — Wi-Fi drops, trains enter tunnels, laptops sleep. The
          whole point of multipart (up) and Range requests (down) is that a
          dropped connection costs you one chunk, not the whole file.
        </P>
        <H3>Resuming an upload</H3>
        <P>
          The <code>UploadId</code> is the resume token. Persist it (client-side
          and/or in the <code>pending</code> row). After a disconnect, the client
          reconnects and asks the server to <code>ListParts</code> for that
          <code>UploadId</code> — S3 reports which parts already arrived (with
          their ETags). The client simply uploads the <em>missing</em> parts and
          then completes:
        </P>
        <CodeBlock label="resume after a dropped connection">{`reconnect
  → ListParts(uploadId)        // S3: parts 1,2,3,5 present
  → re-upload only part 4
  → CompleteMultipartUpload([1,2,3,4,5])   // done — no re-sending 4 GB`}</CodeBlock>
        <H3>Resuming a download</H3>
        <P>
          Downloads resume with the HTTP <Term>Range</Term> header — no special
          API needed. The client tracks how many bytes it has written to disk; on
          reconnect it asks only for the rest:
        </P>
        <CodeBlock label="byte-range download (and resume)">{`GET /clip.mp4
Range: bytes=1048576-          // "send me from 1 MiB onward"

206 Partial Content
Content-Range: bytes 1048576-2097151/2097152
Accept-Ranges: bytes          // S3 advertises range support`}</CodeBlock>
        <P>
          The same Range mechanism powers video <em>seeking</em> and{" "}
          <XLink href="/learn/pattern-adaptive-streaming">adaptive streaming</XLink>
          : the player fetches only the byte ranges it needs to start playback.
        </P>
        <Callout type="tip" title="Integrity end-to-end">
          Have the client compute a checksum (S3 supports CRC32C/SHA-256 trailers
          per part and per object). S3 verifies each part on receipt and the
          assembled object on complete, so silent corruption from a flaky network
          is caught — not discovered later by an unhappy user.
        </Callout>
      </LessonSection>

      <LessonSection id="download" title="Serving downloads: presigned vs. CDN">
        <P>
          Reads have the same &quot;keep the server off the data path&quot; goal,
          but caching changes the calculus:
        </P>
        <CompareTable
          headers={["Mechanism", "Best for", "Caching"]}
          rows={[
            [
              "Presigned GET",
              "Private, per-user files (invoices, your own backups)",
              "Poor — the unique signature makes each URL uncacheable",
            ],
            [
              "CDN + signed cookies / signed URLs",
              "Large or popular content (videos, public images)",
              "Great — edge caches the object; signature gates access",
            ],
            [
              "Stable public URL behind CDN",
              "Truly public assets (logos, CSS, thumbnails)",
              "Best — fully cacheable, no signing overhead",
            ],
          ]}
        />
        <Callout type="info" title="Related building block">
          This pattern sits directly on top of the{" "}
          <XLink href="/learn/object-storage">Object Storage</XLink> building
          block, and pairs with a{" "}
          <XLink href="/learn/content-delivery-networks">CDN</XLink> for read-heavy
          delivery.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Trade-offs & gotchas">
        <UL>
          <LI>
            <Term>CDN cacheability vs. privacy:</Term> a unique presigned URL per
            request can&apos;t be shared by a cache. Use signed cookies or stable
            URLs when you want edge caching.
          </LI>
          <LI>
            <Term>CORS:</Term> browser direct-to-S3 uploads need a CORS policy on
            the bucket allowing your origin and the <code>PUT</code>/headers — a
            classic first-time stumbling block.
          </LI>
          <LI>
            <Term>Clock &amp; TTL:</Term> signatures are time-bound; large slow
            uploads can outlive a too-short TTL. Size the expiry to the realistic
            transfer time (and prefer multipart, where each part URL is short).
          </LI>
          <LI>
            <Term>Cost discipline:</Term> incomplete multipart uploads cost money
            until aborted — always set a lifecycle rule to reap them.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Proxying bytes through your app server doubles bandwidth and ties up memory/connections — take the server off the data path.",
          "Presigned URLs grant one short-lived, least-privilege operation so clients transfer bytes straight to/from object storage.",
          "Back uploads with a DB state machine (pending → uploaded → ready) and verify completion via finalize or an S3 event; sweep orphans.",
          "Multipart upload (CreateMultipartUpload → UploadPart → CompleteMultipartUpload, with AbortMultipartUpload/ListParts) gives parallelism, retries, and resume; ETags guarantee integrity.",
          "Resume uploads via ListParts + the UploadId; resume downloads via HTTP Range requests. A dropped connection costs one chunk, not the whole file.",
        ]}
      />

      <CheckYourself question="Why route uploads through a presigned URL instead of your API server?">
        Proxying every byte through your app servers makes them a bandwidth and
        memory bottleneck — a 2 GB upload becomes ~4 GB of server traffic and ties
        up a connection for the whole transfer. A presigned URL lets the client
        send data straight to the object store, so your servers only handle small
        coordination calls: issuing the URL and recording metadata.
      </CheckYourself>

      <CheckYourself question="A user's connection drops at 90% of a 5 GB multipart upload. How do they resume without re-sending 4.5 GB?">
        The UploadId is the resume token. On reconnect the client (via your
        server) calls ListParts for that UploadId; S3 returns which parts already
        arrived with their ETags. The client uploads only the missing parts, then
        calls CompleteMultipartUpload with the full ordered list of
        {" {PartNumber, ETag}"} entries. Only the lost chunk is re-sent.
      </CheckYourself>

      <CheckYourself question="How do you make sure your database never points at a file that didn't finish uploading?">
        Use a state machine: insert the row as pending when you issue the URL, and
        only flip it to ready after completion is confirmed — either the client
        calls finalize (and you HEAD the object to verify size/ETag) or an S3
        ObjectCreated event marks it ready. A sweeper deletes pending rows that
        never finalize, and an S3 lifecycle rule aborts incomplete multipart
        uploads.
      </CheckYourself>
    </Prose>
  );
}
