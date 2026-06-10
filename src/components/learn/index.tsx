"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Info,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react";

/* ── Layout wrappers ───────────────────────────────────────── */

/** Vertical rhythm wrapper for lesson body content. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-5 text-[15px] leading-7">{children}</div>;
}

/** A titled section. The heading is registered for the on-page TOC via data-toc. */
export function LessonSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-6">
      <h2
        data-toc={title}
        className="text-2xl font-bold font-heading mb-4 tracking-tight"
      >
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** A subsection heading (not in the TOC). */
export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-semibold font-heading mt-6 mb-1">{children}</h3>
  );
}

/** Body paragraph. */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground leading-7">{children}</p>;
}

/** Inline emphasis for a key term. */
export function Term({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold text-foreground">{children}</strong>
  );
}

/** Inline cross-reference link to another lesson (uses next/link). */
export function XLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-500">
      {children}
    </Link>
  );
}

/** Unordered list. */
export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 text-muted-foreground">{children}</ul>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500/70" />
      <span className="leading-7">{children}</span>
    </li>
  );
}

/* ── Callouts ──────────────────────────────────────────────── */

type CalloutType = "info" | "tip" | "warning" | "key";

const CALLOUT_STYLES: Record<
  CalloutType,
  { border: string; bg: string; text: string; icon: ReactNode; label: string }
> = {
  info: {
    border: "border-l-sky-500 border-sky-200 dark:border-sky-900/40",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    icon: <Info className="h-4 w-4" />,
    label: "Note",
  },
  tip: {
    border: "border-l-violet-500 border-violet-200 dark:border-violet-900/40",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    icon: <Lightbulb className="h-4 w-4" />,
    label: "Tip",
  },
  warning: {
    border: "border-l-amber-500 border-amber-200 dark:border-amber-900/40",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Watch out",
  },
  key: {
    border:
      "border-l-emerald-500 border-emerald-200 dark:border-emerald-900/40",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: <Sparkles className="h-4 w-4" />,
    label: "Key idea",
  },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const s = CALLOUT_STYLES[type];
  return (
    <div
      className={`rounded-xl border border-l-[3px] ${s.border} ${s.bg} p-4 shadow-sm`}
    >
      <div className={`flex items-center gap-2 font-semibold ${s.text}`}>
        {s.icon}
        <span>{title ?? s.label}</span>
      </div>
      <div className="mt-1.5 text-sm leading-7 text-foreground/80">
        {children}
      </div>
    </div>
  );
}

/** "Think of it like…" analogy box — beginner-friendly intuition. */
export function Analogy({
  title = "Think of it like…",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50 to-transparent dark:from-cyan-950/30 p-4">
      <div className="flex items-center gap-2 font-semibold text-cyan-700 dark:text-cyan-300">
        <span className="text-base">🔭</span>
        <span>{title}</span>
      </div>
      <div className="mt-1.5 text-sm leading-7 text-foreground/80">
        {children}
      </div>
    </div>
  );
}

/* ── Key takeaways ─────────────────────────────────────────── */

export function KeyTakeaways({ items }: { items: ReactNode[] }) {
  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 p-5">
      <div className="flex items-center gap-2 font-semibold font-heading text-violet-700 dark:text-violet-300 mb-3">
        <Check className="h-4 w-4" />
        Key takeaways
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-7">
            <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-foreground/80">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Check yourself (collapsible Q&A) ──────────────────────── */

export function CheckYourself({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="text-base">❓</span>
          {question}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="border-t border-border p-4 text-sm leading-7 text-muted-foreground">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Code / formula block ──────────────────────────────────── */

export function CodeBlock({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-zinc-950 dark:bg-zinc-900/70 overflow-hidden">
      {label && (
        <div className="border-b border-white/10 px-4 py-2 text-xs font-medium text-zinc-400">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-zinc-100">
        <code className="font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

/* ── Figure / diagram wrapper ──────────────────────────────── */

export function Figure({
  caption,
  children,
}: {
  caption?: string;
  children: ReactNode;
}) {
  return (
    <figure className="my-2">
      <div className="rounded-xl border border-border dark:border-white/[0.08] bg-zinc-950 dark:bg-zinc-900/60 p-4 overflow-x-auto">
        {children}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Comparison table ──────────────────────────────────────── */

export function CompareTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left font-semibold font-heading"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-border last:border-0 align-top"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 leading-6 ${
                    ci === 0
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Stat grid (for capacity numbers) ──────────────────────── */

export function StatGrid({
  stats,
}: {
  stats: { value: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 text-center"
        >
          <div className="text-xl font-bold font-heading text-violet-600 dark:text-violet-400 tabular-nums">
            {s.value}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
