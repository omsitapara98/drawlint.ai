"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SplitSectionProps {
  topId: string;
  topTitle: string;
  bottomId: string;
  bottomTitle: string;
  splitRatio?: string; // e.g., "70/30" or "50/50"
  topPlaceholder?: string;
  bottomPlaceholder?: string;
}

function storageKey(id: string) {
  return `drawlint:section:${id}`;
}

function usePersistedTextarea(id: string, minRows: number) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(id));
    if (saved) setValue(saved);
  }, [id]);

  const autoGrow = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 24; // ~text-sm leading-relaxed
    const minHeight = minRows * lineHeight;
    ta.style.height = `${Math.max(ta.scrollHeight, minHeight)}px`;
  }, [minRows]);

  useEffect(() => {
    autoGrow();
  }, [value, autoGrow]);

  const persist = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.setItem(storageKey(id), text);
      }, 1000);
    },
    [id],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    persist(text);
  };

  return { value, handleChange, textareaRef };
}

export default function SplitSection({
  topId,
  topTitle,
  bottomId,
  bottomTitle,
  splitRatio = "50/50",
  topPlaceholder,
  bottomPlaceholder,
}: SplitSectionProps) {
  const [topRatio] = splitRatio.split("/").map(Number);
  const topMinRows = topRatio >= 60 ? 5 : 3;
  const bottomMinRows = topRatio >= 60 ? 3 : 3;

  const top = usePersistedTextarea(topId, topMinRows);
  const bottom = usePersistedTextarea(bottomId, bottomMinRows);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Top section */}
      <div className="border-b bg-muted/40 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {topTitle}
        </span>
      </div>
      <textarea
        ref={top.textareaRef}
        value={top.value}
        onChange={top.handleChange}
        placeholder={topPlaceholder}
        rows={topMinRows}
        className="w-full resize-none border-b bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
      />

      {/* Bottom section */}
      <div className="border-b bg-muted/40 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {bottomTitle}
        </span>
      </div>
      <textarea
        ref={bottom.textareaRef}
        value={bottom.value}
        onChange={bottom.handleChange}
        placeholder={bottomPlaceholder}
        rows={bottomMinRows}
        className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
      />
    </div>
  );
}
