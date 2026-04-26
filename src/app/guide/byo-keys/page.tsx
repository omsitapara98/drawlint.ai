"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
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

const SETUP_STEPS = [
  {
    step: "1",
    title: "Open Settings from the top navigation bar",
    description:
      "Click the gear icon or your avatar in the top-right corner to open AI Review Settings.",
  },
  {
    step: "2",
    title: "Choose your AI provider",
    description: (
      <>
        Pick one of three options:{" "}
        <strong>DrawLint AI</strong> (recommended, no setup),{" "}
        <strong>Gemini AI</strong> (free, needs a Google API key), or{" "}
        <strong>Azure OpenAI</strong> (advanced, needs Azure credentials).
      </>
    ),
  },
  {
    step: "3",
    title: "Enter credentials (Gemini or Azure only)",
    description:
      "For Gemini: paste your API key. For Azure: paste your API key, endpoint URL, and deployment name.",
  },
  {
    step: "4",
    title: "Test your connection",
    description:
      'Click "Test Connection" to verify your credentials work before saving.',
  },
  {
    step: "5",
    title: "Save and start reviewing",
    description:
      "Click Save. Your AI provider is now active — go draw a design and submit it for review!",
  },
];

const GEMINI_STEPS = [
  {
    step: "1",
    title: "Get a free Gemini API key",
    description: (
      <>
        Go to{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-700 dark:hover:text-violet-300 transition-colors inline-flex items-center gap-1"
        >
          Google AI Studio
          <ExternalLink className="h-3 w-3" />
        </a>{" "}
        and create an API key. It&apos;s free and takes about 30 seconds.
      </>
    ),
  },
  {
    step: "2",
    title: "Open Settings → Select Gemini AI",
    description:
      'In DrawLint, open Settings and click the "Gemini AI" card.',
  },
  {
    step: "3",
    title: "Paste your key → Test → Save",
    description:
      'Enter your API key, click "Test Connection" to verify it works, then click Save.',
  },
];

const AZURE_STEPS = [
  {
    step: "1",
    title: "Create an Azure OpenAI resource",
    description: (
      <>
        Go to the{" "}
        <a
          href="https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-700 dark:hover:text-violet-300 transition-colors inline-flex items-center gap-1"
        >
          Azure Portal
          <ExternalLink className="h-3 w-3" />
        </a>{" "}
        and create an Azure OpenAI Service resource.
      </>
    ),
  },
  {
    step: "2",
    title: "Deploy a model",
    description: (
      <>
        Deploy a model such as{" "}
        <code className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300 font-medium">
          gpt-4o
        </code>{" "}
        or{" "}
        <code className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300 font-medium">
          gpt-5.4
        </code>
        . Note the deployment name.
      </>
    ),
  },
  {
    step: "3",
    title: "Copy credentials from Azure Portal",
    description:
      'Under "Keys and Endpoint", copy your API key, endpoint URL, and deployment name.',
  },
  {
    step: "4",
    title: 'Open Settings → Select "Azure OpenAI"',
    description:
      'In DrawLint, open Settings and click the "Azure OpenAI" card.',
  },
  {
    step: "5",
    title: "Paste credentials → Test → Save",
    description:
      'Enter all three fields, click "Test Connection" to verify, then click Save.',
  },
];

const FAQ = [
  {
    q: "What if I clear my browser data?",
    a: "Your keys are stored in localStorage, so clearing browser data removes them. Simply re-enter your credentials in Settings.",
  },
  {
    q: "Can I switch between providers?",
    a: "Yes — anytime. Open Settings and select a different provider. Your saved credentials for each provider persist until you explicitly clear them.",
  },
  {
    q: "Does using Gemini or Azure cost me anything on DrawLint?",
    a: "No. Using your own key is free on DrawLint — you only pay for the API usage on your own Google or Azure account.",
  },
  {
    q: "Which Gemini model is used?",
    a: "DrawLint uses Gemini 3.1 Flash Lite — a fast, cost-efficient model optimized for high-volume tasks.",
  },
  {
    q: "Which Azure models are supported?",
    a: "Any chat-completion model deployed on Azure OpenAI or Azure AI Foundry (GPT, Claude, etc.).",
  },
  {
    q: "Is Gemini as good as DrawLint AI?",
    a: "DrawLint AI (managed) uses larger models and is tuned for best results. Gemini is free and good, but may be slightly less accurate on complex reviews. Azure BYO quality depends on the model you deploy.",
  },
];

/* ── Page ─────────────────────────────────────────────────── */
export default function ByoKeysGuidePage() {
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
            AI Setup Guide
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Choose your AI provider — from free to fully managed to bring-your-own
          </motion.p>
        </motion.div>
      </section>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 space-y-0">
        {/* Section 1 — What is BYO Mode? */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🤖" title="Choose Your AI Provider" />
            <p className="text-base leading-7 text-muted-foreground">
              DrawLint offers three ways to power your AI design reviews:
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">⭐ DrawLint AI</p>
                <p className="text-xs text-muted-foreground">Best quality, no setup. 10 free reviews/month.</p>
              </div>
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">💡 Gemini AI</p>
                <p className="text-xs text-muted-foreground">Free &amp; unlimited with a Google API key. ~30 sec setup.</p>
              </div>
              <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">⚙️ Azure OpenAI</p>
                <p className="text-xs text-muted-foreground">Full control with your own Azure deployment. ~10-15 min setup.</p>
              </div>
            </div>

            <Tip>
              Start with <strong>DrawLint AI</strong> if you just want to try it out.
              Switch to <strong>Gemini AI</strong> for free unlimited reviews, or
              <strong> Azure OpenAI</strong> if you need a specific model.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 2 — Why use it? */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🚀" title="Why Use Your Own Key?" />
            <ul className="space-y-3 text-base text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500 inline-block" />
                <span>
                  <strong className="text-foreground">Unlimited reviews</strong>{" "}
                  — no monthly cap, practice as much as you want
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500 inline-block" />
                <span>
                  <strong className="text-foreground">Free option available</strong>{" "}
                  — Gemini AI costs nothing, just a Google API key
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500 inline-block" />
                <span>
                  <strong className="text-foreground">Your own models</strong>{" "}
                  — choose GPT, Claude, or any model you&apos;ve deployed (Azure)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500 inline-block" />
                <span>
                  <strong className="text-foreground">Zero cost on DrawLint</strong>{" "}
                  — you only pay your own API usage (or nothing with Gemini free tier)
                </span>
              </li>
            </ul>
          </div>
        </section>

        <Divider />

        {/* Section 3 — How your keys are stored */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🔒" title="How Your Keys Are Handled" />
            <p className="text-base leading-7 text-muted-foreground">
              Your API key is{" "}
              <strong className="text-foreground">
                stored only in your browser&apos;s localStorage
              </strong>
              . When you submit a design for review, your credentials are sent
              over HTTPS to our server, which forwards the request to Azure
              OpenAI on your behalf — then{" "}
              <strong className="text-foreground">
                immediately discards them
              </strong>
              .
            </p>
            <div className="mt-6 rounded-xl border border-border dark:border-white/[0.08] bg-zinc-950 dark:bg-zinc-900/60 p-6 overflow-hidden">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Browser */}
                <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-violet-500/50 bg-violet-500/10 px-5 py-4 min-w-[140px]">
                  <span className="text-2xl">🌐</span>
                  <span className="text-sm font-bold text-violet-300">Your Browser</span>
                  <span className="text-[0.65rem] text-violet-400/70 text-center">Key stored in<br />localStorage</span>
                </div>

                {/* Arrow 1 */}
                <div className="flex flex-col items-center gap-0.5 px-1">
                  <span className="text-[0.6rem] font-medium text-emerald-400">HTTPS + key</span>
                  <div className="flex items-center gap-1">
                    <div className="h-px w-10 bg-gradient-to-r from-violet-500 to-emerald-500" />
                    <span className="text-emerald-400">→</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-amber-400">←</span>
                    <div className="h-px w-10 bg-gradient-to-r from-amber-500 to-violet-500" />
                  </div>
                  <span className="text-[0.6rem] font-medium text-amber-400">AI review</span>
                </div>

                {/* DrawLint API */}
                <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-5 py-4 min-w-[140px]">
                  <span className="text-2xl">⚡</span>
                  <span className="text-sm font-bold text-emerald-300">DrawLint API</span>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[0.6rem] text-emerald-400/80 font-medium">Stateless proxy</span>
                    <span className="text-[0.6rem] text-red-400 font-semibold">🚫 Never stores key</span>
                  </div>
                </div>

                {/* Arrow 2 */}
                <div className="flex flex-col items-center gap-0.5 px-1">
                  <span className="text-[0.6rem] font-medium text-cyan-400">Forwarded call</span>
                  <div className="flex items-center gap-1">
                    <div className="h-px w-10 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                    <span className="text-cyan-400">→</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-cyan-400">←</span>
                    <div className="h-px w-10 bg-gradient-to-r from-cyan-500 to-emerald-500" />
                  </div>
                  <span className="text-[0.6rem] font-medium text-cyan-400">AI response</span>
                </div>

                {/* AI Provider */}
                <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-cyan-500/50 bg-cyan-500/10 px-5 py-4 min-w-[140px]">
                  <span className="text-2xl">🤖</span>
                  <span className="text-sm font-bold text-cyan-300">AI Provider</span>
                  <span className="text-[0.65rem] text-cyan-400/70 text-center">Gemini / Azure<br />OpenAI</span>
                </div>
              </div>

              {/* Key lifecycle */}
              <div className="mt-5 flex items-center justify-center gap-6 text-[0.65rem]">
                <span className="flex items-center gap-1.5 text-violet-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  Key lives here
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Key passes through (in-memory only)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Key authenticates your call
                </span>
              </div>
            </div>
            <p className="text-base leading-7 text-muted-foreground mt-4">
              <strong className="text-foreground">Key guarantees:</strong>
            </p>
            <ul className="space-y-2 text-base text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                We <strong className="text-foreground">never log</strong> your API key, endpoint, or deployment name
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                We <strong className="text-foreground">never store</strong> your credentials in our database or on disk
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                Your key is used <strong className="text-foreground">only for the duration</strong> of that single API call, then discarded from memory
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                All communication is <strong className="text-foreground">encrypted over HTTPS</strong>
              </li>
            </ul>
            <Tip>
              Your key lives in your browser&apos;s localStorage and is only
              transmitted when you submit a review. Our server acts as a
              stateless pass-through — it never persists your credentials.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 4 — Quick Setup: Gemini AI */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="⚡" title="Quick Setup: Gemini AI (Free)" />
            <p className="text-base leading-7 text-muted-foreground">
              The fastest way to get unlimited AI reviews — takes about 30 seconds.
            </p>
            <ol className="space-y-5 text-base text-muted-foreground">
              {GEMINI_STEPS.map((s) => (
                <li key={s.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-sm font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    {s.step}
                  </span>
                  <div className="pt-0.5">
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="mt-1 text-muted-foreground">{s.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Divider />

        {/* Section 5 — Advanced Setup: Azure OpenAI */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🔧" title="Advanced Setup: Azure OpenAI" />
            <p className="text-base leading-7 text-muted-foreground">
              For power users who want full control — takes about 10-15 minutes.
            </p>
            <ol className="space-y-5 text-base text-muted-foreground">
              {AZURE_STEPS.map((s) => (
                <li key={s.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-500/15 text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                    {s.step}
                  </span>
                  <div className="pt-0.5">
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="mt-1 text-muted-foreground">{s.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Tip>
              You can find your API key under &quot;Keys and Endpoint&quot; in
              your Azure OpenAI resource page.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 5 — Security guarantees */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🛡️" title="Security Guarantees" />
            <ul className="space-y-3 text-base text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <strong className="text-foreground">
                    Stored only in your browser
                  </strong>{" "}
                  — credentials live in localStorage, sandboxed to your browser session
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <strong className="text-foreground">Never logged or persisted</strong>{" "}
                  — our server processes your key in-memory for a single request, then discards it. No database, no logs, no disk writes.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <strong className="text-foreground">
                    Clear key button
                  </strong>{" "}
                  — instantly wipe your credentials with one click in Settings
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <strong className="text-foreground">HTTPS everywhere</strong>{" "}
                  — all communication between your browser, our server, and Azure
                  is encrypted in transit
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <strong className="text-foreground">Open source</strong>{" "}
                  — our codebase is{" "}
                  <a
                    href="https://github.com/omsitapara98/drawlint.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    public on GitHub
                  </a>{" "}
                  — you can verify exactly how keys are handled
                </span>
              </li>
            </ul>
          </div>
        </section>

        <Divider />

        {/* Section 6 — FAQ */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-6">
            <SectionHeading emoji="❓" title="Frequently Asked Questions" />
            {FAQ.map((faq) => (
              <div key={faq.q} className="space-y-1.5">
                <p className="font-semibold text-foreground">{faq.q}</p>
                <p className="text-base leading-7 text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            ))}
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
                Ready to get started?
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
      </footer>
    </div>
  );
}
