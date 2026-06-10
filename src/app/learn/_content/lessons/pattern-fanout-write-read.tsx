import {
  Prose,
  LessonSection,
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
        <Term>Fan-out on write</Term> and <Term>fan-out on read</Term> are the two
        classic ways to build a social feed, notification inbox, activity stream,
        or personalized timeline. The decision is simple to state: do the work
        when someone publishes, or do the work when someone opens the feed?
      </P>

      <Analogy>
        Fan-out on write is printing a newsletter and dropping a copy into every
        subscriber mailbox immediately. Reading is instant, but publishing is
        expensive. Fan-out on read is keeping one master copy at the front desk;
        each reader gets a custom packet assembled only when they arrive.
        Publishing is cheap, but each read does more work.
      </Analogy>

      <LessonSection id="problem" title="The problem: timeline reads and writes scale differently">
        <P>
          A feed is a many-to-many problem. One author has many followers, and one
          reader follows many authors. If Alice follows 800 people, her home feed
          needs to merge recent posts from 800 sources. If a celebrity has 200
          million followers, one post may need to appear in 200 million feeds.
          Neither extreme is safe to handle naively.
        </P>
        <CodeBlock label="the same post can be paid for at write time or read time">{`// Fan-out on write: pay when the author publishes.
POST /posts
  save post p
  for follower in followers(author):
    LPUSH timeline:{follower} p

GET /home
  return LRANGE timeline:{viewer} 0 499

// Fan-out on read: pay when the viewer opens the feed.
GET /home
  authors = following(viewer)
  posts = fetchRecentPosts(authors)
  return mergeRankAndTrim(posts)`}</CodeBlock>
        <P>
          The right answer depends on read/write ratio, follower distribution,
          freshness requirements, ranking complexity, and acceptable storage
          duplication. Production social systems usually combine both models.
        </P>
      </LessonSection>

      <LessonSection id="push-model" title="Fan-out on write: push into precomputed timelines">
        <P>
          In the push model, publishing a post triggers a background job that
          inserts that post ID into each follower timeline. Reads are then cheap:
          load the viewer timeline from Redis or a feed store, hydrate the post
          IDs, rank or filter if needed, and return the page.
        </P>
        <UL>
          <LI>
            <Term>Fast reads:</Term> the expensive follower expansion already
            happened, so opening the app can be a single timeline lookup.
          </LI>
          <LI>
            <Term>Write amplification:</Term> one post becomes many timeline
            writes. A user with 5,000 followers creates 5,000 feed insertions.
          </LI>
          <LI>
            <Term>Storage duplication:</Term> the same post ID is copied into
            many precomputed lists. Usually this is acceptable because lists store
            IDs, not the full post body.
          </LI>
        </UL>
        <CodeBlock label="precomputed timeline in Redis">{`// Author 42 publishes post 9001.
followers = [7, 8, 9, ...]

for followerId in followers:
  LPUSH home_timeline:{followerId} 9001
  LTRIM home_timeline:{followerId} 0 999

// Viewer 7 opens the app.
postIds = LRANGE home_timeline:7 0 49
posts = MGET post:{id} for id in postIds`}</CodeBlock>
        <Callout type="tip" title="Cap the timeline">
          Feed caches are usually capped to the most recent few hundred or few
          thousand IDs. Infinite history lives in the post store; the timeline
          cache is a fast recent window.
        </Callout>
      </LessonSection>

      <LessonSection id="pull-model" title="Fan-out on read: assemble when the viewer asks">
        <P>
          In the pull model, publishing saves the post once. When a viewer opens
          the feed, the service fetches recent posts from everyone the viewer
          follows, merges them by time and ranking features, filters blocked or
          muted authors, and returns the top items.
        </P>
        <CompareTable
          headers={["Dimension", "Fan-out on write / push", "Fan-out on read / pull"]}
          rows={[
            [
              "Post creation",
              "Expands to every follower timeline",
              "Writes one post record only",
            ],
            [
              "Home feed read",
              "Reads a precomputed list, then hydrates posts",
              "Fetches many author streams, merges, ranks, and trims",
            ],
            [
              "Best for",
              "Normal users with bounded follower counts and high read volume",
              "Authors with huge audiences or systems with rare reads",
            ],
            [
              "Main failure mode",
              "Celebrity post creates massive write amplification",
              "Viewer following many authors creates slow feed assembly",
            ],
            [
              "Storage",
              "Duplicates post IDs across follower timelines",
              "Stores each post once, but spends CPU on reads",
            ],
          ]}
        />
        <P>
          Pull is attractive for long-tail authors and cold feeds. If most users
          rarely open the app, pushing every post to every inactive timeline wastes
          work. Pull delays the cost until a human actually asks for the feed.
        </P>
      </LessonSection>

      <LessonSection id="celebrity-hybrid" title="The celebrity problem and the hybrid answer">
        <P>
          Pure push breaks on hot authors. A celebrity, brand, or emergency alert
          account with 200 million followers cannot synchronously write one post
          into 200 million timelines. Even if the writes are asynchronous, the
          queue backlog, Redis pressure, and storage churn can overwhelm the
          system.
        </P>
        <P>
          The common production fix is a <Term>hybrid feed</Term>. Push normal
          authors into follower timelines. Do not push celebrity or hot-user
          posts into every follower timeline. Instead, keep celebrity posts in
          author streams and pull them at read time for viewers who follow those
          authors.
        </P>
        <CodeBlock label="hybrid feed read">{`function readHome(viewer):
  // Precomputed push timeline for normal authors.
  base = redis.lrange("home_timeline:" + viewer, 0, 499)

  // Small set: celebrity accounts this viewer follows.
  hotAuthors = getHotAuthorsFollowedBy(viewer)
  hotPosts = []
  for author in hotAuthors:
    hotPosts += redis.lrange("author_posts:" + author, 0, 20)

  return rankAndMerge(base, hotPosts).take(50)`}</CodeBlock>
        <Callout type="key" title="Bound the expensive side">
          The hybrid makes one celebrity post cheap to publish and keeps normal
          feed reads fast. Read time pays only for the small number of hot authors
          the viewer follows, not for everyone in the graph.
        </Callout>
        <P>
          This is also where{" "}
          <XLink href="/learn/pattern-two-stage-fanout">two-stage fan-out</XLink>{" "}
          appears: a lightweight first pass delivers IDs quickly, and a second
          stage enriches, ranks, or backfills. Hot celebrity streams often need{" "}
          <XLink href="/learn/pattern-hot-key">hot-key mitigation</XLink> because
          millions of readers may request the same author feed.
        </P>
      </LessonSection>

      <LessonSection id="ranking-consistency" title="Ranking, freshness, and consistency gotchas">
        <UL>
          <LI>
            <Term>Deletes and privacy changes:</Term> a deleted post may already
            exist in many precomputed timelines. Reads must hydrate by ID and
            re-check visibility, or a cleanup job must remove stale references.
          </LI>
          <LI>
            <Term>Follow and unfollow:</Term> when a viewer follows someone new,
            you may backfill recent posts into the timeline. On unfollow, you may
            lazily filter those posts at read time rather than remove every old
            entry immediately.
          </LI>
          <LI>
            <Term>Ranking changes:</Term> precomputed chronological lists are easy
            to cache. Machine-learned ranking may still need read-time features,
            hydration, and reordering.
          </LI>
          <LI>
            <Term>Duplicate posts:</Term> hybrid feeds can see the same post from
            base timeline and hot-author pull. Deduplicate by post ID before
            ranking.
          </LI>
          <LI>
            <Term>Backpressure:</Term> fan-out workers must be rate-limited. If
            queues grow, degrade gracefully by delaying low-priority fan-out or
            switching selected authors to pull mode temporarily.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="real-world" title="Real-world examples">
        <P>
          Social networks, team chat, notification centers, activity streams, and
          news feeds all use this trade-off. Twitter-like timelines often push
          ordinary users and pull celebrities. A chat app may push unread
          counters and recent message IDs into per-user inboxes. A notification
          system may push critical alerts but pull low-priority activity on
          demand.
        </P>
        <CompareTable
          headers={["System", "Likely pattern", "Reason"]}
          rows={[
            [
              "Home timeline",
              "Hybrid push plus pull",
              "Fast reads for normal graph; celebrity posts avoid write storms",
            ],
            [
              "Email inbox",
              "Write-time delivery",
              "Each message belongs in recipient mailboxes and reads must be fast",
            ],
            [
              "Analytics activity feed",
              "Read-time assembly",
              "Reads are rare and freshness can be computed on demand",
            ],
          ]}
        />
      </LessonSection>

      <KeyTakeaways
        items={[
          "Fan-out on write pushes each post into follower timelines at publish time, making reads fast but writes expensive.",
          "Fan-out on read stores the post once and assembles the feed on demand, making writes cheap but reads expensive.",
          "Pure push breaks for celebrities because one post can trigger millions of timeline writes.",
          "Production feeds are usually hybrid: push normal authors, pull hot authors at read time, then merge and rank.",
          "Precomputed Redis timelines are fast recent windows; reads still need hydration, visibility checks, deduplication, and ranking.",
        ]}
      />

      <CheckYourself question="Why does pure fan-out on write break for a celebrity account?">
        One post expands into a write for every follower timeline. At celebrity
        scale, that creates enormous queue backlog, cache pressure, storage churn,
        and delayed delivery. The hybrid skips that push and pulls celebrity
        posts during feed reads.
      </CheckYourself>

      <CheckYourself question="When is fan-out on read a better fit than fan-out on write?">
        It fits when reads are rare, audiences are huge, or writing into every
        potential recipient timeline would waste more work than assembling the
        feed on demand. It also fits hot authors whose posts would overload the
        push pipeline.
      </CheckYourself>

      <CheckYourself question="What should a hybrid feed do at read time?">
        Load the precomputed timeline for normal pushed authors, fetch recent
        posts for hot authors the viewer follows, merge the two sets, deduplicate
        by post ID, apply visibility checks, rank, and return the top page.
      </CheckYourself>
    </Prose>
  );
}
