import Link from "next/link";
import { getTopics } from "@/lib/db/topics";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "System Design Library — DrawLint.ai",
  description: "Browse peer-reviewed system designs from the community.",
};

export default async function LibraryPage() {
  const topics = await getTopics("popular", 50);

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
            href="/guide"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Guide
          </Link>
          <Link
            href="/canvas"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Start Drawing →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            System Design Library
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Browse peer-reviewed system designs from the community
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
              className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-6 h-9 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
            >
              Submit the first design
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Link
                key={topic._id.toString()}
                href={`/library/${topic.slug}`}
                className="group rounded-xl border bg-card p-6 text-card-foreground transition-all hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {topic.name}
                  </h2>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[0.7rem] font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                    {topic.submissionCount}
                  </span>
                </div>
                {topic.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {topic.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                  Browse Designs
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
