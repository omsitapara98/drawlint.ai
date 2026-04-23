import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout";

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border-l-4 border-violet-500/60 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">💡 Tip:</span> {children}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header onOpenSettings={() => {}} />

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        {/* Header */}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Drawing Guide
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Tips for getting the best AI feedback on your system designs
        </p>

        <hr className="my-10 border-border" />

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">📝 The Template Layout</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The whiteboard has two areas: a{" "}
            <strong className="text-foreground">left column</strong> for text
            sections and a{" "}
            <strong className="text-foreground">right area</strong> for your HLD
            diagram.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The left column sections (top to bottom):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Functional Requirements</li>
            <li>Assumptions</li>
            <li>Non-Functional Requirements</li>
            <li>Core Entities</li>
            <li>Capacity Calculations</li>
            <li>API Routes</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The HLD area is where you draw your architecture — boxes, arrows,
            and annotations.
          </p>
          <Tip>
            Don&apos;t move the section headers — the parser uses their
            positions to identify content.
          </Tip>
        </section>

        <hr className="my-10 border-border" />

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">🏗️ Drawing Components</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use <strong className="text-foreground">rectangles</strong> for
            services, databases, caches, queues — anything in your architecture.{" "}
            <strong className="text-foreground">Label every box</strong> — the
            parser reads the text inside to identify component types.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Keywords that are auto-detected:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
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
            ].map((kw) => (
              <code
                key={kw}
                className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
              >
                {kw}
              </code>
            ))}
          </div>
          <Tip>
            A box labeled &quot;Redis Cache&quot; is automatically classified as
            a cache. A box labeled &quot;My Thing&quot; becomes
            &quot;unknown&quot;.
          </Tip>
        </section>

        <hr className="my-10 border-border" />

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">➡️ Drawing Connections</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use <strong className="text-foreground">arrows</strong> to connect
            components — draw from one box to another.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Label your arrows</strong> with
            what flows through them (e.g., &quot;REST API&quot;,
            &quot;WebSocket&quot;, &quot;Kafka events&quot;).
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Number your arrows</strong> for
            flow sequence (e.g., &quot;1. User request&quot;, &quot;2. Auth
            check&quot;, &quot;3. Query DB&quot;).
          </p>
          <Tip>
            Numbered arrows help the AI understand your request flow order.
          </Tip>
        </section>

        <hr className="my-10 border-border" />

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">📋 Writing Annotations</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add{" "}
            <strong className="text-foreground">
              text boxes near components
            </strong>{" "}
            to explain design decisions. For example, near your Redis box add a
            text explaining &quot;Using sorted sets for leaderboard, TTL for
            session cache.&quot;
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The AI reads these annotations and gives you credit for thoughtful
            design choices.
          </p>
          <Tip>
            Long text boxes (3+ lines) are treated as design rationale, not
            component labels.
          </Tip>
        </section>

        <hr className="my-10 border-border" />

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">📦 Grouping Instances</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To show{" "}
            <strong className="text-foreground">multiple instances</strong> of a
            service (e.g., 4 WebSocket servers), draw a larger rectangle
            containing smaller copies. The parser auto-detects clusters and
            counts the instances.
          </p>
          <Tip>
            Label each instance the same (e.g., all &quot;ws server&quot;) — the
            cluster gets auto-labeled.
          </Tip>
        </section>

        <hr className="my-10 border-border" />

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            📊 Filling the Left Column
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">FR:</strong> Write the problem
              statement clearly — this IS the interview question.
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
            The more you fill in the left column, the better feedback you&apos;ll
            get. Empty sections = less to review.
          </Tip>
        </section>

        <hr className="my-10 border-border" />

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">✅ Quick Checklist</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✅ Every box has a descriptive label</li>
            <li>
              ✅ Arrows connect from one box to another (not floating)
            </li>
            <li>
              ✅ Key connections are labeled with what flows through them
            </li>
            <li>✅ At least FR and Assumptions are filled in</li>
            <li>
              ✅ Design decisions are written as text near the relevant component
            </li>
          </ul>
        </section>

        <hr className="my-10 border-border" />

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-lg font-medium">Ready to practice?</p>
          <Link
            href="/canvas"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-8 h-11 text-base font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
          >
            Start Drawing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t px-4 py-8 text-center text-xs text-muted-foreground">
        <p>Built for system design interview practice</p>
      </footer>
    </div>
  );
}
