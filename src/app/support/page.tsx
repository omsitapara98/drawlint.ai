"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ── FAQ data ─────────────────────────────────────────────── */
const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is DrawLint.ai?",
    a: "DrawLint.ai is a peer system design review platform. Draw your architecture diagrams and get instant AI-powered feedback on scalability, reliability, and best practices.",
  },
  {
    q: "How many free reviews do I get?",
    a: "Free tier users get 10 AI reviews per month with DrawLint AI. You can also use Gemini AI (free, unlimited with your own key) or bring your own Azure OpenAI key for unlimited reviews.",
  },
  {
    q: "What AI providers are supported?",
    a: (
      <>
        DrawLint supports three AI options: <strong>DrawLint AI</strong> (managed, best quality),{" "}
        <strong>Gemini AI</strong> (free, quick setup with a Google API key), and{" "}
        <strong>Azure OpenAI</strong> (advanced, bring your own key).{" "}
        <Link
          href="/guide/byo-keys"
          className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
        >
          Learn more →
        </Link>
      </>
    ),
  },
  {
    q: "How do I set up Gemini AI (free)?",
    a: (
      <>
        Get a free API key from{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
        >
          Google AI Studio
        </a>
        , open Settings, select &quot;Gemini AI&quot;, paste your key, and click Save. Takes about 30 seconds.
      </>
    ),
  },
  {
    q: "Is my data secure?",
    a: "Yes. Your designs are stored securely in our database. API keys (Gemini or Azure) are stored only in your browser\u2019s localStorage and are never persisted on our server. Our codebase is publicly available \u2014 you can verify it yourself.",
  },
  {
    q: "Can I post designs anonymously?",
    a: "Yes. Toggle anonymous mode before submitting and your design will be posted under a generated pseudonym (like \u201cBoldTiger42\u201d) instead of your real name. Your pseudonym is consistent across all your anonymous posts, but only you know it\u2019s you.",
  },
  {
    q: "Can others see my drafts?",
    a: 'No. Draft designs are private and only visible to you. Only designs submitted via "Post + AI Review" are visible in the public library.',
  },
  {
    q: "What is the Respond feature?",
    a: "After getting an AI review, you can respond to individual warnings and follow-up questions — just like in a real interview. The AI evaluates your response and marks it as resolved, partially addressed, or not addressed.",
  },
  {
    q: "Can I improve my hire signal after the review?",
    a: "Yes. After responding to warnings, click \"Re-evaluate Signal\" and the Lead Reviewer re-assesses your design considering your verbal responses. You can go from Lean Hire to Hire or even Strong Hire.",
  },
  {
    q: "Can others see my responses?",
    a: "Yes. Responses and verdicts are visible to everyone in the community library — it\u2019s like reading an interview transcript. Only the author can submit responses.",
  },
  {
    q: "What models does the AI use?",
    a: "DrawLint AI uses pro-grade GPT and Claude models for the best review quality. Gemini AI uses Google\u2019s Gemini 3.1 Flash Lite. In Azure BYO mode, you can choose any chat-completion model deployed on your Azure subscription.",
  },
  {
    q: "How do I delete my account or data?",
    a: "You can delete individual designs from the library. For full account deletion, open a GitHub issue and we\u2019ll handle it.",
  },
  {
    q: "Can I use DrawLint on mobile?",
    a: "The whiteboard canvas requires a desktop browser for the best experience. You can browse the design library on mobile.",
  },
  {
    q: "What is the Weekly Challenge?",
    a: "Every Monday, a new system design problem is posted. You have until Sunday to submit your solution. The AI reviews it for free (doesn\u2019t use your monthly quota), and you\u2019re ranked on the leaderboard by hire signal. Build your streak by completing consecutive weeks.",
  },
  {
    q: "Can I re-submit my weekly challenge?",
    a: "No \u2014 weekly challenge submissions are one-shot, just like a real interview. You get one submission per week. You can still respond to follow-up questions to improve your feedback, but the design itself is locked after submission.",
  },
  {
    q: "Is the weekly challenge free?",
    a: "Yes, completely free for all users. Challenge reviews don\u2019t count against your 10/month DrawLint AI quota. It\u2019s a separate bucket.",
  },
  {
    q: "What happens to my streak if I miss a week?",
    a: "Your current streak resets to zero, but your longest streak is preserved. You can start building again the following week.",
  },
  {
    q: "What review levels are available?",
    a: "Four levels: Mid, Senior, Staff, and Deep. Each is calibrated to a different experience level — higher levels expect more sophisticated trade-off analysis, capacity planning, and fault-tolerance considerations.",
  },
  {
    q: "What's the minimum design requirement to submit?",
    a: "Your design needs at least 3 filled template sections and 2 HLD (high-level design) components. If your design is too sparse, the submit button will tell you what's missing.",
  },
  {
    q: "Can I edit a design after submitting it?",
    a: "Yes. You can re-open any submitted design, edit it, and re-submit for a fresh AI review. Your previous review and responses are preserved.",
  },
  {
    q: "How do I sign up?",
    a: "You can sign up with email/password, Google, or GitHub. Email/password accounts require email verification before you can submit designs.",
  },
  {
    q: "Can I create my own topic?",
    a: "Yes. If you can\u2019t find your topic in the dropdown, type a name and click \u201cCreate\u201d. Your topic will appear under Community Topics in the library.",
  },
  {
    q: "Can I share my design with others?",
    a: "Yes. After submitting, use the share button to copy a direct link to your design. Anyone with the link can view it in the library.",
  },
  {
    q: "How does anonymous posting work?",
    a: "Toggle the identity chip on the canvas before submitting. Your design will be posted under a generated pseudonym like \u201cBoldTiger42\u201d instead of your real name. Your pseudonym is consistent across all anonymous posts.",
  },
  {
    q: "What is the Re-evaluate Signal feature?",
    a: "After responding to AI feedback, click \u201cRe-evaluate Signal\u201d and the Lead Reviewer reconsiders your hire signal based on your responses. Resolved and partially addressed issues count in your favor.",
  },
  {
    q: "How is the weekly challenge topic selected?",
    a: "The system auto-picks an official topic not used in recent weeks, rotating through Easy, Medium, and Hard difficulty. If all topics have been used recently, it picks randomly from the full pool.",
  },
  {
    q: "How do I set up Azure OpenAI (BYO)?",
    a: "Open Settings, select Azure OpenAI, and enter your API key, endpoint URL, and deployment name. Your endpoint must be an Azure OpenAI or Azure AI Foundry URL. Test the connection before saving.",
  },
  {
    q: "How do I delete a design?",
    a: "Open the design in the canvas or library, then use the delete option. You can only delete your own designs. Challenge submissions cannot be deleted after the challenge ends.",
  },
  {
    q: "Is there a changelog?",
    a: "Yes. Visit the Changelog page from the footer to see recent updates, new features, and improvements.",
  },
  {
    q: "Are there rate limits?",
    a: "DrawLint AI: 10 reviews/month on the free tier. Gemini AI: unlimited but capped at 2 concurrent requests (Google's free tier limit). You can also respond up to 20 times per design per hour.",
  },
];

