"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield, Star, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";

// Typewriter words for hero
const TYPEWRITER_WORDS = [
  "System Design",
  "Architecture Review",
  "Scalability Analysis",
  "API Design",
];

// Steps data — improved copy
const steps = [
  {
    number: "01",
    title: "Design",
    description: "Sketch your architecture on an interactive whiteboard with system design templates and components.",
  },
  {
    number: "02",
    title: "Analyze",
    description: "Five specialized AI reviewers dissect your NFRs, entities, capacity planning, APIs, and HLD in parallel.",
  },
  {
    number: "03",
    title: "Improve",
    description: "Receive a structured review with highlights for strong decisions and actionable feedback on gaps.",
  },
];

// Features — improved copy with lucide icons
const features = [
  {
    icon: Zap,
    title: "Multi-Level Review",
    description: "Choose from Mid, Senior, Staff, or Deep analysis — each calibrated to a different experience level.",
  },
  {
    icon: Sparkles,
    title: "5 Parallel Reviewers",
    description: "Each reviewer gets isolated context for accurate, focused feedback on one dimension of your design.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Bring your own Azure OpenAI key. It stays in your browser — we never store or proxy your credentials.",
  },
  {
    icon: Star,
    title: "Beyond Bug-Finding",
    description: "Get credit for strong design choices, not just a list of problems. Highlights + issues = balanced review.",
  },
];

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

// Typewriter hook
function useTypewriter(words: string[], typingSpeed = 80, deletingSpeed = 40, pauseDuration = 2500) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      const speed = isDeleting ? deletingSpeed : typingSpeed;
      timeout = setTimeout(() => {
        setText(
          isDeleting
            ? currentWord.slice(0, text.length - 1)
            : currentWord.slice(0, text.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseDuration]);

  return text;
}

export default function LandingPage() {
  const typewriterText = useTypewriter(TYPEWRITER_WORDS);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24">
        <ParticleBackground className="absolute inset-0" />

        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-500/15 dark:bg-violet-500/20 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px]" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 text-center max-w-3xl"
        >
          <motion.p
            variants={item}
            className="text-sm tracking-[0.2em] uppercase text-violet-500 dark:text-violet-400 font-medium mb-4"
          >
            AI-Powered Architecture Review
          </motion.p>

          <motion.h1
            variants={item}
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] mb-6"
          >
            <span className="bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              DrawLint
            </span>
            <span className="text-foreground/90">.ai</span>
          </motion.h1>

          <motion.div variants={item} className="h-10 flex items-center justify-center mb-6">
            <span className="text-xl md:text-2xl text-muted-foreground font-light">
              Master{" "}
              <span className="text-foreground font-medium">{typewriterText}</span>
              <span className="inline-block w-0.5 h-6 ml-1 bg-violet-500 animate-pulse" />
            </span>
          </motion.div>

          <motion.p
            variants={item}
            className="max-w-xl mx-auto text-base text-muted-foreground mb-10"
          >
            Draw your system architecture, get instant review from five AI
            reviewers — each calibrated to catch different classes of design issues.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/canvas"
              className="group inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-10 h-12 text-base sm:text-lg font-medium text-white shadow-[0_0_25px_oklch(0.72_0.25_285_/_25%)] transition-all hover:shadow-[0_0_40px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
            >
              Start Drawing
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center rounded-full border border-border dark:border-white/10 bg-card/50 dark:bg-white/5 backdrop-blur-sm px-6 h-10 text-sm font-medium text-foreground shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all"
            >
              Browse the Library
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-widest uppercase text-muted-foreground/60">Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-5 w-5 text-muted-foreground/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="relative px-4 py-24">
        <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="gradient-text mt-16 mb-16 text-center font-heading text-3xl sm:text-4xl font-bold tracking-tight"
        >
          How It Works
        </motion.h2>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 * i }}
              className="group relative rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300"
            >
              <span className="text-5xl font-black text-violet-500/40 dark:text-violet-400/20 font-heading">{step.number}</span>
              <h3 className="mt-3 text-lg font-bold font-heading">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              {/* Hover glow aura */}
              <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-violet-500/5 dark:bg-violet-500/10 blur-xl -z-10" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="relative px-4 py-24">
        <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="gradient-text mt-16 mb-16 text-center font-heading text-3xl sm:text-4xl font-bold tracking-tight"
        >
          Built Different
        </motion.h2>
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group relative rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm shadow-md shadow-black/[0.04] dark:shadow-none hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300 p-7 text-card-foreground"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold font-heading">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-violet-500/5 dark:bg-violet-500/10 blur-xl -z-10" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
      <footer className="px-4 py-10 text-center text-sm text-muted-foreground">
        <p className="font-medium">Built for system design interview practice</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link href="/guide" className="hover:text-foreground transition-colors">
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
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
