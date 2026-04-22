"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface WhiteboardSectionProps {
  id: string;
  title: string;
  placeholder?: string;
  className?: string;
  minRows?: number;
}

function storageKey(id: string) {
  return `drawlint:section:${id}`;
}

export default function WhiteboardSection({
  id,
  title,
  placeholder,
  className = "",
  minRows = 4,
}: WhiteboardSectionProps) {
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
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

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

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-card shadow-sm ${className}`}
    >
      <div className="border-b bg-muted/40 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={minRows}
        className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
      />
    </div>
  );
}
