import { getTopics } from "@/lib/db/topics";
import { Header } from "@/components/layout";
import { LibraryTabs } from "@/components/library/LibraryTabs";

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

      {/* Topics Grid + My Designs */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <LibraryTabs
          topics={topics.map(t => ({ _id: t._id.toString(), name: t.name, slug: t.slug, description: t.description, submissionCount: t.submissionCount }))}
        />
      </section>
    </div>
  );
}
