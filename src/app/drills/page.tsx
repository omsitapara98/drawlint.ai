import type { Metadata } from "next";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";
import { DrillRunner, DrillLeaderboard, DrillStatsWidget } from "@/components/drills";
import { Target } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";

const DESCRIPTION =
  "Sharpen your system design instincts with a free Daily Drill — 5 multiple-choice questions spanning all 27 system design patterns: storage, scalability, reliability, async processing, and more. Build your streak and climb the leaderboard.";

export const metadata: Metadata = {
  title: "Daily Drill — System Design MCQ | DrawLint.ai",
  description: DESCRIPTION,
  alternates: { canonical: "/drills" },
  openGraph: {
    type: "website",
    url: "/drills",
    siteName: "DrawLint.ai",
    title: "Daily Drill — System Design MCQ",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Drill — System Design MCQ",
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Quiz",
  name: "Daily System Design Drill",
  description: DESCRIPTION,
  url: `${APP_URL}/drills`,
  inLanguage: "en",
  isAccessibleForFree: true,
  educationalLevel: "Beginner to Intermediate",
  about: {
    "@type": "Thing",
    name: "System Design",
  },
  provider: {
    "@type": "Organization",
    name: "DrawLint.ai",
    url: APP_URL,
  },
};

export default function DrillsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ParticleBackground />
      <div className="relative min-h-screen">
        <Header />

        <main className="container mx-auto max-w-3xl px-4 py-14">
          {/* Hero */}
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300">
              <Target className="h-3.5 w-3.5" />
              New drill every day
            </div>
            <h1 className="mb-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              Daily{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Drill
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              A fresh 5-question quiz every day, drawn from all 27 system design
              patterns — storage, scaling, reliability, and more. Test your
              instincts, learn from the explanations, and keep your streak alive.
            </p>
          </div>

          <div className="mb-8">
            <DrillStatsWidget />
          </div>

          <div className="mb-12">
            <DrillRunner />
          </div>

          <DrillLeaderboard />
        </main>
      </div>
    </>
  );
}
