"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { SearchableTopicGrid } from "./SearchableTopicGrid";
import { MyDesignsTab } from "./MyDesignsTab";

interface Topic {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  submissionCount: number;
}

export function LibraryTabs({ topics }: { topics: Topic[] }) {
  const [tab, setTab] = useState<"topics" | "my">("topics");

  return (
    <div className="space-y-8">
      {/* Tab bar */}
      <div className="flex items-center justify-center gap-1 rounded-full border dark:border-white/[0.08] bg-muted/50 p-1 mx-auto w-fit">
        <button
          onClick={() => setTab("topics")}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
            tab === "topics"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Topics
        </button>
        <button
          onClick={() => setTab("my")}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
            tab === "my"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Designs
        </button>
      </div>

      {/* Tab content */}
      {tab === "topics" ? (
        topics.length === 0 ? (
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
          <SearchableTopicGrid topics={topics} />
        )
      ) : (
        <MyDesignsTab />
      )}
    </div>
  );
}
