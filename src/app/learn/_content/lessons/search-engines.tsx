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
        A <Term>search engine</Term> such as <Term>Elasticsearch</Term> is a
        specialized system for fast, ranked, full-text discovery over documents.
        It answers questions like &quot;which products match these words, filters,
        typos, and facets?&quot; much better than a primary database that is optimized
        for transactions and exact lookups.
      </P>

      <Analogy>
        A primary database is like the library checkout desk: it knows the
        authoritative record for every book and every loan. A search engine is the
        index in the back of every book combined into one giant map. You look up a
        word, jump straight to matching pages, and then rank which pages are most
        likely to answer the reader&apos;s question.
      </Analogy>

      <LessonSection id="problem" title="The problem: search is not just filtering rows">
        <P>
          The failure mode is treating a search box as a simple SQL filter. A query
          like <code>{"WHERE title LIKE '%phone%'"}</code> scans lots of text,
          misses synonyms and typos, cannot explain relevance, and struggles to
          return facet counts such as brand, size, and price range. Users expect
          the opposite: instant results, spelling tolerance, ranked matches, and
          filters that update as they type.
        </P>
        <UL>
          <LI>
            <Term>Text is messy:</Term> users type plurals, punctuation, casing,
            misspellings, abbreviations, and phrases.
          </LI>
          <LI>
            <Term>Ranking matters:</Term> a document that matches the title should
            usually rank above one that only matches a footnote.
          </LI>
          <LI>
            <Term>Facets matter:</Term> commerce and document search often need
            counts by category, tag, price range, author, or geography.
          </LI>
          <LI>
            <Term>Operational isolation matters:</Term> expensive exploratory
            queries should not slow down checkout, payments, or writes.
          </LI>
        </UL>
        <Callout type="key" title="The core idea">
          Keep the database as the source of truth. Copy searchable projections of
          that data into a search cluster designed around inverted indexes,
          ranking, shards, replicas, and near-real-time refresh.
        </Callout>
      </LessonSection>

      <LessonSection id="inverted-index" title="The inverted index: the key data structure">
        <P>
          A normal index maps a document ID to fields. An <Term>inverted index</Term>
          flips that around: it maps each term to the documents that contain it,
          often with positions, frequencies, and field information. A query becomes
          a fast lookup of posting lists, then a merge and rank operation.
        </P>
        <CodeBlock label="documents become term posting lists">{`Documents
D1: "fast red bike"
D2: "red running shoes"
D3: "bike repair manual"

Inverted index
bike    -> D1(pos=3), D3(pos=1)
fast    -> D1(pos=1)
manual  -> D3(pos=3)
red     -> D1(pos=2), D2(pos=1)
running -> D2(pos=2)
shoes   -> D2(pos=3)

Query: "red bike"
lookup red + bike -> intersect/merge -> D1 ranks high, D3 may rank lower`}</CodeBlock>
        <P>
          Real indexes store much more than document IDs. Positions enable phrase
          queries like <code>{"\"red bike\""}</code>. Term frequencies help scoring.
          Field names let a title match count more than a body match. Compression
          keeps posting lists compact enough to search quickly in memory and on
          disk.
        </P>
      </LessonSection>

      <LessonSection id="analysis-scoring" title="Analysis and relevance scoring">
        <P>
          Before text enters the inverted index, Elasticsearch runs an
          <Term>analyzer</Term>. Analysis turns raw text into normalized tokens.
          The same analysis, or a compatible query-time analysis, runs when the
          user searches.
        </P>
        <CompareTable
          headers={["Step", "What happens", "Example"]}
          rows={[
            ["Character filters", "Clean or rewrite raw characters", "Remove HTML, normalize punctuation"],
            ["Tokenizer", "Split text into tokens", "Quick brown fox -> quick, brown, fox"],
            ["Token filters", "Normalize tokens", "Lowercase, stem running -> run, remove stop words"],
            ["Synonyms", "Add equivalent terms", "tv -> television, laptop -> notebook"],
          ]}
        />
        <H3>Why one match ranks above another</H3>
        <P>
          Relevance scoring asks, &quot;How well does this document satisfy the
          query?&quot; Classic TF-IDF rewards terms that appear often in a document
          but are rare across the corpus. Elasticsearch commonly uses
          <Term>BM25</Term>, a modern descendant that also accounts for document
          length so very long documents do not win just because they contain more
          words.
        </P>
        <CodeBlock label="intuition behind TF-IDF / BM25 scoring">{`score(document, query) roughly increases when:
  - query terms appear in important fields (title > description > comments)
  - a term appears multiple times, up to a saturation point
  - a term is rare across the whole corpus ("kubernetes" beats "the")
  - matched words are close together for phrase/proximity queries

score decreases or normalizes when:
  - the document is very long and matches only weakly
  - filters exclude it (tenant, visibility, stock status)`}</CodeBlock>
        <Callout type="tip" title="Search quality is product work">
          Good search is not only infrastructure. You tune analyzers, synonyms,
          boosts, typo tolerance, field weights, and business ranking signals such
          as popularity, freshness, availability, or user locale.
        </Callout>
      </LessonSection>

      <LessonSection id="separate-system" title="Why search is separate from the primary database">
        <P>
          Your primary database is built for correctness: transactions,
          constraints, joins, point lookups, and writes. A search engine is built
          for retrieval: tokenized text, relevance scoring, aggregations, and
          horizontal query fan-out. Combining those jobs in one system usually
          makes both worse.
        </P>
        <CompareTable
          headers={["Concern", "Primary database", "Search engine"]}
          rows={[
            ["Source of truth", "Authoritative records and transactions", "Derived projection that can be rebuilt"],
            ["Query shape", "Exact lookup, joins, constraints", "Full-text, fuzzy, ranked, faceted search"],
            ["Freshness", "Committed data is immediately authoritative", "Near-real-time; may lag seconds"],
            ["Scaling", "Protect write path and transactional load", "Shard indexes and replicate for query throughput"],
          ]}
        />
        <P>
          Because the index is derived, correctness-critical actions must still
          re-check the database. If search says a hotel room, seat, or product is
          available, the booking or checkout transaction confirms it against the
          source of truth before committing.
        </P>
      </LessonSection>

      <LessonSection id="feeding-index" title="Feeding Elasticsearch with CDC and projections">
        <P>
          Applications usually feed search asynchronously. On every database
          change, a pipeline builds a <Term>search document</Term>: a denormalized
          JSON projection containing exactly the fields needed for search, filters,
          display snippets, and ranking. <Term>Change Data Capture</Term> (CDC) is
          a common way to do this without making every write synchronously update
          Elasticsearch.
        </P>
        <CodeBlock label="typical CDC indexing pipeline">{`Postgres transaction commits
  -> WAL/binlog records the change
  -> Debezium captures it
  -> Kafka topic: product.updated
  -> indexer service builds search document
  -> Elasticsearch _index /products/_doc/product_123

Search document example:
{
  "id": "product_123",
  "title": "Red running shoes",
  "brand": "Contoso",
  "category": "shoes",
  "price": 49.99,
  "in_stock": true,
  "popularity": 0.82
}`}</CodeBlock>
        <UL>
          <LI>
            <Term>At-least-once events:</Term> indexers must be idempotent because
            CDC events can be retried.
          </LI>
          <LI>
            <Term>Deletes matter:</Term> tombstone or remove documents when the
            source row is deleted or becomes invisible.
          </LI>
          <LI>
            <Term>Backfills matter:</Term> you need a safe way to rebuild an index
            from the database when mappings or analyzers change.
          </LI>
        </UL>
        <Callout type="info" title="Related design pattern">
          See <XLink href="/learn/pattern-elasticsearch">the Elasticsearch pattern</XLink>
          for a complete search architecture, including CDC, reindexing, aliases,
          and query serving.
        </Callout>
      </LessonSection>

      <LessonSection id="distributed" title="Shards, replicas, refresh, facets, and aggregations">
        <P>
          Elasticsearch distributes an index into <Term>primary shards</Term>. Each
          shard is a Lucene index that owns a slice of the documents. Replica
          shards copy primaries for high availability and query throughput. A query
          fans out to relevant shards, each shard returns top candidates, and the
          coordinating node merges the results.
        </P>
        <CodeBlock label="query fan-out and merge">{`client query: "red shoes" + filters brand=Contoso
        │
        ▼
coordinating node
  ├─ shard 0 searches local inverted index -> top 10 + facet counts
  ├─ shard 1 searches local inverted index -> top 10 + facet counts
  └─ shard 2 searches local inverted index -> top 10 + facet counts
        │
        ▼
merge scores, sort globally, combine aggregations, return page 1`}</CodeBlock>
        <P>
          Elasticsearch is <Term>near-real-time</Term>. A write is indexed, then a
          refresh makes new segments visible to search, commonly about once per
          second. Lower refresh intervals improve freshness but increase indexing
          and merge overhead; higher intervals improve throughput but increase
          visible lag.
        </P>
        <H3>Facets and aggregations</H3>
        <P>
          Faceted search computes counts over the result set: brand, color, price
          range, rating, author, file type, or region. Aggregations also power log
          dashboards and analytics, such as errors per service over time.
        </P>
        <CodeBlock label="faceted search response shape">{`query: "running shoes", filter: price < 100

hits:
  1. Red running shoes, $49.99
  2. Trail running shoes, $79.99

facets:
  brand:
    Contoso: 120
    Fabrikam: 88
  color:
    red: 41
    black: 132
  size:
    9: 57
    10: 64`}</CodeBlock>
        <Callout type="warning" title="Operational gotchas">
          Search clusters need capacity planning. Too many shards waste memory;
          too few limit parallelism. Large aggregations can be expensive. Mapping
          explosions from arbitrary JSON fields can destabilize a cluster. Index
          templates and query limits are production safety features, not polish.
        </Callout>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Elasticsearch uses inverted indexes: terms point to posting lists of documents, positions, and frequencies for fast lookup and ranking.",
          "Analysis turns messy text into searchable tokens; BM25/TF-IDF-style scoring ranks documents by term rarity, frequency, field importance, and length normalization.",
          "Search is a separate derived system because primary databases optimize for transactions and correctness, not fuzzy ranked retrieval and facets.",
          "CDC pipelines feed search indexes asynchronously, so search is near-real-time and must be revalidated against the database for correctness-critical actions.",
          "Shards distribute data, replicas add availability/query capacity, refresh controls visibility lag, and aggregations power faceted search and dashboards.",
        ]}
      />

      <CheckYourself question="Why is an inverted index faster than scanning every row with LIKE?">
        The search engine precomputes a map from terms to documents, so a query
        looks up and merges posting lists instead of reading every row. It also
        stores frequencies, positions, and field data needed for ranking and
        phrase matching.
      </CheckYourself>

      <CheckYourself question="Why should Elasticsearch not be the source of truth for booking a seat or charging a card?">
        The index is a derived, near-real-time copy that can lag or be temporarily
        inconsistent. Use it to discover candidates, then perform the final
        availability check, constraint validation, and transaction in the primary
        database.
      </CheckYourself>

      <CheckYourself question="What happens when you lower the Elasticsearch refresh interval to make writes visible faster?">
        New documents become searchable sooner, but the cluster does more refresh
        and segment work, which can reduce indexing throughput and increase
        resource usage. Freshness and throughput are a trade-off.
      </CheckYourself>
    </Prose>
  );
}
