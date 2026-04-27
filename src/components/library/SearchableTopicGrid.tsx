"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Topic {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  source?: "official" | "community";
  submissionCount: number;
}

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" },
  hard: { label: "Hard", color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300" },
} as const;

const SOURCE_CONFIG = {
  official: { label: "Official", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300", icon: "✦" },
  community: { label: "Community", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300", icon: "👥" },
} as const;

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function SearchableTopicGrid({ topics }: { topics: Topic[] }) {
  const [query, setQuery] = useState("");
  const [diffFilter, setDiffFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  const hasOfficialTopics = topics.some((t) => t.difficulty);

  const filtered = topics.filter((t) => {
    if (query.trim() && !t.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (diffFilter !== "all" && t.difficulty !== diffFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search + Difficulty filter row */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            className="w-full rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm pl-10 pr-10 h-11 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)] transition-all placeholder:text-muted-foreground/60"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Difficulty filter pills — only for official topics */}
        {hasOfficialTopics && (
          <div className="flex items-center gap-1.5">
            {(["all", "easy", "medium", "hard"] as const).map((level) => {
              const isActive = diffFilter === level;
              const config = level === "all"
                ? { label: "All", color: isActive ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:text-foreground" }
                : { label: DIFFICULTY_CONFIG[level].label, color: isActive ? DIFFICULTY_CONFIG[level].color : "bg-muted/60 text-muted-foreground hover:text-foreground" };
              return (
                <button
                  key={level}
                  onClick={() => setDiffFilter(level)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${config.color}`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results count when filtering */}
      {(query.trim() || diffFilter !== "all") && (
        <p className="text-center text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "topic" : "topics"} found
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
          <Search className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No topics match your search</p>
          <button
            onClick={() => { setQuery(""); setDiffFilter("all"); }}
            className="text-xs text-violet-500 hover:underline"
          >
            Clear search
          </button>
        </motion.div>
      ) : (
        <motion.div
          key={`${query}-${diffFilter}`} // Re-trigger animation on search/filter change
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((topic) => (
            <motion.div key={topic._id} variants={item}>
              <Link
                href={`/library/${topic.slug}`}
                className="group block rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md shadow-black/[0.04] dark:shadow-none p-6 text-card-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {topic.name}
                  </h2>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[0.7rem] font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300 shadow-[0_0_6px_oklch(0.72_0.25_285_/_15%)]">
                    {topic.submissionCount}
                  </span>
                </div>
                {/* Difficulty + Source badges */}
                <div className="mt-2 flex items-center gap-1.5">
                  {topic.difficulty && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${DIFFICULTY_CONFIG[topic.difficulty].color}`}>
                      {DIFFICULTY_CONFIG[topic.difficulty].label}
                    </span>
                  )}
                  {topic.source && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${SOURCE_CONFIG[topic.source].color}`}>
                      <span className="text-[0.6rem]">{SOURCE_CONFIG[topic.source].icon}</span>
                      {SOURCE_CONFIG[topic.source].label}
                    </span>
                  )}
                </div>
                {topic.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {topic.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 transition-all group-hover:gap-2">
                  Browse Designs
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
