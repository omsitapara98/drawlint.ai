export default function LandingHero() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/20">
      <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium">
        ✨ AI-Powered System Design Review
      </div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Draw. Analyze.{" "}
        <span className="bg-gradient-to-r from-violet-500 to-indigo-600 bg-clip-text text-transparent">
          Improve.
        </span>
      </h1>
      <p className="max-w-lg text-base text-muted-foreground">
        DrawLint.ai reviews your system architecture diagrams like a senior engineer —
        finding bottlenecks, SPOFs, and scalability issues instantly.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
      >
        Start Drawing →
      </a>
      <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
        <span>✏️ Draw</span>
        <span className="text-border">→</span>
        <span>🤖 Analyze</span>
        <span className="text-border">→</span>
        <span>📊 Improve</span>
      </div>
    </section>
  );
}
