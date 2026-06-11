import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog — DrawLint.ai",
  description: "What's new in DrawLint.ai — latest features, improvements, and updates.",
};

const CHANGELOG = [
  {
    date: "June 2026",
    tag: "Update",
    items: [
      {
        title: "Public Design Library",
        description: "Every reviewed design is now public — no sign-in required to explore. Browse real system design solutions, open any submission to study the diagram, the author's written explanation, and the full AI Design Review side by side, including the hire → strong-hire signal re-evaluation. Sign in only when you want to submit your own. Canonical URLs, Open Graph metadata, and JSON-LD structured data make every design page discoverable in search.",
        badge: "New" as const,
      },
      {
        title: "Daily Drills",
        description: "A new free, AI-generated quiz every day — 5 multiple-choice questions spanning all 27 system design patterns. Answer, learn from the per-question explanations, and build a daily streak. Daily and all-time leaderboards, with one scored attempt per day and unlimited practice rounds. No sign-in needed to play; sign in to save your score.",
        badge: "New" as const,
      },
      {
        title: "Learn Workbook",
        description: "A free, beginner-friendly system design workbook — Fundamentals, Core Building Blocks, and 27 Design Patterns explained in depth with examples and trade-offs. Collapsible left-glued sidebar that highlights your current lesson, a circular reading-progress ring, and cross-device progress tracking with green ticks for completed lessons.",
        badge: "New" as const,
      },
      {
        title: "Cheatsheet",
        description: "A refreshed, quick-reference cheatsheet of all 27 design patterns — friendlier and far less cluttered, organized by category with collapsible sections so you can scan and recall fast before an interview.",
        badge: "New" as const,
      },
      {
        title: "Global Lesson Search",
        description: "A search bar on the Learn hub matches anything you type to the right lesson or pattern, so you can jump straight to the topic you need.",
        badge: null,
      },
      {
        title: "Revamped Learn Hub",
        description: "The /learn page now leads with clear entry points — jump straight into the Workbook, Cheatsheet, or Daily Drills — plus progress bars showing how far you've read.",
        badge: null,
      },
      {
        title: "Public-Page SEO",
        description: "Canonical URLs, Open Graph and per-lesson OG images, and JSON-LD structured data across the public Learn, Cheatsheet, and Drills pages for better discoverability.",
        badge: null,
      },
    ],
  },
  {
    date: "May 2026",
    tag: "Update",
    items: [
      {
        title: "HLD Explanation Panel",
        description: "New free-text field alongside the canvas — explain your component choices, data flow, and key tradeoffs as if talking to an interviewer. AI reads both the diagram and your explanation together. Concrete reasoning earns real credit; vague claims don't.",
        badge: "New" as const,
      },
      {
        title: "Criticals Are Now Respondable",
        description: "Critical issues no longer force a diagram redraw. Respond with how you'd fix it in text — AI evaluates your response and updates the verdict. Severity label is preserved so you always know what mattered most.",
        badge: "New" as const,
      },
      {
        title: "Smarter AI Feedback",
        description: "Entities and capacity reviewers are now lenient-on-format, strict-on-reasoning. Your explanation is shared with all reviewers as first-class evidence. Fewer noisy criticals — only real issues get flagged.",
        badge: null,
      },
      {
        title: "Drawing Guide Now Public",
        description: "The Drawing Guide and AI Setup Guide are now publicly accessible — no sign-in required. Includes a new 'Explain Your Design' section showing how to use the explanation panel effectively.",
        badge: null,
      },
      {
        title: "Explanation Panel in Demo",
        description: "The homepage animated demo now includes the explanation panel stage, showing new users how to walk through their design before submitting.",
        badge: null,
      },
    ],
  },
  {
    date: "April 2026",
    tag: "Launch",
    items: [
      {
        title: "Weekly Challenge",
        description: "New system design challenge every Monday. One-shot submission with AI review, leaderboard ranked by hire signal, streak tracking, and pre-filled requirements. Free for everyone — doesn\u2019t use your monthly quota.",
        badge: "New" as const,
      },
      {
        title: "Library Revamp",
        description: "Three-tab layout: Official Topics (51 curated problems with difficulty badges), Community Topics, and My Designs. Each topic page now shows requirements, scale expectations, collapsible hints, estimated time, and related topics.",
        badge: "Major" as const,
      },
      {
        title: "Topic Enrichment",
        description: "All 51 official topics now include difficulty level (Easy/Medium/Hard), problem brief, key requirements, scale expectations, hints, estimated time, and related topic links.",
        badge: "New" as const,
      },
      {
        title: "Respond to AI Feedback",
        description: "Defend your design choices inline — explain why you picked a certain database, queue, or caching strategy. The AI evaluates your response and gives a verdict.",
        badge: "New" as const,
      },
      {
        title: "Signal Re-Evaluation",
        description: "After responding, request a re-evaluation. The Lead Reviewer reconsiders your hire signal based on your responses — just like a real interview debrief.",
        badge: "New" as const,
      },
      {
        title: "BYO AI Provider Support",
        description: "Connect your own Gemini (free) or Azure OpenAI key for unlimited reviews. Three options: DrawLint AI (managed), Gemini AI (free), Azure OpenAI (advanced).",
        badge: "Major" as const,
      },
      {
        title: "Multi-Provider Architecture",
        description: "Unified provider abstraction layer with retry logic, JSON extraction, and concurrency control. Supports Azure OpenAI Chat Completions, Azure AI Foundry Responses API, and Gemini REST API.",
        badge: null,
      },
      {
        title: "Test Connection",
        description: "Validate your API key before saving. Connection must pass before config is saved.",
        badge: null,
      },
      {
        title: "Landing Page & Animations",
        description: "Animated AI Review Pipeline with respond step, count-up stats, particle background CTA, and enhanced feature cards with hover effects.",
        badge: null,
      },
      {
        title: "Drawing Guide with Animated Previews",
        description: "6 animated SVG canvas previews showing template layout, components, data flows, annotations, clusters, and writeup sections.",
        badge: null,
      },
      {
        title: "Library Filters",
        description: "Filter designs by level, signal, provider, and sort by date or topic.",
        badge: null,
      },
      {
        title: "Collapse All / Expand All",
        description: "Toggle all feedback sections at once in the review panel. Count badges show highlights, warnings, and resolved issues per section.",
        badge: null,
      },
      {
        title: "Graph Parser",
        description: "Intelligent diagram analysis — extracts components, connections, annotations, and clusters from Excalidraw elements. Connection-based annotation linking.",
        badge: null,
      },
      {
        title: "Premium Badge",
        description: "Pro subscribers get a \ud83d\udc51 badge on their submissions in the library and header.",
        badge: null,
      },
      {
        title: "AI Disclaimer",
        description: "Added \u2018AI-generated \u00b7 Use your own judgment\u2019 notice with warning icon on all review results.",
        badge: null,
      },
      {
        title: "Privacy, Terms & Compliance",
        description: "Privacy Policy, Terms of Service, cookie consent banner, email compliance, signup consent text, and legal footer links.",
        badge: null,
      },
      {
        title: "SEO & Metadata",
        description: "robots.txt, sitemap, PWA manifest, JSON-LD structured data, and page-specific titles and descriptions.",
        badge: null,
      },
      {
        title: "About & Changelog Pages",
        description: "About page with mission, tech stack, and contact info. Changelog page with full feature timeline.",
        badge: null,
      },
      {
        title: "Core Platform",
        description: "Excalidraw-based canvas, 6 AI reviewers (NFR, Entities, Capacity, API, HLD + Lead Reviewer), peer library, draft save, share links, and authentication (email, Google, GitHub).",
        badge: "Launch" as const,
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Changelog</h1>
          <p className="mt-2 text-sm text-muted-foreground">What&apos;s new in DrawLint.ai</p>
        </div>

        <div className="space-y-12">
          {CHANGELOG.map((release) => (
            <section key={release.date}>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-lg font-semibold text-foreground">{release.date}</h2>
                {release.tag && (
                  <span className="rounded-full bg-violet-500/15 text-violet-400 px-2.5 py-0.5 text-[0.65rem] font-bold">
                    {release.tag}
                  </span>
                )}
              </div>
              <div className="space-y-3 border-l-2 border-border pl-5">
                {release.items.map((item) => (
                  <div key={item.title} className="relative">
                    <div className="absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-background" />
                    <div className="flex items-start gap-2">
                      <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                      {item.badge && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${
                          item.badge === "New" ? "bg-emerald-500/15 text-emerald-400" :
                          item.badge === "Major" ? "bg-sky-500/15 text-sky-400" :
                          "bg-amber-500/15 text-amber-400"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <span className="text-muted-foreground/30">·</span>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
