import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

const steps = [
  {
    icon: "🎨",
    title: "Draw",
    description:
      "Use the Excalidraw whiteboard with our system design template",
  },
  {
    icon: "🔍",
    title: "Analyze",
    description:
      "5 AI reviewers check your NFRs, entities, capacity, API, and HLD",
  },
  {
    icon: "✅",
    title: "Improve",
    description: "Get highlights for what you did well and issues to fix",
  },
];

const features = [
  {
    icon: "📋",
    title: "Level-Based Review",
    description: "Mid, Senior, Staff, and Deep analysis modes",
  },
  {
    icon: "🔌",
    title: "Multi-Call Architecture",
    description:
      "Each reviewer gets isolated context for accurate feedback",
  },
  {
    icon: "🔐",
    title: "BYO Key",
    description:
      "Your API key stays in your browser, never stored on our servers",
  },
  {
    icon: "⭐",
    title: "Highlights + Issues",
    description: "Celebrate good design choices, not just problems",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
            D
          </div>
          <span className="text-sm font-semibold tracking-tight">
            DrawLint<span className="text-violet-500">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/library"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Library
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Guide
          </Link>
          <Link
            href="/canvas"
            className="inline-flex items-center rounded-lg px-2.5 h-7 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Start Drawing →
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          DrawLint<span className="text-violet-500">.ai</span>
        </h1>
        <p className="max-w-md text-lg font-medium text-foreground/80">
          Practice system design. Get AI feedback.
        </p>
        <p className="max-w-xl text-sm text-muted-foreground">
          Draw your architecture on a whiteboard. Get instant review from 5 AI
          reviewers calibrated for Mid, Senior, Staff, and Deep analysis levels.
        </p>

        <Link
          href="/canvas"
          className="mt-2 inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-8 h-11 text-base font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
        >
          Start Drawing
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>

        <Link
          href="/library"
          className="inline-flex items-center rounded-full border border-violet-300 px-6 h-10 text-sm font-medium text-violet-600 transition-all hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/30"
        >
          Browse the Library
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Link>

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          BYO Azure OpenAI key required
        </span>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="border-t px-4 py-20">
        <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight">
          How It Works
        </h2>
        <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="flex flex-col items-center gap-3 text-center">
              <span className="text-3xl">{step.icon}</span>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="border-t px-4 py-20">
        <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight">
          Features
        </h2>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 text-card-foreground"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t px-4 py-8 text-center text-xs text-muted-foreground">
        <p>Built for system design interview practice</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Link
            href="/guide"
            className="hover:text-foreground"
          >
            Drawing Guide
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <a
            href="https://github.com/omsitapara98/drawlint.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
