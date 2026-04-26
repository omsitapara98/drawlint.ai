import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — DrawLint.ai",
  description: "DrawLint.ai is an open-source, AI-powered system design review platform built for engineers practicing for interviews.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">About DrawLint.ai</h1>
          <p className="mt-2 text-sm italic text-muted-foreground/70">For developers, by developers.</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">🎯 Mission</h2>
            <p className="text-base leading-relaxed">
              Make system design practice <strong className="text-foreground">accessible, structured, and feedback-driven</strong>.
            </p>
            <p className="mt-3">
              System design interviews are one of the hardest parts of the engineering hiring process.
              Most candidates practice by drawing on whiteboards with no feedback. DrawLint.ai changes that —
              draw your architecture, get instant AI review from 6 specialized reviewers, defend your choices,
              and improve iteratively.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">⚙️ How It Works</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">1. Draw your system design</p>
                <p className="text-xs mt-1">Use the built-in Excalidraw canvas — add components, databases, queues, APIs, and connect them.</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">2. Submit for AI review</p>
                <p className="text-xs mt-1">6 AI reviewers (NFR, Entities, Capacity, API, HLD) analyze your design in parallel, then a Lead Reviewer synthesizes the final verdict.</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">3. Respond and improve</p>
                <p className="text-xs mt-1">Defend your design choices verbally — the AI re-evaluates based on your responses, just like a real interview debrief.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">🛠️ Tech Stack</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border p-2.5">
                <p className="font-medium text-foreground">Frontend</p>
                <p>Next.js, React, Tailwind CSS, Framer Motion</p>
              </div>
              <div className="rounded-lg border border-border p-2.5">
                <p className="font-medium text-foreground">Canvas</p>
                <p>Excalidraw (whiteboard engine)</p>
              </div>
              <div className="rounded-lg border border-border p-2.5">
                <p className="font-medium text-foreground">AI</p>
                <p>Azure OpenAI, Google Gemini, custom provider abstraction</p>
              </div>
              <div className="rounded-lg border border-border p-2.5">
                <p className="font-medium text-foreground">Backend</p>
                <p>Next.js API Routes, MongoDB (Cosmos DB), NextAuth.js</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">📖 Open Source</h2>
            <p>
              DrawLint.ai is open source under the{" "}
              <strong className="text-foreground">MIT License</strong>.
              You can view the source code, report issues, and contribute on GitHub.
            </p>
            <a
              href="https://github.com/omsitapara98/drawlint.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">📬 Contact</h2>
            <p>
              Questions, feedback, or feature requests? Reach out at{" "}
              <a href="mailto:drawlint.ai.support@gmail.com" className="text-violet-400 hover:underline">
                drawlint.ai.support@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
