import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicBySlug } from "@/lib/db/topics";
import { getDesignsByTopic } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { ArrowRight, ChevronRight, Inbox } from "lucide-react";

const DB_NAME = "drawlint-db";

const SIGNAL_STYLES: Record<string, string> = {
  "strong-hire": "bg-emerald-500 text-white",
  hire: "bg-emerald-400 text-white",
  "lean-hire": "bg-yellow-400 text-yellow-900",
  "lean-no-hire": "bg-orange-400 text-white",
  "no-hire": "bg-red-500 text-white",
};

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire",
  hire: "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

const LEVEL_COLORS: Record<string, string> = {
  mid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  senior: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  staff: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  deep: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

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

  const enriched = await Promise.all(
    designs.map(async (design) => {
      const [author, review] = await Promise.all([
        db.collection("users").findOne(
          { _id: new ObjectId(design.userId) },
          { projection: { _id: 1, name: 1, image: 1 } },
        ),
        getReviewByDesignId(design._id.toString()),
      ]);
      return { design, author, review };
    }),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
            D
          </div>
          <span className="text-sm font-semibold tracking-tight">
            DrawLint<span className="text-violet-500">.ai</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/library"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-foreground hover:bg-muted transition-all"
          >
            Library
          </Link>
          <Link
            href="/canvas"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Start Drawing →
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/library" className="hover:text-foreground transition-colors">
            Library
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{topic.name}</span>
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
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-16 text-center">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {enriched.map(({ design, author, review }) => {
              const signal = review?.leadReviewer?.signal;
              const date = new Date(design.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <Link
                  key={design._id.toString()}
                  href={`/canvas?view=${design._id.toString()}`}
                  className="group rounded-xl border bg-card p-5 text-card-foreground transition-all hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {author?.image ? (
                      <img
                        src={author.image as string}
                        alt={String(author.name ?? "User")}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                        {String(author?.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {String(author?.name ?? "Anonymous")}
                      </p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                        LEVEL_COLORS[design.reviewLevel] ?? ""
                      }`}
                    >
                      {design.reviewLevel.charAt(0).toUpperCase() + design.reviewLevel.slice(1)}
                    </span>
                    {signal && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                          SIGNAL_STYLES[signal] ?? ""
                        }`}
                      >
                        {SIGNAL_LABELS[signal] ?? signal}
                      </span>
                    )}
                    {design.status !== "reviewed" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                        {design.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                    View Design
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
