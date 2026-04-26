import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicBySlug } from "@/lib/db/topics";
import { getDesignsByTopic } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { ArrowRight, ChevronRight, Inbox } from "lucide-react";
import { Header } from "@/components/layout";
import { FilterableDesignGrid } from "@/components/library/FilterableDesignGrid";

const DB_NAME = "drawlint-db";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TopicDesignsPage({ params }: PageProps) {
  const { slug } = await params;

  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  const designs = await getDesignsByTopic(topic._id.toString());

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
      // Check for re-evaluated signal
      const reeval = review ? await getReEvalSignal(review._id.toString()) : null;
      return { design, author, review, reeval };
    }),
  );

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
          <span className="text-foreground font-medium rounded-full bg-card/60 dark:bg-card/40 px-2 py-0.5 backdrop-blur-sm">{topic.name}</span>
        </nav>
      </div>

      {/* Topic Header */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-4 pb-8">
        <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
        {topic.description && (
          <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {topic.submissionCount} {topic.submissionCount === 1 ? "design" : "designs"} submitted
        </p>
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
            designs={enriched.map(({ design, author, review, reeval }) => ({
              designId: design._id.toString(),
              displayName: design.anonymousName ?? String(author?.name ?? "Anonymous"),
              avatarUrl: !design.anonymousName && author?.image ? String(author.image) : null,
              reviewLevel: design.reviewLevel,
              signal: reeval?.updatedSignal ?? review?.leadReviewer?.signal ?? null,
              reviewedBy: review?.reviewedBy ?? null,
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
