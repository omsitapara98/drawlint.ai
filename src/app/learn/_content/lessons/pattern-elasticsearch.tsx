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
        <Term>Elasticsearch</Term> is a distributed search engine you run
        alongside your source-of-truth database. It powers full-text search,
        relevance ranking, faceted filters, geo queries, and aggregations by
        maintaining a purpose-built search index. It is not the system of record;
        it is a fast, query-optimized projection of authoritative data.
      </P>

      <Analogy>
        Your relational database is the courthouse archive: authoritative,
        carefully updated, and legally binding. Elasticsearch is the index desk
        at the front: it can quickly tell you which files mention a phrase, fall
        in a date range, or relate to a location, but the official answer still
        comes from the archive itself.
      </Analogy>

      <LessonSection id="problem" title="The problem: transactional indexes are not search engines">
        <P>
          A database B-tree index is excellent for equality, ordering, and range
          predicates such as <code>{"user_id = 42"}</code> or{" "}
          <code>{"created_at > now() - interval '7 days'"}</code>. Product search
          asks a different kind of question: find documents containing related
          words, rank them by relevance, tolerate typos, filter by facets, group
          counts by brand, and maybe restrict results to a map viewport.
        </P>
        <CodeBlock label="queries that push past ordinary SQL indexes">{`search: "waterproof hiking boot"
filters: brand in ["Merrell", "Salomon"], size = 10, price < 150
rank: exact phrase > all terms > fuzzy matches > popularity boost
facets: count matching results by brand, size, color
geo: only stores within 25 km of the user`}</CodeBlock>
        <P>
          You can force some of this into SQL, but relevance scoring, analyzers,
          token positions, fuzzy matching, and distributed aggregations are what
          Elasticsearch was built to do. The trade-off is that the search index
          is eventually consistent with your database and must be rebuilt or
          replayed if it drifts.
        </P>
        <CompareTable
          headers={["System", "Best at", "Not best at"]}
          rows={[
            ["Relational database", "Transactions, constraints, authoritative writes", "Full-text ranking at large scale"],
            ["Elasticsearch", "Search, facets, geo, aggregations", "Being the final source of truth"],
            ["Cache", "Serving known hot answers", "Discovering ranked matches across text"],
          ]}
        />
      </LessonSection>

      <LessonSection id="pipeline" title="Index pipeline: feed search from the source of truth">
        <P>
          The safest architecture writes business facts to the database first and
          then feeds Elasticsearch from those changes. Many teams use{" "}
          <Term>Change Data Capture</Term> from the database log; others use an
          outbox table that is written in the same transaction as the business
          change. Either way, search is downstream from truth.
        </P>
        <CodeBlock label="CDC-fed search index">{`application
  └─▶ Postgres transaction commits product/order/venue row
        └─▶ WAL / outbox event records the change
              └─▶ CDC connector or outbox worker publishes event
                    └─▶ indexer transforms row into search document
                          └─▶ Elasticsearch bulk index / update / delete`}</CodeBlock>
        <UL>
          <LI>
            <Term>Database first:</Term> writes, constraints, and inventory checks
            happen in the authoritative store.
          </LI>
          <LI>
            <Term>Indexer second:</Term> a worker projects the row into a document
            optimized for search, often denormalizing related fields.
          </LI>
          <LI>
            <Term>Validation last:</Term> correctness-critical actions such as
            booking a ticket, buying inventory, or editing permissions re-check
            the database even if Elasticsearch found the candidate.
          </LI>
        </UL>
        <Callout type="info" title="Related pipeline pattern">
          The reliable way to move committed database changes into search is the{" "}
          <XLink href="/learn/pattern-outbox-cdc">Outbox / CDC pattern</XLink>.
          For the lower-level indexing concepts, see{" "}
          <XLink href="/learn/search-engines">Search Engines</XLink>.
        </Callout>
      </LessonSection>

      <LessonSection id="inverted-index" title="Inverted index recap: terms point to documents">
        <P>
          A normal row store answers by starting from rows. An inverted index
          starts from terms. During indexing, Elasticsearch analyzes text into
          tokens and records which documents contain each token, plus positions,
          frequencies, and optional norms for scoring. At query time it jumps
          straight to candidate documents instead of scanning every product name
          or article body.
        </P>
        <CodeBlock label="tiny inverted index">{`documents:
  1: "waterproof hiking boot"
  2: "lightweight trail shoe"
  3: "waterproof rain jacket"

inverted index:
  waterproof → [1, 3]
  hiking     → [1]
  boot       → [1]
  trail      → [2]
  jacket     → [3]

query "waterproof boot" → intersect/score postings for waterproof + boot`}</CodeBlock>
        <P>
          Real indexes add token positions for phrase queries, term frequencies
          for scoring, skip lists for fast traversal, doc values for sorting and
          aggregations, and segment-level metadata for pruning. The beginner
          mental model remains simple: search is fast because terms already point
          to candidate documents.
        </P>
      </LessonSection>

      <LessonSection id="mappings-analyzers" title="Mappings and analyzers shape search behavior">
        <P>
          A <Term>mapping</Term> tells Elasticsearch how each field should be
          indexed: full-text <code>text</code>, exact <code>keyword</code>, numeric,
          date, geo point, nested object, and so on. An <Term>analyzer</Term>
          controls how text becomes tokens: lowercasing, stemming, synonyms,
          stop-word removal, edge n-grams for autocomplete, or language-specific
          rules.
        </P>
        <CodeBlock label="mapping with text, keyword, geo, and facets">{`PUT products
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "english" },
      "title_suggest": { "type": "text", "analyzer": "edge_ngram" },
      "brand": { "type": "keyword" },
      "price_cents": { "type": "integer" },
      "available": { "type": "boolean" },
      "store_location": { "type": "geo_point" },
      "updated_at": { "type": "date" }
    }
  }
}`}</CodeBlock>
        <CompareTable
          headers={["Field choice", "Use it for", "Common mistake"]}
          rows={[
            ["text", "Full-text search with analysis and relevance", "Using it for exact filters or aggregations"],
            ["keyword", "Exact match, sorting, facets, IDs", "Expecting stemming or typo tolerance"],
            ["numeric/date", "Ranges, sorting, histograms", "Indexing numbers as strings"],
            ["geo_point", "Distance and bounding-box queries", "Forgetting coordinate normalization"],
          ]}
        />
        <Callout type="warning" title="Mappings are hard to change in place">
          Changing a field from <code>text</code> to <code>keyword</code>, or
          replacing an analyzer, usually requires creating a new index and
          reindexing. Production systems use versioned index names and an alias
          cutover to avoid downtime.
        </Callout>
      </LessonSection>

      <LessonSection id="queries" title="Query types: match, term, bool, geo, aggregations">
        <P>
          Elasticsearch exposes different query families because not every field
          should be interpreted the same way. A full-text search for a sentence is
          different from an exact filter on a brand, and both are different from a
          distance query or a facet count.
        </P>
        <CompareTable
          headers={["Query type", "What it means", "Example"]}
          rows={[
            ["match", "Analyze query text and score full-text matches", "Search title for waterproof boots"],
            ["term", "Exact token match, usually keyword fields", "brand is exactly Patagonia"],
            ["bool", "Combine must, should, filter, must_not clauses", "Text query plus price and availability filters"],
            ["geo", "Distance, polygon, or bounding-box search", "Stores within 25 km"],
            ["aggregations", "Group, count, histogram, percentile over matches", "Facet counts by brand and size"],
          ]}
        />
        <CodeBlock label="bool query with full-text, filters, geo, and facets">{`GET products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "waterproof hiking boot" } }
      ],
      "filter": [
        { "term": { "available": true } },
        { "range": { "price_cents": { "lte": 15000 } } },
        { "geo_distance": { "distance": "25km", "store_location": "47.6,-122.3" } }
      ]
    }
  },
  "aggs": {
    "brands": { "terms": { "field": "brand" } },
    "sizes": { "terms": { "field": "size" } }
  }
}`}</CodeBlock>
        <H3>Filters versus scoring</H3>
        <P>
          Put yes-or-no constraints in filter context so Elasticsearch can cache
          bitsets and avoid spending relevance work on them. Put text relevance
          in query context so matches can be scored and ranked.
        </P>
      </LessonSection>

      <LessonSection id="nrt-shards" title="Near-real-time refresh, shards, and replicas">
        <P>
          Elasticsearch is <Term>near real time</Term>. Indexed documents become
          searchable after a refresh, commonly around one second by default. That
          refresh publishes new immutable segments for search. It is fast enough
          for product search and logs, but it is not the same as reading your own
          committed database transaction immediately.
        </P>
        <CodeBlock label="near-real-time visibility">{`T+000ms database transaction commits product price change
T+030ms CDC event reaches indexer
T+080ms Elasticsearch indexes the document into an in-memory buffer
T+1000ms refresh opens a new searchable segment
T+1001ms search results can now include the new price`}</CodeBlock>
        <CompareTable
          headers={["Concept", "What it does", "Design impact"]}
          rows={[
            ["Primary shard", "Owns a slice of the index", "More shards can spread indexing/search, but too many add overhead"],
            ["Replica shard", "Copy of a primary shard", "Improves availability and read throughput"],
            ["Refresh", "Makes buffered changes searchable", "Lower intervals improve freshness but cost CPU/I/O"],
            ["Segment", "Immutable Lucene index file", "Merges happen in the background"],
          ]}
        />
        <UL>
          <LI>
            Shard count is a capacity decision. Oversharding creates cluster-state
            and heap overhead; undersharding can make shards too large to move or
            query efficiently.
          </LI>
          <LI>
            Replicas help search throughput and availability, but they do not
            make stale CDC events fresher.
          </LI>
          <LI>
            Bulk indexing is usually much faster and cheaper than one document per
            network request.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="truth-gotchas" title="Why the relational DB stays authoritative">
        <P>
          Search results are candidates, not final decisions. Elasticsearch may be
          behind because CDC lagged, a refresh has not happened, a shard was
          relocating, or a previous indexing job failed and needs replay. The
          source-of-truth database is where you enforce permissions, inventory,
          uniqueness, payment state, and business invariants.
        </P>
        <UL>
          <LI>
            <Term>Stale availability:</Term> search can show a hotel room or ticket
            that was just booked. Reservation must happen in the database.
          </LI>
          <LI>
            <Term>Out-of-order events:</Term> CDC consumers need versions or
            timestamps so an older update does not overwrite a newer document.
          </LI>
          <LI>
            <Term>Deletes:</Term> hard deletes, soft deletes, and privacy removals
            must be propagated and monitored carefully.
          </LI>
          <LI>
            <Term>Reindexing:</Term> analyzer or mapping changes require building a
            new index from the authoritative store, then switching an alias.
          </LI>
        </UL>
        <Callout type="key" title="Validate before committing user-visible truth">
          Use Elasticsearch to discover candidates quickly. Before charging,
          booking, granting access, or showing private data, re-read the database
          in the transaction or authorization path that owns the invariant.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Elasticsearch is a search index fed from the source-of-truth database; it is not the system of record.",
          "Inverted indexes make search fast by mapping analyzed terms to matching documents, positions, and scoring metadata.",
          "Mappings and analyzers determine whether fields support full-text relevance, exact filters, facets, geo search, ranges, and sorting.",
          "Search queries combine match, term, bool, geo, and aggregation clauses; filters constrain results while query clauses score them.",
          "Near-real-time refresh, CDC lag, shards, and replicas create freshness and operational trade-offs, so correctness-critical actions must validate against the database.",
        ]}
      />

      <CheckYourself question="Why should Elasticsearch not be the source of truth for ticket availability?">
        The index is fed asynchronously and refreshed near real time, so it can be
        stale. Use it to find candidate tickets, then reserve and charge against
        the authoritative database transaction that enforces inventory.
      </CheckYourself>

      <CheckYourself question="What is the difference between a match query and a term query?">
        A match query analyzes input text and computes relevance for full-text
        fields. A term query looks for an exact token, which is best for keyword
        fields such as IDs, brands, statuses, and facets.
      </CheckYourself>

      <CheckYourself question="Why do mapping or analyzer changes often require a reindex?">
        The analyzer and mapping decide how tokens are stored in the inverted
        index. If those rules change, existing segments were built with the old
        rules, so a new index must be built and an alias cut over safely.
      </CheckYourself>
    </Prose>
  );
}
