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
        A soft delete marks a record as deleted instead of physically removing it
        immediately. The marker is often a <code>deleted_at</code> timestamp,
        status field, or <Term>tombstone</Term>. This keeps enough information for
        audit, undo, replication, caches, search indexes, and CDC consumers to
        observe that the delete happened before storage is reclaimed later.
      </P>

      <Analogy>
        Soft delete is crossing a name off a signup sheet instead of tearing the
        row out. Everyone who already copied the sheet can see that the person was
        removed, and an administrator can still understand what happened. Later,
        after every copy has been updated, you can shred the old sheet.
      </Analogy>

      <LessonSection id="problem" title="The problem: hard delete makes history disappear too fast">
        <P>
          The intuitive operation is <code>DELETE FROM posts WHERE id = ?</code>.
          In a single isolated database that may be fine. In a real system, that
          post may already be present in materialized feeds, Redis caches, search
          indexes, analytics events, backups, mobile sync clients, and downstream
          services. If the row vanishes before those systems learn about the
          deletion, stale copies can remain visible or even resurrect the data.
        </P>
        <CompareTable
          headers={["Delete style", "What happens immediately", "Best for", "Main risk"]}
          rows={[
            ["Hard delete", "Row is physically removed", "Truly temporary data with no downstream references", "Consumers that missed the delete cannot tell it happened"],
            ["Soft delete", "Row stays with deleted_at/status marker", "Audit, undo, sync, CDC, feeds, search cleanup", "Queries must consistently filter deleted rows"],
            ["Tombstone in distributed store", "A delete marker replicates to other nodes", "Eventually consistent databases and log compaction", "Too many tombstones hurt reads until compaction"],
          ]}
        />
        <Callout type="key" title="The core idea">
          Delete is an event, not just absence. Keeping a tombstone gives other
          systems something concrete to observe, replicate, index, and eventually
          garbage collect.
        </Callout>
      </LessonSection>

      <LessonSection id="mechanics" title="Mechanics: deleted_at, filters, and partial indexes">
        <P>
          The common relational pattern is to add nullable <code>deleted_at</code>
          and sometimes <code>deleted_by</code> or <code>delete_reason</code>. User
          deletes become updates. Normal reads filter for active rows. Admin or
          audit views can explicitly include tombstones.
        </P>
        <CodeBlock label="soft delete query filter and partial index">{`-- table shape
ALTER TABLE posts ADD COLUMN deleted_at timestamptz;
ALTER TABLE posts ADD COLUMN deleted_by bigint;

-- user delete
UPDATE posts
SET deleted_at = now(), deleted_by = $actor_id
WHERE id = $post_id AND deleted_at IS NULL;

-- every normal read must include the active-row predicate
SELECT id, author_id, body, created_at
FROM posts
WHERE author_id = $author_id
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- keep active-row queries fast and uniqueness sane
CREATE INDEX posts_active_author_created_idx
  ON posts (author_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX usernames_active_unique_idx
  ON users (lower(username))
  WHERE deleted_at IS NULL;`}</CodeBlock>
        <H3>Why partial indexes matter</H3>
        <P>
          If 40% of rows are deleted and every query scans both active and deleted
          rows, soft delete silently taxes every read. Partial indexes keep active
          rows compact. They also let you express business rules like &quot;active
          usernames must be unique&quot; while allowing old deleted rows to retain
          their historical values.
        </P>
        <UL>
          <LI>
            <Term>Use scopes or repository methods:</Term> centralize the
            <code>deleted_at IS NULL</code> predicate so one forgotten query does
            not leak deleted data.
          </LI>
          <LI>
            <Term>Make deletes idempotent:</Term> deleting an already-deleted row
            should be safe and return success or a clear no-op result.
          </LI>
          <LI>
            <Term>Record who and why:</Term> audit trails are much more useful when
            the tombstone includes actor and reason, not only a timestamp.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="propagation" title="Propagation: CDC consumers need to see the delete">
        <P>
          Soft delete pairs naturally with{" "}
          <XLink href="/learn/pattern-outbox-cdc">outbox and CDC</XLink>. The
          transaction updates the row and writes an event such as
          <code>PostDeleted</code>. CDC then publishes that event so caches,
          timelines, search indexes, and blob cleanup workers remove their copies.
        </P>
        <CodeBlock label="delete with outbox event">{`BEGIN;

UPDATE posts
SET deleted_at = now(), deleted_by = $actor_id
WHERE id = $post_id AND deleted_at IS NULL;

INSERT INTO outbox_events (aggregate_id, event_type, payload, created_at)
VALUES (
  $post_id,
  'PostDeleted',
  json_build_object('postId', $post_id, 'deletedBy', $actor_id),
  now()
);

COMMIT;

-- CDC publishes PostDeleted
-- feed service removes from timelines
-- search service removes from index
-- blob worker schedules media cleanup`}</CodeBlock>
        <Callout type="info" title="Delete must be observable">
          If you physically remove the row and publish later, a crash between those
          steps can lose the delete event. Updating the row and writing the outbox
          event in the same transaction makes the delete durable and observable.
        </Callout>
      </LessonSection>

      <LessonSection id="gc" title="Hard delete later: retention and garbage collection">
        <P>
          Soft delete is not a license to keep data forever. Most systems define a
          retention window: perhaps 30 days for undo, 90 days for compliance
          review, or 7 years for financial audit metadata. After that, a garbage
          collection job hard-deletes rows and cleans up external objects.
        </P>
        <CodeBlock label="eventual hard-delete job">{`DELETE FROM posts
WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - interval '90 days'
ORDER BY deleted_at
LIMIT 1000;

-- run repeatedly in small batches
-- delete dependent rows or rely on ON DELETE CASCADE where appropriate
-- delete blobs only after the metadata tombstone has propagated`}</CodeBlock>
        <UL>
          <LI>
            <Term>Batch small:</Term> large hard-delete transactions create locks,
            replication lag, and vacuum pressure.
          </LI>
          <LI>
            <Term>Respect legal holds:</Term> add a hold flag or retention policy
            so GC does not remove data required for investigation or compliance.
          </LI>
          <LI>
            <Term>Separate PII from audit:</Term> some systems anonymize personal
            fields while keeping non-personal audit facts.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="distributed" title="Tombstones in distributed stores like Cassandra">
        <P>
          In eventually consistent databases, a delete marker prevents
          resurrection. Suppose replica A sees a delete but replica B was down. If
          A simply removes the value, B might later come back with an old value and
          repair could copy it back. A tombstone says &quot;this key was deleted at
          time T&quot;, and that marker replicates just like a write.
        </P>
        <CompareTable
          headers={["Concept", "Relational soft delete", "Cassandra-style tombstone"]}
          rows={[
            ["Stored as", "deleted_at/status columns on the row", "Delete marker with timestamp"],
            ["Purpose", "Audit, undo, CDC, query filtering", "Replicate delete and suppress older values"],
            ["Cleanup", "Application GC job after retention", "Compaction after gc_grace_seconds"],
            ["Main danger", "Forgotten filters leak deleted rows", "Tombstone buildup slows reads and can cause warnings"],
          ]}
        />
        <P>
          Cassandra keeps tombstones for a grace period, commonly controlled by
          <code>gc_grace_seconds</code>. The grace period must be longer than the
          maximum time a replica can be down and still rejoin safely. Compacting
          tombstones too early risks old data coming back from a stale replica.
        </P>
        <Callout type="warning" title="Tombstones are not free">
          A query that scans many deleted cells may have to read and skip all those
          tombstones. Data models with frequent deletes need compaction strategy,
          TTL discipline, and query patterns that avoid huge tombstone ranges.
        </Callout>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and real-world examples">
        <P>
          Social posts, user accounts, invoices, issue trackers, emails, and
          product catalog entries often use soft delete. The pattern supports
          &quot;undo&quot;, moderation audit, account recovery, downstream cleanup, and
          safe replication. The cost is that every layer must understand active vs.
          deleted state.
        </P>
        <UL>
          <LI>
            <Term>Authorization:</Term> deleted rows should generally be invisible
            to normal users but visible to admins or owners in recovery flows.
          </LI>
          <LI>
            <Term>Unique constraints:</Term> decide whether a deleted username or
            slug can be reused, then encode that decision with partial indexes.
          </LI>
          <LI>
            <Term>Foreign keys:</Term> child rows may also need tombstones, or they
            may remain for audit even after the parent is hidden.
          </LI>
          <LI>
            <Term>Backups:</Term> a hard-deleted row may still exist in backups for
            a retention period. Compliance promises must include backup policy.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Soft delete records deletion as state, commonly deleted_at/status plus actor and reason, instead of immediately removing the row.",
          "Tombstones let downstream systems, CDC pipelines, replicas, caches, and search indexes observe and propagate the delete.",
          "Every normal read must filter active rows, and partial indexes keep those filtered reads and uniqueness checks fast.",
          "Hard-delete later with small GC batches after retention, undo windows, legal holds, and downstream cleanup are satisfied.",
          "Distributed stores keep tombstones through a grace period so stale replicas cannot resurrect deleted data during repair.",
        ]}
      />

      <CheckYourself question="Why is delete represented as a tombstone instead of just absence?">
        Absence does not tell downstream systems what happened. A tombstone is an
        observable fact: this item existed and was deleted at a specific time, so
        replicas, caches, search, and CDC consumers can remove their copies safely.
      </CheckYourself>

      <CheckYourself question="How do partial indexes help a soft-delete table?">
        They index only active rows, such as <code>WHERE deleted_at IS NULL</code>.
        That keeps normal reads fast even when many deleted rows remain and lets
        uniqueness rules apply only to active records.
      </CheckYourself>

      <CheckYourself question="Why does Cassandra keep tombstones for a grace period before compaction?">
        The grace period gives down replicas time to return and receive the delete
        marker. If the tombstone were compacted too early, a stale replica could
        reintroduce the old value during repair.
      </CheckYourself>
    </Prose>
  );
}
