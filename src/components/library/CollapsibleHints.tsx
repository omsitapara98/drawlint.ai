"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleHintsProps {
  hints: string[];
}

export function CollapsibleHints({ hints }: CollapsibleHintsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold hover:text-foreground transition-colors"
      >
        <span>💡 Hints</span>
        <span className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
          {open ? "Hide" : "Show"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <ul className="mt-2.5 space-y-2 text-sm text-foreground/80 dark:text-foreground/70">
          {hints.map((hint, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 text-violet-500 dark:text-violet-400">•</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
