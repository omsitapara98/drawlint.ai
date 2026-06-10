"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  List,
  X,
  BookOpen,
  Check,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import {
  MODULES,
  LESSONS,
  lessonGroups,
  type LessonMeta,
  type ModuleMeta,
} from "@/app/learn/_content/registry";
import { MarkComplete, LessonStatusIcon, ProgressMeter } from "./progress";
import { LessonSearch } from "./LessonSearch";

type TocItem = { id: string; title: string };

function Sidebar({ currentSlug }: { currentSlug: string }) {
  // Which module the open lesson lives in — keep it expanded by default.
  const activeModuleId = useMemo(() => {
    for (const mod of MODULES) {
      const groups = lessonGroups(mod.id);
      if (groups.some((g) => g.lessons.some((l) => l.slug === currentSlug))) {
        return mod.id;
      }
    }
    return MODULES[0]?.id;
  }, [currentSlug]);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // A module is open if the user explicitly toggled it, otherwise it defaults
  // to open only for the module containing the current lesson.
  const isOpenFor = (id: string) => overrides[id] ?? id === activeModuleId;
  const toggleModule = (id: string) =>
    setOverrides((o) => ({ ...o, [id]: !(o[id] ?? id === activeModuleId) }));

  // Sub-section (group) collapse state — defaults to open so nothing is hidden
  // unexpectedly, but every labelled section can be collapsed individually.
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const isGroupOpen = (key: string) => groupOverrides[key] ?? true;
  const toggleGroup = (key: string) =>
    setGroupOverrides((o) => ({ ...o, [key]: !(o[key] ?? true) }));

  // Callback ref: when the active link mounts (e.g. after its module expands),
  // center it within the scrollable sidebar so it's never hidden off-screen.
  const scrollActiveIntoView = useCallback((el: HTMLAnchorElement | null) => {
    if (!el) return;
    const container = el.closest<HTMLElement>("[data-sidebar-scroll]");
    if (!container) {
      el.scrollIntoView({ block: "nearest" });
      return;
    }
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const offset =
      eRect.top - cRect.top - container.clientHeight / 2 + eRect.height / 2;
    container.scrollTop += offset;
  }, []);

  return (
    <nav className="space-y-1.5">
      <div className="mb-3">
        <LessonSearch shortcut placeholder="Search lessons…" />
      </div>

      <Link
        href="/learn"
        className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="h-4 w-4" />
        Workbook home
      </Link>

      <div className="mb-4">
        <ProgressMeter total={LESSONS.length} />
      </div>

      {MODULES.map((mod: ModuleMeta) => {
        const groups = lessonGroups(mod.id);
        const isComingSoon = mod.status === "coming-soon";
        const isOpen = isOpenFor(mod.id);
        return (
          <div key={mod.id} className="border-b border-border/60 pb-1.5">
            <button
              type="button"
              onClick={() => toggleModule(mod.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <span className="text-sm">{mod.emoji}</span>
              <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mod.title}
              </span>
              {isComingSoon && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {mod.href ? "→" : "soon"}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 ${
                  isOpen ? "" : "-rotate-90"
                }`}
              />
            </button>

            {isOpen &&
              (isComingSoon ? (
                <div className="pb-1.5">
                  {mod.href ? (
                    <Link
                      href={mod.href}
                      className="block pl-4 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Open the cheatsheet →
                    </Link>
                  ) : (
                    <p className="pl-4 text-xs text-muted-foreground/60">
                      Coming soon
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pb-1.5">
                  {groups.map((grp, gi) => {
                    const groupKey = `${mod.id}:${grp.group ?? gi}`;
                    const groupOpen = grp.group ? isGroupOpen(groupKey) : true;
                    return (
                      <div key={grp.group ?? gi}>
                        {grp.group && (
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKey)}
                            aria-expanded={groupOpen}
                            className="mb-1 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/50"
                          >
                            <ChevronDown
                              className={`h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${
                                groupOpen ? "" : "-rotate-90"
                              }`}
                            />
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                              {grp.group}
                            </span>
                          </button>
                        )}
                        {groupOpen && (
                          <ul className="space-y-0.5 border-l border-border pl-3">
                            {grp.lessons.map((l) => {
                              const active = l.slug === currentSlug;
                              return (
                                <li key={l.slug}>
                                  <Link
                                    ref={active ? scrollActiveIntoView : undefined}
                                    href={`/learn/${l.slug}`}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                                      active
                                        ? "bg-violet-500/10 font-medium text-violet-700 dark:text-violet-300"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                  >
                                    <LessonStatusIcon slug={l.slug} />
                                    <span className="min-w-0">{l.title}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        );
      })}
    </nav>
  );
}

/** Circular page-scroll progress indicator for the right rail. */
function ScrollRing() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? (el.scrollTop / max) * 100 : 0;
      setPct(Math.min(100, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const rounded = Math.round(pct);
  const atEnd = rounded >= 100;

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3.5">
      <div className="relative h-14 w-14 shrink-0">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 64 64" aria-hidden>
          <defs>
            <linearGradient id="scroll-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.21 285)" />
              <stop offset="100%" stopColor="oklch(0.78 0.13 215)" />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            strokeWidth="5"
            className="stroke-muted-foreground/15"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            stroke="url(#scroll-ring-grad)"
            className="transition-[stroke-dashoffset] duration-150 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {atEnd ? (
            <Check className="h-5 w-5 text-emerald-500" strokeWidth={3} />
          ) : (
            <span className="text-[13px] font-bold tabular-nums">{rounded}</span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reading progress
        </div>
        <div className="text-[13px] font-medium text-foreground/80">
          {atEnd ? "You reached the end" : `${rounded}% scrolled`}
        </div>
      </div>
    </div>
  );
}

function OnThisPage({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <List className="h-3.5 w-3.5" />
        On this page
      </div>
      <ul className="space-y-1.5 border-l border-border">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`-ml-px block border-l-2 pl-3 text-sm transition-colors ${
                activeId === it.id
                  ? "border-violet-500 font-medium text-violet-700 dark:text-violet-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {it.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LessonLayout({
  meta,
  module: mod,
  prev,
  next,
  children,
}: {
  meta: LessonMeta;
  module: ModuleMeta;
  prev: LessonMeta | null;
  next: LessonMeta | null;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Build the TOC from rendered section headings.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // The id + scroll-margin live on the <section>; the heading carries data-toc.
    const sections = Array.from(
      el.querySelectorAll<HTMLElement>("section[id]"),
    ).filter((s) => s.querySelector("h2[data-toc]"));
    setToc(
      sections.map((s) => ({
        id: s.id,
        title:
          s.querySelector<HTMLElement>("h2[data-toc]")?.dataset.toc ?? "",
      })),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [meta.slug]);

  return (
    <>
      <ScrollProgress />
      <ParticleBackground />
      <div className="relative min-h-screen">
        <Header />

        {/* Mobile lesson-nav toggle */}
        <div className="lg:hidden sticky top-14 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <button
            onClick={() => setMobileNavOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
            {mobileNavOpen ? "Close" : "Lessons & contents"}
          </button>
          {mobileNavOpen && (
            <div
              data-sidebar-scroll
              className="max-h-[70vh] overflow-y-auto border-t border-border p-4 space-y-6"
            >
              <Sidebar currentSlug={meta.slug} />
              <OnThisPage items={toc} activeId={activeId} />
            </div>
          )}
        </div>

        {/* Left sidebar — fixed and glued to the viewport's left edge */}
        <aside className="hidden lg:block fixed left-0 top-14 bottom-0 z-20 w-72 border-r border-border bg-background/80 backdrop-blur-sm">
          <div
            data-sidebar-scroll
            className="h-full overflow-y-auto px-5 py-8"
          >
            <Sidebar currentSlug={meta.slug} />
          </div>
        </aside>

        {/* Content + right rail (offset by the fixed sidebar on lg) */}
        <div className="lg:pl-72">
          <div className="mx-auto max-w-[1180px] px-4 py-10 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
              {/* Main content */}
              <article className="min-w-0">
                <motion.header
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-8"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400 mb-2">
                    <span>{mod.emoji}</span>
                    <span className="uppercase tracking-wide">{mod.title}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {meta.estReadMin} min read
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight">
                    {meta.title}
                  </h1>
                  <p className="mt-3 text-lg text-muted-foreground leading-7">
                    {meta.summary}
                  </p>
                  <div className="mt-6 h-px bg-gradient-to-r from-violet-500/40 via-border to-transparent" />
                </motion.header>

                <div ref={contentRef}>{children}</div>

                <MarkComplete slug={meta.slug} />

                {/* Prev / next */}
                <nav className="mt-14 grid gap-4 sm:grid-cols-2">
                  {prev ? (
                    <Link
                      href={`/learn/${prev.slug}`}
                      className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-violet-500/40"
                    >
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowLeft className="h-3 w-3" /> Previous
                      </span>
                      <span className="mt-1 block font-medium font-heading group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {prev.title}
                      </span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Link
                      href={`/learn/${next.slug}`}
                      className="group rounded-xl border border-border bg-card p-4 text-right transition-colors hover:border-violet-500/40"
                    >
                      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        Next <ArrowRight className="h-3 w-3" />
                      </span>
                      <span className="mt-1 block font-medium font-heading group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {next.title}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="/learn/cheatsheet"
                      className="group rounded-xl border border-border bg-card p-4 text-right transition-colors hover:border-violet-500/40"
                    >
                      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        Up next <ArrowRight className="h-3 w-3" />
                      </span>
                      <span className="mt-1 block font-medium font-heading group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        Explore the Cheatsheet
                      </span>
                    </Link>
                  )}
                </nav>
              </article>

              {/* Right rail */}
              <aside className="hidden lg:block">
                <div className="sticky top-20 space-y-6">
                  <ScrollRing />
                  <OnThisPage items={toc} activeId={activeId} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
