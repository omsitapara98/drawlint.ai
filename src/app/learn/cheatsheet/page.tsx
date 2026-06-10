"use client";

import { useState, useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Search, ChevronDown, X } from "lucide-react";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";
import { CATEGORIES, ALL_DESIGNS, type Pattern, type Category } from "./cheatsheet-data";

const TOTAL_PATTERNS = CATEGORIES.reduce((sum, cat) => sum + cat.patterns.length, 0);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

function DesignChip({ 
  design, 
  selected, 
  onClick 
}: { 
  design: string; 
  selected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        selected
          ? "bg-violet-500 text-white shadow-md"
          : "bg-muted hover:bg-violet-100 dark:hover:bg-violet-900/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      {design}
    </button>
  );
}

function summaryOf(pattern: Pattern): string {
  if (pattern.summary) return pattern.summary;
  const match = pattern.whatItIs.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : pattern.whatItIs).trim();
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-semibold text-violet-600 dark:text-violet-400">{label}: </span>
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

function PatternCard({ pattern, autoExpand }: { pattern: Pattern; autoExpand: boolean }) {
  const [open, setOpen] = useState(false);
  const expanded = open || autoExpand;

  return (
    <motion.div
      variants={item}
      className="self-start rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-5 text-left"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold font-heading leading-snug">{pattern.name}</h3>
          {!expanded && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{summaryOf(pattern)}</p>
          )}
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="space-y-3 border-t border-border px-5 pb-5 pt-4 text-sm">
          <Detail label="What it is">{pattern.whatItIs}</Detail>
          <Detail label="When to use">{pattern.whenToUse}</Detail>

          {pattern.usedIn.length > 0 && (
            <div>
              <span className="mb-1.5 block font-semibold text-violet-600 dark:text-violet-400">
                Used in:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {pattern.usedIn.map((design) => (
                  <span
                    key={design}
                    className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/40 dark:text-violet-300"
                  >
                    {design}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Detail label="Tradeoffs">{pattern.tradeoffs}</Detail>

          <div className="rounded-lg bg-muted/50 p-3">
            <span className="font-semibold text-violet-600 dark:text-violet-400">Deep dive: </span>
            <span className="text-muted-foreground">{pattern.deepDive}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CategorySection({
  category,
  patterns,
  autoExpand,
}: {
  category: Category;
  patterns: Pattern[];
  autoExpand: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (patterns.length === 0) return null;

  return (
    <section id={category.slug} ref={ref} className="scroll-mt-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/15 text-xl">
            {category.emoji}
          </div>
          <h2 className="text-2xl font-bold font-heading">
            {category.title}
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              {patterns.length} pattern{patterns.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>
      </motion.div>
      
      <motion.div
        variants={container}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {patterns.map((pattern) => (
          <PatternCard key={pattern.slug} pattern={pattern} autoExpand={autoExpand} />
        ))}
      </motion.div>
    </section>
  );
}

export default function CheatsheetPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const hasSearch = searchQuery.trim().length > 0;

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const hasSearch = query.length > 0;
    const hasDesignFilter = selectedDesigns.size > 0;

    if (!hasSearch && !hasDesignFilter) {
      return CATEGORIES;
    }

    return CATEGORIES.map((cat) => ({
      ...cat,
      patterns: cat.patterns.filter((pattern) => {
        const matchesSearch = !hasSearch || 
          pattern.name.toLowerCase().includes(query) ||
          pattern.whatItIs.toLowerCase().includes(query) ||
          pattern.deepDive.toLowerCase().includes(query) ||
          pattern.usedIn.some((d) => d.toLowerCase().includes(query));

        const matchesDesign = !hasDesignFilter ||
          pattern.usedIn.some((d) => selectedDesigns.has(d));

        return matchesSearch && matchesDesign;
      }),
    })).filter((cat) => cat.patterns.length > 0);
  }, [searchQuery, selectedDesigns]);

  const totalPatterns = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.patterns.length, 0),
    [filteredCategories]
  );

  const toggleDesign = (design: string) => {
    setSelectedDesigns((prev) => {
      const next = new Set(prev);
      if (next.has(design)) {
        next.delete(design);
      } else {
        next.add(design);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDesigns(new Set());
  };

  const scrollToCategory = (slug: string) => {
    const el = document.getElementById(slug);
    if (el) {
      const offset = 100;
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
      <ParticleBackground />
      <div className="relative min-h-screen">
        <Header />
        
        <main className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold font-heading mb-4">
              System Design{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Cheatsheet
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-3">
              Curated production patterns for system design interviews
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-violet-600 dark:text-violet-400">{TOTAL_PATTERNS} patterns</span>
              {" · "}
              <span className="font-semibold text-violet-600 dark:text-violet-400">{CATEGORIES.length} categories</span>
              {" · "}
              Interview-ready reference
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Tap any card to reveal the full details.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patterns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </motion.div>

          {/* Category Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-8 sticky top-14 z-40 bg-background/80 backdrop-blur-xl border-b border-border py-4"
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {CATEGORIES.map((cat) => {
                const count = filteredCategories.find((c) => c.slug === cat.slug)?.patterns.length ?? 0;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => scrollToCategory(cat.slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      count > 0
                        ? "bg-muted hover:bg-violet-100 dark:hover:bg-violet-900/30 text-foreground"
                        : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                    }`}
                    disabled={count === 0}
                  >
                    {cat.emoji} {cat.title} ({count})
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Design Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Filter by design:</h3>
              {(selectedDesigns.size > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_DESIGNS.map((design) => (
                <DesignChip
                  key={design}
                  design={design}
                  selected={selectedDesigns.has(design)}
                  onClick={() => toggleDesign(design)}
                />
              ))}
            </div>
          </motion.div>

          {/* Results */}
          {totalPatterns === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-lg text-muted-foreground mb-2">No patterns found</p>
              <button
                onClick={clearFilters}
                className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                Clear filters
              </button>
            </motion.div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {totalPatterns} pattern{totalPatterns !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setExpandAll((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  aria-pressed={expandAll}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandAll ? "rotate-180" : ""}`}
                  />
                  {expandAll ? "Collapse all" : "Expand all"}
                </button>
              </div>
              <div className="space-y-16">
                {filteredCategories.map((cat) => (
                  <CategorySection
                    key={cat.slug}
                    category={cat}
                    patterns={cat.patterns}
                    autoExpand={hasSearch || expandAll}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
