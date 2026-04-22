"use client";

import { Button } from "@/components/ui/button";

export default function LandingHero() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6 text-center">
      <h1 className="bg-gradient-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
        DrawLint.ai
      </h1>

      <p className="mt-4 max-w-lg text-lg font-medium text-zinc-300">
        LeetCode for System Design, but Visual and AI-Driven
      </p>

      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Draw your system architecture. Get instant AI feedback on scalability,
        bottlenecks, and improvements.
      </p>

      <a href="/">
        <Button size="lg" className="mt-8">
          Start Drawing →
        </Button>
      </a>

      <div className="mt-12 flex gap-8 text-sm text-zinc-400">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">✏️</span>
          <span>Draw</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🤖</span>
          <span>Analyze</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">📊</span>
          <span>Improve</span>
        </div>
      </div>
    </section>
  );
}
