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
        A <Term>CDN</Term> is the default pattern for serving static content at
        scale: images, JavaScript bundles, CSS, fonts, downloads, video chunks,
        and public documents. Instead of making every user cross the internet to
        your origin, you cache bytes at edge locations near users and let those
        edges absorb the repeated reads.
      </P>

      <Analogy>
        A bakery could ship every croissant from one central kitchen, but the
        morning line would be terrible and the delivery vans would melt down.
        Instead, it stocks neighborhood shops before rush hour. Customers buy
        nearby, the central kitchen handles fewer trips, and the popular items
        stay close to demand.
      </Analogy>

      <LessonSection id="when-to-apply" title="When to apply a CDN in a design">
        <P>
          Add a CDN when the same bytes are requested many times, users are spread
          across regions, or origin bandwidth is becoming part of your cost and
          latency story. In interviews and architecture reviews, this is usually a
          pattern decision rather than a product feature: you are deciding where
          repeated reads should terminate.
        </P>
        <CompareTable
          headers={["Signal", "CDN is a good fit", "CDN is not the first move"]}
          rows={[
            [
              "Content shape",
              "Static or slowly changing bytes: images, bundles, video segments",
              "Per-user JSON assembled uniquely for every request",
            ],
            [
              "Audience",
              "Many users request the same object from many geographies",
              "Tiny internal tool used from one office",
            ],
            [
              "Freshness",
              "Seconds to hours of staleness is acceptable or objects are versioned",
              "Every read must reflect the latest write immediately",
            ],
            [
              "Access control",
              "Public assets or cacheable private assets with signed URLs/cookies",
              "Highly personalized responses with object-level authorization",
            ],
          ]}
        />
        <Callout type="key" title="The decision frame">
          Use a CDN to remove static bytes from the hot path of your application
          and origin. Keep request-specific business logic in your app; push
          repeatable byte delivery to the edge.
        </Callout>
      </LessonSection>

      <LessonSection id="edge-caching" title="How edge caching works">
        <P>
          A user requests an asset such as <code>/assets/app.abcd1234.js</code>.
          DNS or anycast routes the request to a nearby edge. If that edge has a
          fresh cached copy, it returns the response immediately. If it misses, it
          fetches from the origin, stores the response according to cache rules,
          and returns the bytes to the user.
        </P>
        <CodeBlock label="request path through a CDN">{`Browser
  GET /images/p/42.jpg
    ↓
Nearest CDN edge
  cache lookup by key: host + path + selected query/header values
    ├─ HIT  → return bytes in ~10-50 ms
    └─ MISS → fetch from origin (S3/app), store with TTL, return bytes

Origin sees only misses, revalidations, and purges instead of every read.`}</CodeBlock>
        <UL>
          <LI>
            <Term>Static assets:</Term> bundled JS/CSS, images, thumbnails,
            fonts, and downloads are ideal because the response is byte-identical
            for many users.
          </LI>
          <LI>
            <Term>Video chunks:</Term> HLS/DASH segments are usually immutable
            files, so a viral video can be served mostly from edge caches.
          </LI>
          <LI>
            <Term>Origin offload:</Term> a high hit ratio means your origin,
            database, and object store handle far fewer requests and less
            bandwidth.
          </LI>
        </UL>
        <Callout type="info" title="Mechanics live in the building block">
          This lesson focuses on the design pattern and decision. For more detail
          on PoPs, anycast, origin shield, and HTTP caching mechanics, read the{" "}
          <XLink href="/learn/content-delivery-networks">content delivery networks</XLink>{" "}
          building block.
        </Callout>
      </LessonSection>

      <LessonSection id="cache-key-ttl" title="Cache key, TTL, and versioning">
        <P>
          A CDN cache is only as good as its <Term>cache key</Term>. The key tells
          the edge which requests are equivalent. A common safe default is host
          plus path plus selected query parameters. Be careful with headers and
          cookies: including too many values makes every request unique and
          destroys the hit ratio.
        </P>
        <CodeBlock label="cache-control for immutable static assets">{`GET /assets/app.4f3a9c.js

Cache-Control: public, max-age=31536000, immutable

// The filename contains the content hash.
// Deploying new code creates /assets/app.91b2d0.js, so the old URL can live forever.`}</CodeBlock>
        <H3>TTL is a product and operations choice</H3>
        <CompareTable
          headers={["Strategy", "How it works", "Best for"]}
          rows={[
            [
              "Short TTL",
              "Edges refresh frequently, for example every 30 seconds",
              "Assets that change often and tolerate origin revalidation",
            ],
            [
              "Long TTL with versioned URL",
              "URL changes whenever bytes change",
              "Build artifacts, thumbnails, video chunks, public downloads",
            ],
            [
              "No-store or private",
              "Do not cache at shared edges",
              "Sensitive or uniquely personalized responses",
            ],
          ]}
        />
        <P>
          For static assets, prefer versioned URLs or content-hashed filenames.
          It is cleaner to publish a new URL than to make every edge forget the
          old one at the same instant.
        </P>
      </LessonSection>

      <LessonSection id="invalidation-security" title="Invalidation, purge, and signed URLs">
        <P>
          Cache invalidation is the main price you pay for edge performance. If
          you overwrite <code>/logo.png</code> while edges still have the old
          object, users may see stale bytes until TTL expires or you purge the
          cache. That is why immutable, versioned URLs are the happy path.
        </P>
        <UL>
          <LI>
            <Term>Purge by URL:</Term> tell the CDN to evict one or more objects.
            Useful for emergency takedowns, but slow or rate-limited at huge
            scale.
          </LI>
          <LI>
            <Term>Purge by tag or surrogate key:</Term> group related objects,
            such as all thumbnails for one post, then invalidate the group.
          </LI>
          <LI>
            <Term>Version instead of purge:</Term> change{" "}
            <code>/avatar/u42/v7.jpg</code> to <code>/avatar/u42/v8.jpg</code>{" "}
            and let old cached bytes expire naturally.
          </LI>
        </UL>
        <P>
          Private but cacheable objects need access control that does not destroy
          cacheability. Use signed CDN URLs or signed cookies when many authorized
          users can share the same cached bytes. For one-off private uploads and
          downloads, pair this pattern with{" "}
          <XLink href="/learn/pattern-blob-presigned-urls">presigned blob URLs</XLink>.
        </P>
        <Callout type="warning" title="Unique presigned origin URLs can hurt caching">
          If every request has a different signature in the query string, the CDN
          may treat every request as a different object. For popular private
          media, prefer stable object URLs gated by CDN signing so the edge can
          still reuse the cached bytes.
        </Callout>
      </LessonSection>

      <LessonSection id="advanced-patterns" title="Pull vs push and dynamic acceleration">
        <P>
          Most web products use a <Term>pull CDN</Term>: the edge pulls from your
          origin on a miss. A <Term>push CDN</Term> preloads objects into the CDN
          through an upload or publishing workflow. Both are valid; the choice is
          about workflow, predictability, and how painful misses are.
        </P>
        <CompareTable
          headers={["Mode", "How content arrives", "Use when"]}
          rows={[
            [
              "Pull",
              "Edge fetches from origin on first request",
              "Large catalog, unpredictable popularity, simpler operations",
            ],
            [
              "Push",
              "Publisher uploads or prewarms content before users ask",
              "Known launches, software downloads, premium video releases",
            ],
            [
              "Dynamic acceleration",
              "CDN optimizes TLS, routing, TCP reuse, and sometimes edge compute",
              "APIs that cannot be cached but benefit from faster network paths",
            ],
          ]}
        />
        <P>
          Dynamic acceleration is not the same as caching. The response may still
          be generated by your application on every request, but the CDN can
          reduce connection setup, route around congested networks, terminate TLS
          close to the user, and reuse long-lived connections to the origin.
        </P>
        <Callout type="tip" title="Design for miss storms">
          Popular content often expires everywhere at once. Use origin shield,
          TTL jitter, stale-while-revalidate, or prewarming so thousands of edges
          do not stampede the origin simultaneously.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <UL>
          <LI>
            <Term>Cache key explosion:</Term> including all query parameters,
            cookies, or user-agent headers can turn one asset into millions of
            cache entries.
          </LI>
          <LI>
            <Term>Stale data:</Term> users can see old bytes until TTL or purge
            completes. Version URLs for assets where correctness matters.
          </LI>
          <LI>
            <Term>Authorization leaks:</Term> never cache private responses as{" "}
            <code>public</code> unless the URL or cookie signing model is
            explicitly designed for shared edge caching.
          </LI>
          <LI>
            <Term>Range requests:</Term> large downloads and video seeking rely on
            byte ranges. Make sure your CDN and origin both support them.
          </LI>
          <LI>
            <Term>Observability:</Term> track hit ratio, origin offload, edge
            latency, purge time, and top cache-miss URLs. A CDN without metrics is
            hard to tune.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Apply a CDN when many users repeatedly fetch the same static or slowly changing bytes, especially across regions.",
          "Edges serve cache hits close to users and fetch misses from the origin, dramatically reducing origin bandwidth and latency.",
          "Cache key design and TTL policy determine hit ratio; versioned immutable URLs are the cleanest invalidation strategy.",
          "Use signed CDN URLs or cookies for cacheable private content; one-off presigned blob URLs are better for direct private transfer.",
          "Pull CDNs fetch on demand, push CDNs preload known content, and dynamic acceleration improves network paths even when responses are not cacheable.",
        ]}
      />

      <CheckYourself question="When should you introduce a CDN in a system design?">
        Introduce it when the same static or slowly changing bytes are requested
        repeatedly, users are geographically distributed, or origin bandwidth and
        latency are becoming bottlenecks. Keep personalized business logic in the
        application and move repeatable byte delivery to the edge.
      </CheckYourself>

      <CheckYourself question="Why are content-hashed filenames so useful with CDNs?">
        They let you cache assets for a very long time because the URL changes
        whenever the bytes change. The old file can remain cached safely while a
        new deploy references a new filename.
      </CheckYourself>

      <CheckYourself question="What is the difference between CDN signing and an origin presigned URL?">
        CDN signing authorizes access while keeping a stable cacheable object at
        the edge. An origin presigned URL is often unique per request and is best
        for direct private transfer to or from object storage, where cache reuse
        is not the goal.
      </CheckYourself>
    </Prose>
  );
}
