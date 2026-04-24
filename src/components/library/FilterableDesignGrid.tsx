"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Key } from "lucide-react";
import { motion } from "framer-motion";

type ReviewLevel = "mid" | "senior" | "staff" | "deep";

const LEVELS: { value: ReviewLevel | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "deep", label: "Deep" },
];

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
  "strong-hire": "Strong Hire",
  hire: "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

interface EnrichedDesign {
  designId: string;
  displayName: string;
  avatarUrl: string | null;
  reviewLevel: string;
  signal: string | null;
  status: string;
  date: string;
  reviewedBy: string | null;
}

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

export function FilterableDesignGrid({ designs }: { designs: EnrichedDesign[] }) {
  const [activeLevel, setActiveLevel] = useState<ReviewLevel | "all">("all");

  const filtered = activeLevel === "all"
    ? designs
    : designs.filter((d) => d.reviewLevel === activeLevel);

  return (
    <div className="space-y-6">
      {/* Filter pills */}
      <div className="flex items-center justify-center gap-2">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setActiveLevel(level.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeLevel === level.value
                ? "bg-violet-500 text-white shadow-[0_0_12px_oklch(0.72_0.25_285_/_25%)]"
                : "bg-card dark:bg-card/60 border border-border dark:border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-violet-500/30"
            }`}
          >
            {level.label}
            {level.value !== "all" && (
              <span className="ml-1.5 text-[0.6rem] opacity-60">
                {designs.filter((d) => level.value === "all" || d.reviewLevel === level.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-12 text-center"
        >
          <p className="text-sm text-muted-foreground">No designs at this level yet</p>
        </motion.div>
      ) : (
        <motion.div
          key={activeLevel}
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          {filtered.map((design) => (
            <motion.div key={design.designId} variants={item}>
              <Link
                href={`/canvas?view=${design.designId}`}
                className="group block rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md shadow-black/[0.04] dark:shadow-none p-5 text-card-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  {design.avatarUrl ? (
                    <img src={design.avatarUrl} alt={design.displayName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-300 shadow-[0_0_8px_oklch(0.72_0.25_285_/_25%)]">
                      {design.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{design.displayName}</p>
                    <p className="text-xs text-muted-foreground">{design.date}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${LEVEL_COLORS[design.reviewLevel] ?? ""}`}>
                    {design.reviewLevel.charAt(0).toUpperCase() + design.reviewLevel.slice(1)}
                  </span>
                  {design.signal && (
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${SIGNAL_STYLES[design.signal] ?? ""}`}>
                      {SIGNAL_LABELS[design.signal] ?? design.signal}
                    </span>
                  )}
                  {design.reviewedBy === "drawlint" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[0.65rem] font-medium text-violet-700 dark:text-violet-300">
                      <Sparkles className="h-2.5 w-2.5" />
                      DrawLint AI
                    </span>
                  ) : design.reviewedBy === "gemini" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
                      <Zap className="h-2.5 w-2.5" />
                      Gemini
                    </span>
                  ) : design.reviewedBy === "azure" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[0.65rem] font-medium text-blue-700 dark:text-blue-300">
                      <Key className="h-2.5 w-2.5" />
                      Azure
                    </span>
                  ) : null}
                  {design.status !== "reviewed" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">{design.status}</span>
                  )}
                </div>
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
