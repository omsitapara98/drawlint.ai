import Link from "next/link";
import { getTopics } from "@/lib/db/topics";
import { ArrowRight, BookOpen } from "lucide-react";
import { Header } from "@/components/layout";
import { SearchableTopicGrid } from "@/components/library/SearchableTopicGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Design Library — DrawLint.ai",
  description: "Browse peer-reviewed system designs from the community.",
};

export default async function LibraryPage() {
  const topics = await getTopics("popular", 50);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-violet-500/8 via-background to-cyan-500/5 dark:from-violet-500/10 dark:via-background dark:to-cyan-500/5 px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold font-heading tracking-tight sm:text-4xl">
            System Design Library
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Explore real system designs reviewed by AI — learn from the community&apos;s architecture decisions
          </p>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        {topics.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No topics yet</p>
            <Link
              href="/canvas"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-6 h-9 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-[0_0_24px_oklch(0.72_0.25_285_/_35%)] transition-all hover:-translate-y-0.5"
            >
              Submit the first design
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <SearchableTopicGrid topics={topics.map(t => ({ _id: t._id.toString(), name: t.name, slug: t.slug, description: t.description, submissionCount: t.submissionCount }))} />
        )}
      </section>
    </div>
  );
}
