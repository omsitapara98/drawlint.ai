"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Key, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

type ReviewLevel = "mid" | "senior" | "staff" | "deep";

const LEVELS: { value: ReviewLevel | "all"; label: string }[] = [
  { value: "all", label: "All Levels" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "deep", label: "Deep" },
];

const SIGNALS: { value: string; label: string }[] = [
  { value: "all", label: "All Signals" },
  { value: "strong-hire", label: "Strong Hire" },
  { value: "hire", label: "Hire" },
  { value: "lean-hire", label: "Lean Hire" },
  { value: "lean-no-hire", label: "Lean No Hire" },
  { value: "no-hire", label: "No Hire" },
];

const PROVIDERS: { value: string; label: string }[] = [
  { value: "all", label: "All AI" },
  { value: "drawlint", label: "DrawLint AI" },
  { value: "gemini", label: "Gemini" },
  { value: "azure", label: "Azure" },
];

type SortOption = "newest" | "oldest" | "signal-best" | "signal-worst";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "signal-best", label: "Best signal first" },
  { value: "signal-worst", label: "Worst signal first" },
];

const SIGNAL_ORDER: Record<string, number> = {
  "strong-hire": 5,
  "hire": 4,
  "lean-hire": 3,
  "lean-no-hire": 2,
  "no-hire": 1,
};

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

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-violet-500 text-white shadow-[0_0_12px_oklch(0.72_0.25_285_/_25%)]"
          : "bg-card dark:bg-card/60 border border-border dark:border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-violet-500/30"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterableDesignGrid({ designs }: { designs: EnrichedDesign[] }) {
  const [activeLevel, setActiveLevel] = useState<ReviewLevel | "all">("all");
  const [activeSignal, setActiveSignal] = useState("all");
  const [activeProvider, setActiveProvider] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortOpen, setSortOpen] = useState(false);

  const results = useMemo(() => {
    let filtered = designs;

    if (activeLevel !== "all") {
      filtered = filtered.filter((d) => d.reviewLevel === activeLevel);
    }
    if (activeSignal !== "all") {
      filtered = filtered.filter((d) => d.signal === activeSignal);
    }
    if (activeProvider !== "all") {
      filtered = filtered.filter((d) => d.reviewedBy === activeProvider);
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case "oldest":
        sorted.reverse();
        break;
      case "signal-best":
        sorted.sort((a, b) => (SIGNAL_ORDER[b.signal ?? ""] ?? 0) - (SIGNAL_ORDER[a.signal ?? ""] ?? 0));
        break;
      case "signal-worst":
        sorted.sort((a, b) => (SIGNAL_ORDER[a.signal ?? ""] ?? 0) - (SIGNAL_ORDER[b.signal ?? ""] ?? 0));
        break;
    }

    return sorted;
  }, [designs, activeLevel, activeSignal, activeProvider, sortBy]);

  const activeFilterCount = [
    activeLevel !== "all",
    activeSignal !== "all",
    activeProvider !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Level filter */}
        {LEVELS.map((level) => (
          <FilterPill
            key={level.value}
            label={level.label}
            active={activeLevel === level.value}
            onClick={() => setActiveLevel(level.value)}
          />
        ))}

        <span className="h-4 w-px bg-border shrink-0" />

        {/* Signal filter */}
        {SIGNALS.map((s) => (
          <FilterPill
            key={s.value}
            label={s.label}
            active={activeSignal === s.value}
            onClick={() => setActiveSignal(s.value)}
          />
        ))}

        <span className="h-4 w-px bg-border shrink-0" />

        {/* Provider filter */}
        {PROVIDERS.map((p) => (
          <FilterPill
            key={p.value}
            label={p.label}
            active={activeProvider === p.value}
            onClick={() => setActiveProvider(p.value)}
          />
        ))}
      </div>

      {/* Sort + results count row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {results.length} {results.length === 1 ? "design" : "designs"}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setActiveLevel("all"); setActiveSignal("all"); setActiveProvider("all"); }}
              className="ml-2 text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
            >
              Clear filters
            </button>
          )}
        </p>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {SORTS.find((s) => s.value === sortBy)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border dark:border-white/[0.08] bg-card dark:bg-card/90 shadow-lg py-1">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setSortBy(s.value); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    sortBy === s.value
                      ? "text-violet-600 dark:text-violet-400 font-medium bg-violet-50 dark:bg-violet-900/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {activeFilterCount > 0 ? "No designs match your filters" : "No designs submitted yet"}
          </p>
        </motion.div>
      ) : (
        <motion.div
          key={`${activeLevel}-${activeSignal}-${activeProvider}-${sortBy}`}
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          {results.map((design) => (
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
