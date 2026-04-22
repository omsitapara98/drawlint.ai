"use client";

import { Button } from "@/components/ui/button";

interface HeaderProps {
  onOpenSettings: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg" role="img" aria-label="magnifying glass">
          🔍
        </span>
        <span className="text-sm font-semibold tracking-tight text-white">
          DrawLint.ai
        </span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://github.com/omsitapara98/drawlint.ai#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 transition-colors hover:text-white"
        >
          How it works
        </a>
        <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800" onClick={onOpenSettings}>
          Settings
        </Button>
      </div>
    </header>
  );
}
