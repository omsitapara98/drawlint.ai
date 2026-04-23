"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Loader2 } from "lucide-react";

interface TopicOption {
  _id: string;
  name: string;
  slug: string;
  submissionCount: number;
}

interface TopicSelectorProps {
  onChange: (topic: TopicOption | null) => void;
}

export default function TopicSelector({ onChange }: TopicSelectorProps) {
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TopicOption | null>(null);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/topics?sort=popular");
        if (!res.ok) return;
        const data = (await res.json()) as { topics: TopicOption[] };
        setTopics(data.topics);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = topics.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const exactMatch = topics.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase(),
  );

  const handleSelect = useCallback(
    (topic: TopicOption) => {
      setSelected(topic);
      setSearch("");
      setOpen(false);
      onChange(topic);
    },
    [onChange],
  );

  const handleCreate = useCallback(async () => {
    const name = search.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        if (res.status === 409) {
          // Topic already exists — find it
          const existing = topics.find(
            (t) => t.name.toLowerCase() === name.toLowerCase(),
          );
          if (existing) handleSelect(existing);
        } else {
          console.error("Failed to create topic:", err.error);
        }
        return;
      }
      const data = (await res.json()) as { topic: TopicOption };
      setTopics((prev) => [data.topic, ...prev]);
      handleSelect(data.topic);
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }, [search, topics, handleSelect]);

  const handleClear = useCallback(() => {
    setSelected(null);
    setSearch("");
    onChange(null);
  }, [onChange]);

  return (
    <div className="flex h-10 items-center border-b bg-background/80 backdrop-blur-sm px-4 gap-3">
      <span className="text-xs font-medium text-muted-foreground shrink-0">Topic:</span>

      <div ref={containerRef} className="relative max-w-xs flex-1">
        {selected ? (
          <button
            onClick={handleClear}
            className="flex h-7 items-center gap-1.5 rounded-md border bg-violet-50 px-2.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-900"
          >
            {selected.name}
            <span className="text-[0.6rem] text-violet-500">✕</span>
          </button>
        ) : (
          <>
            <div
              className="flex h-7 items-center rounded-md border bg-background px-2.5 cursor-pointer"
              onClick={() => {
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              {open ? (
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setOpen(true)}
                  placeholder="Search or create topic..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Select a system design topic...
                </span>
              )}
              <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground shrink-0" />
            </div>

            {open && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[240px] rounded-lg border bg-popover shadow-lg">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filtered.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => handleSelect(t)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-[0.65rem] text-muted-foreground">
                          {t.submissionCount}
                        </span>
                      </button>
                    ))}
                    {filtered.length === 0 && search.trim() && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No matching topics
                      </p>
                    )}
                    {search.trim() && !exactMatch && (
                      <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-xs font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-50"
                      >
                        {creating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Create &quot;{search.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
