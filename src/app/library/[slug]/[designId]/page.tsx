import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import { ChevronRight, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { getDesignById } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import { getReEvalSignal } from "@/lib/db/responses";
import { getTopicBySlug } from "@/lib/db/topics";
import clientPromise from "@/lib/db/mongodb";
import { Header } from "@/components/layout";
import DesignDetailClient, {
  type SerializedReview,
} from "./DesignDetailClient";

const DB_NAME = "drawlint-db";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire",
  hire: "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

interface PageProps {
  params: Promise<{ slug: string; designId: string }>;
}

/** Shared loader — fetches the publicly-viewable design, its review, author, and topic. */
async function loadDesign(designId: string) {
  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return null;
  }
  // Drafts are private; only reviewed/submitted designs are public.
  if (!design || design.status === "draft") return null;

  const review = await getReviewByDesignId(designId);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const author = design.anonymousName
    ? null
    : await db.collection("users").findOne(
        { _id: new ObjectId(design.userId) },
        { projection: { _id: 1, name: 1, image: 1 } },
      );

  return { design, review, author };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, designId } = await params;
  const [topic, data] = await Promise.all([
    getTopicBySlug(slug),
    loadDesign(designId),
  ]);

  if (!topic || !data) {
    return { title: "Design not found — DrawLint.ai" };
  }

  const authorName = data.design.anonymousName ?? data.author?.name ?? "Anonymous";
  const signal =
    (data.review && SIGNAL_LABELS[data.review.leadReviewer?.signal ?? ""]) || null;
  const title = `${topic.name} — System Design by ${authorName} | DrawLint.ai`;
  const description = data.review?.summary
    ? data.review.summary.slice(0, 200)
    : `A ${topic.name} system design${signal ? ` rated "${signal}"` : ""} reviewed by 6 specialized AI reviewers on DrawLint.ai.`;
  const url = `${APP_URL}/library/${slug}/${designId}`;

  return {
    title,
    description,
    alternates: { canonical: `/library/${slug}/${designId}` },
    openGraph: {
      type: "article",
      url,
      siteName: "DrawLint.ai",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DesignDetailPage({ params }: PageProps) {
  const { slug, designId } = await params;

  const [topic, data, session] = await Promise.all([
    getTopicBySlug(slug),
    loadDesign(designId),
    auth(),
  ]);

  if (!topic || !data) notFound();

  const { design, review, author } = data;
  const userId = session?.user?.id ?? null;
  const isAuthor = userId !== null && design.userId.toString() === userId;
  const isAuthenticated = userId !== null;

  const authorName = design.anonymousName ?? author?.name ?? "Anonymous";
  const reeval = review ? await getReEvalSignal(review._id.toString()) : null;
  const signalKey = reeval?.updatedSignal ?? review?.leadReviewer?.signal ?? null;
  const signalLabel = signalKey ? SIGNAL_LABELS[signalKey] ?? null : null;

  const serializedReview: SerializedReview | null = review
    ? {
        _id: review._id.toString(),
        designId: review.designId.toString(),
        version: review.version,
        level: review.level,
        summary: review.summary,
        nfrReview: review.nfrReview,
        entitiesReview: review.entitiesReview,
        capacityReview: review.capacityReview,
        apiReview: review.apiReview,
        hldReview: review.hldReview,
        leadReviewer: review.leadReviewer,
        followUpQuestions: review.followUpQuestions,
        createdAt: new Date(review.createdAt).toISOString(),
      }
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${topic.name} — System Design`,
    url: `${APP_URL}/library/${slug}/${designId}`,
    author: { "@type": "Person", name: authorName },
    about: { "@type": "Thing", name: topic.name },
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "DrawLint.ai",
      url: APP_URL,
    },
    ...(serializedReview ? { abstract: serializedReview.summary } : {}),
    ...(design.hldExplanation
      ? { articleBody: design.hldExplanation.slice(0, 5000) }
      : {}),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      {/* Breadcrumb + heading */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/library" className="hover:text-foreground transition-colors">
            Library
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            href={`/library/${slug}`}
            className="hover:text-foreground transition-colors"
          >
            {topic.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium rounded-full bg-card/60 dark:bg-card/40 px-2 py-0.5 backdrop-blur-sm">
            {authorName}
          </span>
        </nav>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {topic.name} — system design by {authorName}
          </h1>
          {signalLabel && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
              {signalLabel}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviewed by 6 specialized AI reviewers. Explore the diagram and the full
          per-section feedback below.
        </p>
      </div>

      <div className="mt-6">
        <DesignDetailClient
          designId={designId}
          review={serializedReview}
          isAuthor={isAuthor}
          topicSlug={slug}
          hldExplanation={design.hldExplanation ?? null}
        />
      </div>

      {/* Funnel CTA for visitors who don't own this design */}
      {!isAuthor && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-12">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/5 p-8 text-center dark:border-violet-900/40">
            <Sparkles className="h-7 w-7 text-violet-500" />
            <h2 className="text-lg font-bold tracking-tight">
              Want this kind of feedback on your own design?
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Draw your architecture for <span className="font-medium text-foreground">{topic.name}</span> and
              get an instant hire/no-hire signal from 6 specialized AI reviewers — free to start.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={isAuthenticated ? `/canvas?topic=${slug}` : "/signup"}
                className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-6 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {isAuthenticated ? "Try this design" : "Get your free review"}
              </Link>
              <Link
                href={`/library/${slug}`}
                className="inline-flex h-10 items-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:border-violet-500/40"
              >
                See more {topic.name} designs
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
