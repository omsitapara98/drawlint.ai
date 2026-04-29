"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, Sparkles, Zap, Key, X } from "lucide-react";
import { motion } from "framer-motion";

interface GalleryDesign {
  _id: string;
  topicName: string;
  topicSlug: string;
  displayName: string;
  avatarUrl: string | null;
  signal: string | null;
  reviewLevel: string;
  reviewedBy: string | null;
  submissionType: string;
  isPremium: boolean;
  createdAt: string;
}

const LEVEL_COLORS: Record<string, string> = {
  mid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  senior: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  staff: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  deep: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

const SIGNAL_STYLES: Record<string, string> = {
  "strong-hire": "bg-emerald-500 text-white shadow-[0_0_8px_oklch(0.7_0.2_160_/_30%)]",
  hire: "bg-emerald-400 text-white shadow-[0_0_8px_oklch(0.7_0.2_160_/_30%)]",
  "lean-hire": "bg-yellow-400 text-yellow-900 shadow-[0_0_8px_oklch(0.8_0.15_90_/_30%)]",
  "lean-no-hire": "bg-orange-400 text-white shadow-[0_0_8px_oklch(0.7_0.15_50_/_30%)]",
  "no-hire": "bg-red-500 text-white shadow-[0_0_8px_oklch(0.65_0.2_25_/_30%)]",
};

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire", hire: "Hire", "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire", "no-hire": "No Hire",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function DesignGalleryTab() {
  const [designs, setDesigns] = useState<GalleryDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadDesigns = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch("/api/designs/gallery")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: { designs: GalleryDesign[] }) => setDesigns(data.designs))
      .catch(() => setError("Failed to load designs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const filtered = query.trim()
    ? designs.filter((d) => d.topicName.toLowerCase().includes(query.trim().toLowerCase()))
    : designs;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Loading designs…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Search className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Failed to load designs</p>
        <button
          onClick={loadDesigns}
          className="text-xs text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Search className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No designs yet</p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">
          Be the first to submit a design review and appear in the gallery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by topic..."
            className="w-full rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm pl-10 pr-10 h-11 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)] transition-all placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Results count when filtering */}
      {query.trim() && (
        <p className="text-center text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "design" : "designs"} found
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No designs match your search</p>
          <button onClick={() => setQuery("")} className="text-xs text-violet-500 hover:underline">
            Clear search
          </button>
        </div>
      ) : (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2"
        key={query}
      >
        {filtered.map((d) => (
        <motion.div key={d._id} variants={item}>
          <Link
            href={`/library/${d.topicSlug}/${d._id}`}
            className="group block rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md shadow-black/[0.04] dark:shadow-none p-5 text-card-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {/* Topic title */}
            <h3 className="text-sm font-semibold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {d.topicName}
            </h3>

            {/* Author row */}
            <div className="flex items-center gap-2 mt-2">
              {d.avatarUrl ? (
                <img src={d.avatarUrl} alt={d.displayName} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[0.6rem] font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  {d.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                  {d.submissionType === "challenge" && (
                    <span className="shrink-0 rounded bg-orange-500/15 px-1 py-0.5 text-[0.55rem] font-bold text-orange-500">🔥</span>
                  )}
                  {d.displayName}
                  {d.isPremium && <span title="Premium member" className="text-amber-500 text-xs">👑</span>}
                  <span className="text-muted-foreground/50">·</span>
                  {formatDate(d.createdAt)}
                </p>
              </div>
            </div>

            {/* Badges row */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${LEVEL_COLORS[d.reviewLevel] ?? ""}`}>
                {d.reviewLevel.charAt(0).toUpperCase() + d.reviewLevel.slice(1)}
              </span>
              {d.signal && (
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${SIGNAL_STYLES[d.signal] ?? ""}`}>
                  {SIGNAL_LABELS[d.signal] ?? d.signal}
                </span>
              )}
              {d.reviewedBy === "drawlint" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[0.65rem] font-medium text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  DrawLint AI
                </span>
              ) : d.reviewedBy === "gemini" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
                  <Zap className="h-2.5 w-2.5" />
                  Gemini
                </span>
              ) : d.reviewedBy === "azure" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[0.65rem] font-medium text-blue-700 dark:text-blue-300">
                  <Key className="h-2.5 w-2.5" />
                  Azure
                </span>
              ) : null}
            </div>

            {/* View Design link */}
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
              View Design
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
