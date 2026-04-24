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
        In your Azure OpenAI resource, deploy a model such as{" "}
        <code className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300 font-medium">
          gpt-4o
        </code>{" "}
        or{" "}
        <code className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2 py-0.5 text-xs font-mono text-violet-700 dark:text-violet-300 font-medium">
          gpt-5.4
        </code>
        . Note the deployment name you choose.
      </>
    ),
  },
  {
    step: "3",
    title: "Copy your credentials",
    description:
      "From the Azure portal, copy your API key, endpoint URL, and deployment name.",
  },
  {
    step: "4",
    title: 'Open Settings → Switch to "Bring Your Own Key" mode',
    description:
      'Click your avatar in the top-right corner, open Settings, and toggle the AI mode to "Bring Your Own Key".',
  },
  {
    step: "5",
    title: "Paste credentials → Save",
    description:
      "Enter your API key, endpoint, and deployment name in the fields that appear, then click Save.",
  },
];

const FAQ = [
  {
    q: "What if I clear my browser data?",
    a: "Your key is stored in localStorage, so clearing browser data removes it. Simply re-enter your credentials in Settings.",
  },
  {
    q: "Can I switch back to managed mode?",
    a: 'Yes — anytime. Open Settings and toggle back to "Managed". Your BYO credentials stay saved locally until you explicitly clear them.',
  },
  {
    q: "Does BYO mode cost me anything on DrawLint?",
    a: "No. BYO mode is free on DrawLint — you only pay for the Azure OpenAI usage on your own Azure subscription.",
  },
  {
    q: "Which models are supported?",
    a: "Any chat-completion model deployed on Azure OpenAI (GPT-4o, GPT-4.1, GPT-5.4, etc.).",
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
            Bring Your Own Key
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Use your own Azure OpenAI credentials for unlimited, private design
            reviews
          </motion.p>
        </motion.div>
      </section>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 space-y-0">
        {/* Section 1 — What is BYO Mode? */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🔑" title="What is BYO Mode?" />
            <p className="text-base leading-7 text-muted-foreground">
              By default, DrawLint uses a{" "}
              <strong className="text-foreground">managed AI quota</strong> —
              every account gets{" "}
              <strong className="text-foreground">10 free reviews per month</strong>.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              <strong className="text-foreground">BYO (Bring Your Own) mode</strong>{" "}
              lets you plug in your own Azure OpenAI API key instead. Your
              reviews go directly through your Azure subscription — no limits
              from us.
            </p>
            <Tip>
              BYO mode is perfect for power users who want unlimited practice
              sessions or need to use a specific model version.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 2 — Why use it? */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🚀" title="Why Use BYO Mode?" />
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
                  <strong className="text-foreground">Your own models</strong>{" "}
                  — choose GPT-4o, GPT-5.4, or any model you&apos;ve deployed
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500 inline-block" />
                <span>
                  <strong className="text-foreground">Data residency</strong>{" "}
                  — your data stays in your chosen Azure region
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500 inline-block" />
                <span>
                  <strong className="text-foreground">Zero cost on DrawLint</strong>{" "}
                  — you only pay your own Azure OpenAI bill
                </span>
              </li>
            </ul>
          </div>
        </section>

        <Divider />

        {/* Section 3 — How your keys are stored */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🔒" title="How Your Keys Are Stored" />
            <p className="text-base leading-7 text-muted-foreground">
              Your API key is stored{" "}
              <strong className="text-foreground">
                client-side only in localStorage
              </strong>
              . It is{" "}
              <strong className="text-foreground">
                NEVER sent to our server
              </strong>
              .
            </p>
            <div className="mt-4 rounded-xl bg-zinc-950 dark:bg-zinc-900/60 border border-zinc-800 p-6 font-mono text-sm text-emerald-400 overflow-x-auto">
              <pre className="leading-relaxed whitespace-pre">
{`Your Browser (localStorage) → Azure OpenAI API
     ↑                              ↓
DrawLint UI  ←──── AI Review Result`}
              </pre>
            </div>
            <p className="text-base leading-7 text-muted-foreground mt-2">
              <strong className="text-foreground">
                Your API key goes directly from your browser to Azure. Our
                server never sees it.
              </strong>
            </p>
            <Tip>
              The key stays in your browser&apos;s localStorage — it never
              leaves the client. Even network requests go directly from your
              browser to Azure.
            </Tip>
          </div>
        </section>

        <Divider />

        {/* Section 4 — Step-by-step setup */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="⚡" title="Step-by-Step Setup" />
            <ol className="space-y-5 text-base text-muted-foreground">
              {SETUP_STEPS.map((s) => (
                <li key={s.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 dark:bg-violet-500/15 text-sm font-bold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
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
                    localStorage encryption
                  </strong>{" "}
                  — credentials are stored securely in your browser&apos;s sandboxed storage
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <strong className="text-foreground">No server storage</strong>{" "}
                  — our backend never receives or stores your API key
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
                  <strong className="text-foreground">Direct connection</strong>{" "}
                  — API calls go straight from your browser to Azure, never
                  proxied through DrawLint
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
