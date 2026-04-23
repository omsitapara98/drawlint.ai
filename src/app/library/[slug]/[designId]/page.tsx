import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getDesignById } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import { getTopicBySlug } from "@/lib/db/topics";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import DesignDetailClient from "./DesignDetailClient";
import type { SerializedReview } from "./DesignDetailClient";

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
  params: Promise<{ slug: string; designId: string }>;
}

export default async function DesignDetailPage({ params }: PageProps) {
  const { slug, designId } = await params;

  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    notFound();
  }
  if (!design) notFound();

  const review = await getReviewByDesignId(designId);

  // Fetch author
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const author = await db.collection("users").findOne(
    { _id: new ObjectId(design.userId) },
    { projection: { _id: 1, name: 1, image: 1 } },
  );

  const date = new Date(design.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const signal = review?.leadReviewer?.signal;

  // Serialize for client components (ObjectId → string, Date → string)
  const serializedReview = review
    ? (JSON.parse(JSON.stringify(review)) as SerializedReview)
    : null;

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
      <div className="mx-auto w-full max-w-7xl px-4 pt-4">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/library" className="hover:text-foreground transition-colors">
            Library
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/library/${slug}`} className="hover:text-foreground transition-colors">
            {topic.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Design</span>
        </nav>
      </div>

      {/* Author + Meta */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          {author?.image ? (
            <img
              src={author.image as string}
              alt={String(author.name ?? "User")}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              {String(author?.name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{String(author?.name ?? "Anonymous")}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          <div className="ml-4 flex flex-wrap items-center gap-1.5">
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
          </div>
        </div>
      </div>

      {/* Two-column: Excalidraw viewer + Review panel */}
      <DesignDetailClient
        designId={design._id.toString()}
        review={serializedReview}
      />
    </div>
  );
}
