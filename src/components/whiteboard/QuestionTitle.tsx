"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "drawlint:question-title";

export default function QuestionTitle() {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setValue(saved);
  }, []);

  const persist = useCallback((text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, text);
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setValue(text);
    persist(text);
  };

  return (
    <div className="w-full border-b bg-background px-4 py-3">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Enter your system design question... (e.g., Design a URL Shortener)"
        className="w-full bg-transparent text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none md:text-xl"
      />
    </div>
  );
}
