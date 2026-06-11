import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTopicBySlug, getTopicsBySlugs } from "@/lib/db/topics";
import { getDesignsByTopic } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { ArrowRight, ChevronRight, Clock, Inbox } from "lucide-react";
import { Header } from "@/components/layout";
import { FilterableDesignGrid } from "@/components/library/FilterableDesignGrid";
import { CollapsibleHints } from "@/components/library/CollapsibleHints";
import type { TopicDifficulty, TopicSource } from "@/types/library";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return { title: "Topic not found — DrawLint.ai" };

  const description =
    topic.brief ||
    topic.description ||
    `Explore community ${topic.name} system design solutions, each reviewed by 6 specialized AI reviewers on DrawLint.ai.`;
  const title = `${topic.name} — System Design Examples & AI Reviews | DrawLint.ai`;

  return {
    title,
    description: description.slice(0, 200),
    alternates: { canonical: `/library/${slug}` },
    openGraph: {
      type: "website",
      url: `/library/${slug}`,
      siteName: "DrawLint.ai",
      title,
      description: description.slice(0, 200),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
    },
  };
}

const DB_NAME = "drawlint-db";

/* ── Badge helpers ───────────────────────────────────────────── */

const difficultyConfig: Record<TopicDifficulty, { label: string; className: string }> = {
  easy: {
    label: "Easy",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  },
  medium: {
    label: "Medium",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
  hard: {
    label: "Hard",
    className: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
  },
};

const sourceConfig: Record<TopicSource, { label: string; className: string }> = {
  official: {
    label: "✦ Official",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
  },
  community: {
    label: "👥 Community",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
  },
};

/* ── Page ────────────────────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TopicDesignsPage({ params }: PageProps) {
  const { slug } = await params;

  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  // Fetch designs + related topics in parallel
  const [designs, relatedTopics] = await Promise.all([
    getDesignsByTopic(topic._id.toString()),
    topic.relatedSlugs?.length ? getTopicsBySlugs(topic.relatedSlugs) : Promise.resolve([]),
  ]);

  // Fetch authors + reviews in parallel
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const { getReEvalSignal } = await import("@/lib/db/responses");

  const enriched = await Promise.all(
    designs.map(async (design) => {
      const [author, review] = await Promise.all([
        db.collection("users").findOne(
          { _id: new ObjectId(design.userId) },
          { projection: { _id: 1, name: 1, image: 1, role: 1 } },
        ),
        getReviewByDesignId(design._id.toString()),
      ]);
      const reeval = review ? await getReEvalSignal(review._id.toString()) : null;
      return { design, author, review, reeval };
    }),
  );

  const hasRequirements = topic.requirements && topic.requirements.length > 0;
  const hasScale = topic.scale && topic.scale.length > 0;
  const hasHints = topic.hints && topic.hints.length > 0;
  const hasProblemInfo = hasRequirements || hasScale || hasHints;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/library" className="hover:text-foreground transition-colors">
            Library
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium rounded-full bg-card/60 dark:bg-card/40 px-2 py-0.5 backdrop-blur-sm">
            {topic.name}
          </span>
        </nav>
      </div>

      {/* Topic Header */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-4 pb-6">
        {/* Badges + time row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {topic.difficulty && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyConfig[topic.difficulty].className}`}
              >
                {difficultyConfig[topic.difficulty].label}
              </span>
            )}
            {topic.source && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceConfig[topic.source].className}`}
              >
                {sourceConfig[topic.source].label}
              </span>
            )}
          </div>
          {topic.timeMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {topic.timeMinutes} min
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">{topic.name}</h1>

        {topic.brief && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {topic.brief}
          </p>
        )}

        {/* Fall back to description when no brief */}
        {!topic.brief && topic.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {topic.description}
          </p>
        )}
      </section>

      {/* Problem Info Section */}
      {hasProblemInfo && (
        <section className="mx-auto w-full max-w-5xl px-4 pb-6">
          <div className="rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md p-6 space-y-6">
            {/* Reference disclaimer */}
            <p className="text-xs text-muted-foreground italic">
              These requirements and scale numbers are for reference. The AI reviewer will evaluate your design based on the functional requirements and assumptions you define.
            </p>

            {hasRequirements && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">🎯 Key Requirements</h3>
                <ul className="mt-2.5 space-y-2 text-sm text-foreground/80 dark:text-foreground/70">
                  {topic.requirements!.map((req, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-0.5 shrink-0 text-violet-500 dark:text-violet-400">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasScale && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">📐 Scale Expectations</h3>
                <ul className="mt-2.5 space-y-2 text-sm text-foreground/80 dark:text-foreground/70">
                  {topic.scale!.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-0.5 shrink-0 text-violet-500 dark:text-violet-400">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasHints && (
              <div className="border-t border-border dark:border-white/[0.06] pt-4">
                <CollapsibleHints hints={topic.hints!} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 pb-6">
          <h3 className="text-sm font-semibold mb-2">🔗 Related Topics</h3>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((rt) => (
              <Link
                key={rt.slug}
                href={`/library/${rt.slug}`}
                className="inline-flex items-center rounded-full border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 px-3 py-1 text-xs font-medium text-foreground hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {rt.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Section divider + Submissions heading */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-3">
        <div className="border-t border-border dark:border-white/[0.06]" />
        <h2 className="mt-4 text-sm font-semibold">
          Community Submissions ({topic.submissionCount})
        </h2>
      </section>

      {/* Designs */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-12">
        {enriched.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md shadow-black/[0.04] dark:shadow-none py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">No designs submitted yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Be the first!</p>
            </div>
            <Link
              href="/canvas"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-6 h-9 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
            >
              Go to Canvas
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <FilterableDesignGrid
            topicSlug={slug}
            designs={enriched.map(({ design, author, review, reeval }) => ({
              designId: design._id.toString(),
              displayName: design.anonymousName ?? String(author?.name ?? "Anonymous"),
              avatarUrl: !design.anonymousName && author?.image ? String(author.image) : null,
              reviewLevel: design.reviewLevel,
              signal: reeval?.updatedSignal ?? review?.leadReviewer?.signal ?? null,
              reviewedBy: review?.reviewedBy ?? null,
              submissionType: design.submissionType ?? "regular",
              status: design.status,
              date: new Date(design.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              isPremium: author?.role === "premium" || author?.role === "admin",
            }))}
          />
        )}
      </section>
    </div>
  );
}
