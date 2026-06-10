"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft } from "lucide-react";
import { LESSONS, MODULES } from "@/app/learn/_content/registry";

type SearchEntry = {
  href: string;
  title: string;
  sub: string;
  haystack: string;
};

const MODULE_TITLE: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.id, m.title]),
);

// Static, build-time index of everything searchable in the workbook.
const INDEX: SearchEntry[] = [
  ...LESSONS.map((l) => {
    const sub = [MODULE_TITLE[l.module], l.group].filter(Boolean).join(" · ");
    return {
      href: `/learn/${l.slug}`,
      title: l.title,
      sub,
      haystack: `${l.title} ${l.summary} ${l.group ?? ""} ${
        MODULE_TITLE[l.module] ?? ""
      }`.toLowerCase(),
    };
  }),
  {
    href: "/learn/cheatsheet",
    title: "Cheatsheet",
    sub: "Quick reference",
    haystack: "cheatsheet quick reference patterns capacity numbers trade-offs",
  },
];

function rank(entry: SearchEntry, terms: string[]): number {
  let score = 0;
  const title = entry.title.toLowerCase();
  for (const t of terms) {
    if (!entry.haystack.includes(t)) return -1; // every term must match
    if (title.startsWith(t)) score += 5;
    else if (title.includes(t)) score += 3;
    else score += 1;
  }
  return score;
}

export function LessonSearch({
  shortcut = false,
  placeholder = "Search lessons…",
}: {
  shortcut?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    return INDEX.map((e) => ({ e, s: rank(e, terms) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((r) => r.e);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Optional "/" or ⌘K / Ctrl-K shortcut to focus the visible search box.
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const el = inputRef.current;
      // Don't steal focus if this instance is hidden (e.g. mobile vs desktop).
      if (!el || el.offsetParent === null) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      const isK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !typing;
      if (isK || isSlash) {
        e.preventDefault();
        el.focus();
        el.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      router.push(href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active] ?? results[0];
      if (r) go(r.href);
    }
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search the workbook"
          className="w-full rounded-lg border border-border bg-background/60 py-2 pl-9 pr-16 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-violet-500/50 focus:bg-background"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          shortcut && (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          )
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for{" "}
              <span className="font-medium text-foreground">“{query}”</span>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {results.map((r, i) => (
                <li key={r.href}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      i === active ? "bg-violet-500/10" : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          i === active
                            ? "text-violet-700 dark:text-violet-300"
                            : "text-foreground"
                        }`}
                      >
                        {r.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.sub}
                      </span>
                    </span>
                    {i === active && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
