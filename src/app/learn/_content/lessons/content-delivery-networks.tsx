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
        A <Term>Content Delivery Network</Term> (CDN) is a globally distributed
        layer of cache servers that serves content from <Term>edge POPs</Term>
        (points of presence) near users instead of making every request travel to
        one faraway origin. It improves latency, absorbs traffic spikes, and keeps
        your application servers from becoming expensive file servers.
      </P>

      <Analogy>
        A CDN is like stocking a bestselling book in local bookstores around the
        world. Without it, every reader mails a request to the publisher&apos;s
        warehouse and waits. With it, most readers pick up a nearby copy; only a
        bookstore with an empty shelf asks the warehouse for another shipment.
      </Analogy>

      <LessonSection id="problem" title="The problem: distance and origin overload">
        <P>
          The failure mode CDNs solve is deceptively simple: the internet is
          physical. A user in Singapore fetching a 4 MB hero image from an origin
          in Virginia pays for many network hops, multiple round trips, and
          trans-ocean congestion. Multiply that by millions of page views and your
          origin spends its day serving identical bytes again and again.
        </P>
        <CodeBlock label="without a CDN, every user hits the origin">{`User in Mumbai ───────┐
User in Paris  ───────┼──▶ origin.example.com ──▶ app / S3
User in Sydney ───────┘        (same logo, same CSS, same video chunk)`}</CodeBlock>
        <UL>
          <LI>
            <Term>High latency:</Term> even small files feel slow when the TCP/TLS
            handshake and bytes cross continents.
          </LI>
          <LI>
            <Term>Origin hot spots:</Term> one viral asset can saturate your
            storage bucket, web server, or load balancer.
          </LI>
          <LI>
            <Term>Expensive repeated work:</Term> the same public image, script,
            or video segment is fetched thousands of times when it could be
            fetched once per region and reused.
          </LI>
        </UL>
        <Callout type="key" title="The core idea">
          Put cacheable bytes close to users. Your origin remains the source of
          truth, but it should only see cache misses, revalidations, purges, and
          truly dynamic requests.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanics" title="How edge POPs, routing, and cache hits work">
        <P>
          A CDN operates many edge POPs in large internet exchange locations. When
          a browser requests <code>https://cdn.example.com/app.8fd1.css</code>, DNS
          and/or <Term>anycast routing</Term> steer the request to a nearby healthy
          POP. Anycast lets many POPs advertise the same IP prefix; internet
          routers naturally choose the shortest available path.
        </P>
        <Figure caption="Users are routed to nearby edge POPs; only misses travel to the origin.">
          <svg viewBox="0 0 560 140" className="w-full h-auto">
            <rect x="20" y="22" width="92" height="28" rx="6" className="fill-zinc-700/40 stroke-zinc-500" strokeWidth="1.3" />
            <text x="66" y="40" textAnchor="middle" className="fill-zinc-300 text-[10px]">User EU</text>
            <rect x="20" y="88" width="92" height="28" rx="6" className="fill-zinc-700/40 stroke-zinc-500" strokeWidth="1.3" />
            <text x="66" y="106" textAnchor="middle" className="fill-zinc-300 text-[10px]">User India</text>
            <rect x="205" y="20" width="104" height="32" rx="6" className="fill-violet-500/15 stroke-violet-500" strokeWidth="1.4" />
            <text x="257" y="40" textAnchor="middle" className="fill-violet-300 text-[10px]">Edge POP EU</text>
            <rect x="205" y="86" width="104" height="32" rx="6" className="fill-violet-500/15 stroke-violet-500" strokeWidth="1.4" />
            <text x="257" y="106" textAnchor="middle" className="fill-violet-300 text-[10px]">Edge POP Asia</text>
            <rect x="430" y="53" width="105" height="34" rx="6" className="fill-cyan-500/10 stroke-cyan-500" strokeWidth="1.4" />
            <text x="482" y="74" textAnchor="middle" className="fill-cyan-300 text-[10px]">Origin</text>
            <line x1="112" y1="36" x2="205" y2="36" className="stroke-zinc-500" strokeWidth="1.3" />
            <line x1="112" y1="102" x2="205" y2="102" className="stroke-zinc-500" strokeWidth="1.3" />
            <line x1="309" y1="36" x2="430" y2="63" className="stroke-zinc-500" strokeWidth="1.1" strokeDasharray="5 4" />
            <line x1="309" y1="102" x2="430" y2="78" className="stroke-zinc-500" strokeWidth="1.1" strokeDasharray="5 4" />
            <text x="370" y="28" textAnchor="middle" className="fill-zinc-400 text-[9px]">miss / revalidate only</text>
          </svg>
        </Figure>
        <CodeBlock label="request path through a pull CDN">{`1. Browser requests /images/hero.jpg from cdn.example.com
2. Anycast/DNS routes the browser to a nearby edge POP
3. Edge checks its cache key: host + path + selected query/header values
4. HIT: edge returns bytes immediately
5. MISS: edge fetches from origin, stores the response with its TTL, then returns it`}</CodeBlock>
        <P>
          The cache key is important. If you include every query parameter or
          cookie, two users may produce different keys for identical content and
          destroy the hit rate. If you ignore a header that changes the response,
          such as language or image format, you may serve the wrong variant.
        </P>
      </LessonSection>

      <LessonSection id="what-to-cache" title="What to cache and how TTLs control freshness">
        <P>
          CDNs are best for content that is expensive to move and safe to reuse:
          images, fonts, JavaScript and CSS bundles, downloadable files, video
          segments, public product photos, documentation assets, and selected API
          responses. The origin tells the edge how long a response can be reused
          with HTTP caching headers.
        </P>
        <CodeBlock label="typical Cache-Control choices">{`# fingerprinted build artifact: safe for a year because URL changes on deploy
Cache-Control: public, max-age=31536000, immutable

# product image that may be replaced: cache briefly and revalidate
Cache-Control: public, max-age=300, stale-while-revalidate=60

# private dashboard JSON: do not share through a public CDN cache
Cache-Control: private, no-store`}</CodeBlock>
        <CompareTable
          headers={["Content", "Good CDN policy", "Why"]}
          rows={[
            ["app.8fd1.js / styles.71c.css", "Very long TTL + immutable", "Filename fingerprint changes when bytes change"],
            ["Public product image", "Minutes to hours", "Reusable across shoppers, but may need replacement"],
            ["Video HLS/DASH chunks", "Long TTL for completed chunks", "Large, popular, naturally split into cacheable pieces"],
            ["Per-user account page", "Private or no-store", "One user&apos;s data must not be served to another"],
          ]}
        />
        <Callout type="tip" title="Versioned URLs beat frantic purges">
          For deploy artifacts, prefer content-hashed filenames such as
          <code>app.8fd1c0.js</code>. You can cache them for a year because a new
          deploy creates a new URL. Purge is then reserved for emergencies and
          mutable assets.
        </Callout>
      </LessonSection>

      <LessonSection id="push-vs-pull" title="Pull CDNs, push CDNs, and origin shielding">
        <P>
          Most web CDNs are <Term>pull CDNs</Term>: the edge pulls content from the
          origin on the first miss. A <Term>push CDN</Term> requires you to upload
          content to the CDN ahead of time. Pull is operationally simpler for web
          assets; push can be useful for very large media libraries and workflows
          where publishing is explicit.
        </P>
        <CompareTable
          headers={["Mode", "How content gets to the edge", "Best for", "Trade-off"]}
          rows={[
            ["Pull CDN", "Edge fetches from origin on first request", "Web apps, images, public downloads", "First request in a region pays miss latency"],
            ["Push CDN", "Publisher uploads content to CDN storage before users ask", "Large media catalogs, game downloads", "More release orchestration and storage management"],
          ]}
        />
        <P>
          Many CDNs also support <Term>origin shielding</Term>: instead of every
          edge POP fetching from your origin during a global miss storm, all edges
          fetch through one regional shield cache. The shield collapses duplicate
          misses, so your S3 bucket or origin server sees one refill rather than
          thousands.
        </P>
        <CodeBlock label="origin shield collapses a miss storm">{`many edge POPs miss /trailer.mp4 at once
          │
          ▼
   regional shield cache  ── one fetch ──▶ origin
          │
          └─ fills edges as they request the object`}</CodeBlock>
      </LessonSection>

      <LessonSection id="invalidation-private" title="Invalidation, purge, and private content">
        <P>
          Cache invalidation is the price of caching. If the origin changes a file
          while edges still have a fresh copy, users may see stale bytes until the
          TTL expires. You have three common tools: wait for TTL, deploy a new
          versioned URL, or explicitly <Term>purge</Term> the old cache entry.
        </P>
        <UL>
          <LI>
            <Term>Purge by URL:</Term> fast for a small set of known objects, such
            as one incorrect image.
          </LI>
          <LI>
            <Term>Purge by prefix or tag:</Term> useful for a product category or
            tenant, but can be slower or costlier.
          </LI>
          <LI>
            <Term>Soft purge:</Term> marks content stale so the next request
            revalidates, often safer than deleting everything at once.
          </LI>
        </UL>
        <P>
          Private content can still use a CDN, but access control must move to the
          edge. Use <Term>signed URLs</Term> or signed cookies that encode an
          expiry, allowed path, and sometimes IP or policy claims. The CDN verifies
          the signature before serving the cached object, while the origin remains
          hidden and protected.
        </P>
        <CodeBlock label="signed CDN URL for private media">{`GET https://cdn.example.com/private/video/lesson-42.m3u8
  ?expires=1790000000
  &policy=path:/private/video/lesson-42/*
  &signature=HMAC(policy + expires)`}</CodeBlock>
        <Callout type="warning" title="Gotchas that hurt production systems">
          Do not cache personalized responses unless the cache key includes the
          personalization dimension and the data is safe to share. Be careful with
          query strings, cookies, compression variants, CORS headers, and purge
          delays. A CDN makes good cache decisions very powerful and bad cache
          decisions very global.
        </Callout>
      </LessonSection>

      <LessonSection id="examples" title="Real-world CDN patterns">
        <UL>
          <LI>
            <Term>Next.js assets:</Term> hashed JavaScript chunks, CSS, and images
            are ideal long-TTL CDN content.
          </LI>
          <LI>
            <Term>Video streaming:</Term> HLS/DASH manifests and segments are
            cached at the edge so seeking and playback avoid origin round trips.
          </LI>
          <LI>
            <Term>Software downloads:</Term> release binaries and installers use
            CDNs to avoid melting one origin during launch day.
          </LI>
          <LI>
            <Term>Private training content:</Term> the object is cached, but only
            users with valid signed URLs or cookies can access it.
          </LI>
        </UL>
        <Callout type="info" title="Related design pattern">
          See <XLink href="/learn/pattern-cdn">the CDN pattern</XLink> for a
          more end-to-end architecture view, including cache keys, origin failover,
          and deployment strategy.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "A CDN places cache servers in edge POPs near users, reducing physical distance and keeping repeated bytes away from your origin.",
          "Cache-Control headers, TTLs, and cache keys decide what is reused, for how long, and across which request variants.",
          "Pull CDNs fetch from origin on misses; push CDNs receive content ahead of time. Origin shielding collapses global miss storms.",
          "Invalidation is handled with versioned URLs, TTL expiry, and explicit purges; each has latency, cost, and operational trade-offs.",
          "Private content can still be CDN-delivered with signed URLs or signed cookies, but personalized data must be cached with extreme care.",
        ]}
      />

      <CheckYourself question="Why is a content-hashed filename such as app.8fd1.js easier to cache than app.js?">
        The URL changes whenever the bytes change, so old and new versions can
        safely coexist. That lets you use a very long TTL and
        <code>immutable</code> without worrying that a user will keep receiving
        stale code after a deploy.
      </CheckYourself>

      <CheckYourself question="What problem does origin shielding solve during a viral traffic spike?">
        Without shielding, many edge POPs can miss at the same time and all fetch
        the same object from the origin. A shield cache collapses those misses so
        the origin sees far fewer requests, protecting storage, bandwidth, and
        upstream services.
      </CheckYourself>

      <CheckYourself question="How can a private video be served through a CDN without making it public?">
        Use a stable CDN path for cacheability, but require a signed URL or signed
        cookie. The CDN verifies the signature, expiry, and path policy at the
        edge before serving the cached bytes.
      </CheckYourself>
    </Prose>
  );
}
