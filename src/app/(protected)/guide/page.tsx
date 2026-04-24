"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";

/* ── Animation variants ───────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/* ── Reusable sub-components ──────────────────────────────── */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-4 shadow-sm dark:shadow-none border-l-[3px] border-l-violet-500">
      <span className="font-medium text-foreground">💡 Tip:</span>{" "}
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

function SectionHeading({
  emoji,
  title,
}: {
  emoji: string;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/15 text-lg">
          {emoji}
        </div>
        <h2 className="text-2xl font-bold font-heading">{title}</h2>
      </div>
    </motion.div>
  );
}

function Divider() {
  return (
    <div className="my-12 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
  );
}

const KEYWORDS = [
  "service",
  "database",
  "db",
  "sql",
  "cache",
  "redis",
  "queue",
  "kafka",
  "rabbitmq",
  "gateway",
  "load balancer",
  "lb",
  "worker",
  "cdn",
  "dns",
  "pub-sub",
  "storage",
  "s3",
  "blob",
];

const CHECKLIST = [
  "Every box has a descriptive label",
  "Arrows connect from one box to another (not floating)",
  "Key connections are labeled with what flows through them",
  "At least FR and Assumptions are filled in",
  "Design decisions are written as text near the relevant component",
];

/* ── Page ─────────────────────────────────────────────────── */
export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-24 pb-8">
        <ParticleBackground className="absolute inset-0" particleCount={30} />

        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-violet-500/15 dark:bg-violet-500/20 rounded-full blur-[120px]" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <motion.h1
            variants={item}
            className="font-heading text-4xl sm:text-5xl font-bold tracking-tight"
          >
            Drawing Guide
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Everything you need to get the most out of AI-powered design reviews
          </motion.p>
        </motion.div>
      </section>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 space-y-0">
        {/* Section 1 — Template Layout */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📝" title="The Whiteboard Template" />
            <p className="text-base leading-7 text-muted-foreground">
              The whiteboard has two areas: a{" "}
              <strong className="text-foreground">left column</strong> for text
              sections and a{" "}
              <strong className="text-foreground">right area</strong> for your
              HLD diagram.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              The left column sections (top to bottom):
            </p>
            <ul className="list-disc space-y-2 pl-5 text-base text-muted-foreground">
              <li>Functional Requirements</li>
              <li>Assumptions</li>
              <li>Non-Functional Requirements</li>
              <li>Core Entities</li>
              <li>Capacity Calculations</li>
              <li>API Routes</li>
            </ul>
            <p className="text-base leading-7 text-muted-foreground">
              The HLD area is where you draw your architecture — boxes, arrows,
              and annotations.
            </p>
            <Tip>
              Don&apos;t move the section headers — the parser uses their
              positions to identify content.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 2 — System Components */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🏗️" title="System Components" />
            <p className="text-base leading-7 text-muted-foreground">
              Use <strong className="text-foreground">rectangles</strong> for
              services, databases, caches, queues — anything in your
              architecture.{" "}
              <strong className="text-foreground">Label every box</strong> — the
              parser reads the text inside to identify component types.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              Keywords that are auto-detected:
            </p>
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map((kw) => (
                <code
                  key={kw}
                  className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2 py-1 text-xs font-mono text-violet-700 dark:text-violet-300 font-medium"
                >
                  {kw}
                </code>
              ))}
            </div>
            <Tip>
              A box labeled &quot;Redis Cache&quot; is automatically classified
              as a cache. A box labeled &quot;My Thing&quot; becomes
              &quot;unknown&quot;.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 3 — Data Flow & Connections */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="➡️" title="Data Flow & Connections" />
            <p className="text-base leading-7 text-muted-foreground">
              Use <strong className="text-foreground">arrows</strong> to connect
              components — draw from one box to another.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              <strong className="text-foreground">Label your arrows</strong>{" "}
              with what flows through them (e.g., &quot;REST API&quot;,
              &quot;WebSocket&quot;, &quot;Kafka events&quot;).
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              <strong className="text-foreground">Number your arrows</strong>{" "}
              for flow sequence (e.g., &quot;1. User request&quot;, &quot;2.
              Auth check&quot;, &quot;3. Query DB&quot;).
            </p>
            <Tip>
              Numbered arrows help the AI understand your request flow order.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 4 — Design Annotations */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📋" title="Design Annotations" />
            <p className="text-base leading-7 text-muted-foreground">
              Add{" "}
              <strong className="text-foreground">
                text boxes near components
              </strong>{" "}
              to explain design decisions. For example, near your Redis box add
              a text explaining &quot;Using sorted sets for leaderboard, TTL for
              session cache.&quot;
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              The AI reads these annotations and gives you credit for thoughtful
              design choices.
            </p>
            <Tip>
              Long text boxes (3+ lines) are treated as design rationale, not
              component labels.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 5 — Service Clusters */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📦" title="Service Clusters" />
            <p className="text-base leading-7 text-muted-foreground">
              To show{" "}
              <strong className="text-foreground">multiple instances</strong> of
              a service (e.g., 4 WebSocket servers), draw a larger rectangle
              containing smaller copies. The parser auto-detects clusters and
              counts the instances.
            </p>
            <Tip>
              Label each instance the same (e.g., all &quot;ws server&quot;) —
              the cluster gets auto-labeled.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 6 — Architecture Writeup */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📊" title="Architecture Writeup" />
            <ul className="space-y-3 text-base text-muted-foreground">
              <li>
                <strong className="text-foreground">FR:</strong> Write the
                problem statement clearly — this IS the interview question.
              </li>
              <li>
                <strong className="text-foreground">Assumptions:</strong> State
                scale (DAU, concurrent users), read/write ratio, SLA targets.
              </li>
              <li>
                <strong className="text-foreground">NFRs:</strong> Be specific —
                &quot;p99 &lt; 200ms&quot; beats &quot;low latency&quot;.
              </li>
              <li>
                <strong className="text-foreground">Core Entities:</strong> List
                key nouns (User, Post, Message, Game).
              </li>
              <li>
                <strong className="text-foreground">Capacity:</strong> Show your
                math (DAU → QPS → storage → bandwidth).
              </li>
              <li>
                <strong className="text-foreground">API Routes:</strong> Define
                your endpoints or WebSocket message types.
              </li>
            </ul>
            <Tip>
              The more you fill in the left column, the better feedback
              you&apos;ll get. Empty sections = less to review.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 7 — Pre-Submit Checklist */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="✅" title="Pre-Submit Checklist" />
            <ul className="space-y-3 text-base text-muted-foreground">
              {CHECKLIST.map((text) => (
                <li key={text} className="flex items-start gap-2.5">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-violet-500" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Divider />

        {/* CTA */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.08] bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/3 dark:from-violet-500/10 dark:via-card dark:to-cyan-500/5 p-12 text-center">
            <ParticleBackground
              className="absolute inset-0"
              particleCount={20}
            />
            <div className="relative z-10 flex flex-col items-center gap-5">
              <p className="text-2xl font-bold font-heading">
                Ready to put this into practice?
              </p>
              <Link
                href="/canvas"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-8 h-12 text-base font-medium text-white shadow-lg shadow-violet-500/25 shadow-[0_0_25px_oklch(0.72_0.25_285_/_25%)] transition-all hover:shadow-xl hover:shadow-[0_0_35px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
              >
                Start Drawing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
      <footer className="px-4 py-10 text-center text-sm text-muted-foreground">
        <p className="font-medium">Built for system design interview practice</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            Home
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <a
            href="https://github.com/omsitapara98/drawlint.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
