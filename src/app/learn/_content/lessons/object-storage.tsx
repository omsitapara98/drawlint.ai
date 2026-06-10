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
        <Term>Object storage</Term> (also called <Term>blob storage</Term>) is the
        standard home for large unstructured files: images, videos, PDFs, backups,
        logs, exports, and machine-learning datasets. You store a whole object by
        key, attach metadata, and let a storage service such as S3, Azure Blob, or
        Google Cloud Storage handle durability, scale, and cheap capacity.
      </P>

      <Analogy>
        A relational database is a carefully organized filing cabinet for small
        records you constantly cross-reference. Object storage is a massive
        warehouse for crates. Each crate has a label, a few notes taped to the
        outside, and an address in the warehouse. You do not open a crate to edit
        one screw; you replace the crate or write a new version.
      </Analogy>

      <LessonSection id="problem" title="The problem: databases and disks are the wrong home for blobs">
        <P>
          The failure mode object storage prevents is letting large binary files
          pollute systems optimized for different work. Put a 500 MB video in a
          database row and suddenly backups, replication, query memory, and cache
          eviction all pay for bytes they rarely need. Put user uploads on one VM
          disk and a deploy, disk failure, or autoscaling event can lose or strand
          data.
        </P>
        <UL>
          <LI>
            <Term>Database bloat:</Term> large blobs make snapshots, replication,
            vacuuming, and restores slower and more expensive.
          </LI>
          <LI>
            <Term>Server coupling:</Term> local disks tie files to specific
            machines, which conflicts with stateless app servers and autoscaling.
          </LI>
          <LI>
            <Term>Poor data path:</Term> app servers become bandwidth relays when
            clients upload or download gigabytes through your API.
          </LI>
        </UL>
        <Callout type="key" title="The standard split">
          Store bytes in object storage. Store metadata in your database: owner,
          object key, size, checksum, content type, lifecycle state, and the
          business entity the object belongs to.
        </Callout>
      </LessonSection>

      <LessonSection id="model" title="The object model: buckets, keys, metadata, and flat namespaces">
        <P>
          Object stores expose a simple model: a bucket/container holds objects,
          and each object is addressed by a <Term>key</Term>. Keys often look like
          paths, such as <code>users/42/avatar.png</code>, but most object stores
          are fundamentally a <Term>flat namespace</Term>. The slash is just a
          character in the key that tools use to display pseudo-folders.
        </P>
        <CodeBlock label="an object is bytes + metadata under a key">{`bucket: drawlint-prod-uploads
key:    users/42/avatar/original.png
bytes:  <binary stream>
metadata:
  content-type: image/png
  content-length: 184203
  etag: "9b2cf535f27731c974343645a3985328"
  x-amz-meta-owner-id: "42"
  x-amz-meta-upload-id: "upl_123"`}</CodeBlock>
        <H3>Why the key design matters</H3>
        <P>
          Keys are part naming scheme, part operational interface. A good key
          includes tenancy, ownership, object purpose, and sometimes a random or
          content-hash component. Avoid using only user-provided filenames; they
          collide, leak information, and contain awkward characters.
        </P>
        <CodeBlock label="typical application metadata table">{`files
- id:             file_01HZ...
- owner_user_id:  42
- bucket:         drawlint-prod-uploads
- object_key:     users/42/uploads/file_01HZ/original
- status:         pending | ready | deleted
- content_type:   image/png
- size_bytes:     184203
- checksum_sha256: ...
- created_at:     ...`}</CodeBlock>
      </LessonSection>

      <LessonSection id="compare" title="Object vs. block vs. file storage">
        <P>
          Storage systems differ by the interface they expose. Object storage is
          not a mounted disk and not a POSIX filesystem. You fetch or replace
          objects through APIs, usually over HTTP. That trade-off is what makes it
          cheap, durable, and effectively bottomless.
        </P>
        <CompareTable
          headers={["Type", "Interface", "Best for", "Not ideal for"]}
          rows={[
            ["Object storage", "GET/PUT/DELETE whole objects by key", "Blobs, backups, static assets, logs, data lakes", "Low-latency random writes inside one file"],
            ["Block storage", "Raw disk blocks attached to a VM", "Databases, boot volumes, filesystems", "Global sharing or direct browser access"],
            ["File storage", "Hierarchical filesystem with directories and POSIX-like operations", "Shared app files, lift-and-shift workloads", "Massive public object distribution at CDN scale"],
          ]}
        />
        <Callout type="info" title="Rule of thumb">
          If the application wants to say <code>read block 1842</code>, use block
          storage. If it wants <code>open /reports/q2.csv</code>, use file
          storage. If it wants <code>GET reports/q2.csv</code> and serve it to
          users or pipelines, use object storage.
        </Callout>
      </LessonSection>

      <LessonSection id="durability" title="Durability: replication, erasure coding, and eleven nines">
        <P>
          Object storage is famous for durability claims like
          <Term> eleven nines</Term> (99.999999999%). That does not mean every
          request always succeeds; it means the service is designed so stored
          objects are extraordinarily unlikely to be permanently lost. Providers
          achieve this by storing redundant pieces across disks, racks, and often
          availability zones.
        </P>
        <UL>
          <LI>
            <Term>Replication:</Term> store multiple full copies of an object in
            different failure domains. Simple and fast, but uses more raw storage.
          </LI>
          <LI>
            <Term>Erasure coding:</Term> split data into fragments plus parity so
            the system can reconstruct the object even if some fragments are lost.
            It is more space-efficient for large objects.
          </LI>
          <LI>
            <Term>Checksums and scrubbing:</Term> services continuously verify
            stored bytes and repair corrupt or missing fragments from redundancy.
          </LI>
        </UL>
        <CodeBlock label="durability is about permanent loss, not request success">{`A durable object store can still return:
- 503 SlowDown during a traffic spike
- 404 immediately after you asked for the wrong key
- 403 when a policy blocks access

Durability asks: after successful PUT, will the service still have the bytes years later?`}</CodeBlock>
        <Callout type="warning" title="Durability is not backup by itself">
          If your application deletes the wrong key, strong durability faithfully
          preserves the deletion. Use versioning, retention policies, replication,
          and backups for human mistakes, ransomware, and compliance scenarios.
        </Callout>
      </LessonSection>

      <LessonSection id="lifecycle" title="Storage classes, versioning, and lifecycle rules">
        <P>
          Object stores let you trade retrieval speed for cost with
          <Term>storage classes</Term>. Hot objects stay in standard storage.
          Rarely accessed objects move to infrequent-access classes. Archival data
          moves to glacier-like tiers where retrieval may take minutes or hours.
        </P>
        <CompareTable
          headers={["Capability", "What it does", "Example use"]}
          rows={[
            ["Storage classes", "Price/performance tiers for hot, cool, and archive data", "Move old exports to archive after 90 days"],
            ["Lifecycle rules", "Automatic transitions and deletions by age, prefix, or tag", "Delete temporary uploads after 24 hours"],
            ["Versioning", "Keep prior versions when a key is overwritten or deleted", "Recover a user file after accidental overwrite"],
            ["Object lock / retention", "Prevent deletion until a retention period expires", "Compliance archives and audit logs"],
          ]}
        />
        <CodeBlock label="example lifecycle policy in plain English">{`For keys under tmp/uploads/:
  - abort incomplete multipart uploads after 1 day
  - delete pending objects after 7 days

For keys under exports/:
  - move to infrequent access after 30 days
  - move to archive after 180 days
  - delete after 7 years`}</CodeBlock>
        <P>
          Lifecycle rules are also a cost-control safety net. Incomplete multipart
          uploads, abandoned temporary files, and old generated thumbnails can
          silently accumulate unless the bucket has automatic cleanup.
        </P>
      </LessonSection>

      <LessonSection id="consistency-access" title="Consistency, access patterns, and direct transfer">
        <P>
          Modern major object stores generally provide strong read-after-write
          consistency for new writes, overwrites, and deletes in a region: after a
          successful <code>PUT</code>, a later <code>GET</code> or list should see
          it. Still, applications must design for distributed-system realities:
          retries, duplicate events, multipart completion, CDN staleness, and
          cross-region replication lag.
        </P>
        <UL>
          <LI>
            <Term>Whole-object writes:</Term> object stores are not built for
            editing the middle of a file in place. Write a new object or new
            version.
          </LI>
          <LI>
            <Term>Large transfers:</Term> use multipart upload for parallelism,
            retries, and resume.
          </LI>
          <LI>
            <Term>Direct client access:</Term> use short-lived presigned URLs so
            browsers upload/download bytes directly instead of through app servers.
          </LI>
          <LI>
            <Term>CDN reads:</Term> serve popular public or signed private content
            through a CDN to keep object-store reads close to users.
          </LI>
        </UL>
        <CodeBlock label="direct upload keeps app servers off the byte path">{`1. POST /uploads        -> app creates DB row: status = "pending"
2. app returns presigned PUT for one object key
3. browser PUTs bytes directly to object storage
4. app verifies object size/checksum and marks row "ready"`}</CodeBlock>
        <Callout type="info" title="Related pattern">
          Direct upload is covered in depth in
          <XLink href="/learn/pattern-blob-presigned-urls"> the presigned URL
          pattern</XLink>, including multipart upload, resume, finalize, and orphan
          cleanup.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Object storage stores whole blobs by key with metadata; your database should store references and business metadata, not the bytes themselves.",
          "Object, block, and file storage expose different interfaces: HTTP object APIs, raw disk blocks, and filesystem paths.",
          "High durability comes from replication, erasure coding, checksums, repair, and multiple failure domains; it is different from availability or backup.",
          "Storage classes, lifecycle rules, versioning, and retention policies control cost, recovery, and compliance over an object&apos;s lifetime.",
          "Use multipart uploads, presigned URLs, and CDNs so large files move efficiently without turning app servers into bandwidth relays.",
        ]}
      />

      <CheckYourself question="Why is object storage usually a better home for uploaded videos than a relational database?">
        Videos are large binary blobs that would bloat database storage,
        replication, backups, caches, and restores. Object storage is cheaper,
        highly durable, and built to move large bytes directly to clients or CDNs,
        while the database keeps only metadata and references.
      </CheckYourself>

      <CheckYourself question="What does it mean that object storage has a flat namespace even when keys contain slashes?">
        The service addresses objects by complete key strings. A key like
        <code>users/42/avatar.png</code> may be displayed as folders by consoles or
        SDKs, but the slashes are part of the key rather than true directories with
        filesystem semantics.
      </CheckYourself>

      <CheckYourself question="Why should you enable lifecycle rules for upload buckets?">
        Clients abandon uploads, multipart sessions leave parts behind, and
        temporary files accumulate. Lifecycle rules automatically abort incomplete
        multipart uploads, transition cold data to cheaper tiers, and delete
        expired temporary objects before they become surprise cost.
      </CheckYourself>
    </Prose>
  );
}