/* ── Accordion item ───────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border dark:border-white/[0.08] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-violet-500"
      >
        <span className="font-semibold text-foreground">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-base leading-7 text-muted-foreground">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Searchable FAQ ───────────────────────────────────────── */
function SearchableFAQ() {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? FAQ_ITEMS.filter((faq) =>
        faq.q.toLowerCase().includes(query.trim().toLowerCase()) ||
        (typeof faq.a === "string" && faq.a.toLowerCase().includes(query.trim().toLowerCase()))
      )
    : FAQ_ITEMS;

  return (
    <>
      <div className="relative pt-2">
        <Search className="absolute left-3.5 top-1/2 mt-1 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs..."
          className="w-full rounded-xl border border-border dark:border-white/[0.08] bg-background/50 dark:bg-background/30 pl-10 pr-10 h-10 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {query.trim() && (
        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} {filtered.length === 1 ? "result" : "results"} found
        </p>
      )}
      <div className="pt-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No FAQs match your search</p>
            <button onClick={() => setQuery("")} className="mt-2 text-xs text-violet-500 hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          filtered.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))
        )}
      </div>
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-24 pb-8">
        <ParticleBackground className="absolute inset-0" particleCount={30} />

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
            Support & FAQ
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Got questions? We&apos;ve got answers.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 space-y-0">
        {/* FAQ Section */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-2">
            <SectionHeading emoji="❓" title="Frequently Asked Questions" />
            <SearchableFAQ />
          </div>
        </section>

        <Divider />

        {/* Contact / Feedback Section */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-6">
            <SectionHeading emoji="💬" title="Need More Help?" />
            <p className="text-base leading-7 text-muted-foreground">
              We&apos;re a publicly available project — your feedback shapes what we
              build next.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Report a Bug */}
              <a
                href="https://github.com/omsitapara98/drawlint.ai/issues/new?template=bug_report.md"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 rounded-xl border border-border dark:border-white/[0.08] bg-background/50 dark:bg-background/30 p-6 text-center transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5"
              >
                <span className="text-3xl">🐛</span>
                <span className="font-semibold text-foreground group-hover:text-violet-500 transition-colors">
                  Report a Bug
                </span>
                <span className="text-sm text-muted-foreground">
                  Found something broken? Let us know on GitHub.
                </span>
              </a>

              {/* Request a Feature */}
              <a
                href="https://github.com/omsitapara98/drawlint.ai/issues/new?template=feature_request.md"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 rounded-xl border border-border dark:border-white/[0.08] bg-background/50 dark:bg-background/30 p-6 text-center transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5"
              >
                <span className="text-3xl">💡</span>
                <span className="font-semibold text-foreground group-hover:text-violet-500 transition-colors">
                  Request a Feature
                </span>
                <span className="text-sm text-muted-foreground">
                  Have an idea? We&apos;d love to hear it.
                </span>
              </a>
            </div>
            <p className="text-sm text-muted-foreground text-center pt-2">
              Or reach us directly at{" "}
              <a
                href="mailto:drawlint.ai.support@gmail.com"
                className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
              >
                drawlint.ai.support@gmail.com
              </a>
            </p>
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
          <Link
            href="/guide"
            className="hover:text-foreground transition-colors"
          >
            Drawing Guide
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
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/privacy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms of Service</Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/40">© {new Date().getFullYear()} DrawLint.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
