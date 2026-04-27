"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  ArrowRight,
  Code2,
  Database,
  Brain,
  Layers,
  Shield,
  Zap,
  ExternalLink,
  Sparkles,
  Target,
  MessageSquareReply,
} from "lucide-react";
import { ParticleBackground } from "@/components/ui/particle-background";

/* ── Animated counter ─────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

/* ── Spotlight card (mouse tracking glow) ─────────────────── */
function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(400px circle at ${x}px ${y}px, oklch(0.72 0.25 285 / 8%), transparent 60%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      style={{ background }}
      className={`relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.06] bg-card p-6 transition-colors hover:border-violet-500/30 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ── Animation variants ───────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring" as const, bounce: 0.3 } },
};

/* ── Data ─────────────────────────────────────────────────── */
const TECH = [
  { icon: Code2, label: "Next.js & React", desc: "App Router, RSC, SSR", color: "text-sky-400" },
  { icon: Layers, label: "Tailwind CSS", desc: "Utility-first styling", color: "text-cyan-400" },
  { icon: Brain, label: "AI Providers", desc: "Azure OpenAI, Gemini", color: "text-violet-400" },
  { icon: Database, label: "Cosmos DB", desc: "MongoDB API, global", color: "text-emerald-400" },
  { icon: Shield, label: "NextAuth.js", desc: "OAuth + credentials", color: "text-amber-400" },
  { icon: Zap, label: "Framer Motion", desc: "Physics animations", color: "text-pink-400" },
];

const PIPELINE = [
  { icon: "✏️", label: "Draw", desc: "Excalidraw canvas with components, flows, annotations" },
  { icon: "🤖", label: "Review", desc: "6 AI reviewers analyze NFR, Entities, Capacity, API, HLD" },
  { icon: "🧠", label: "Verdict", desc: "Lead Reviewer synthesizes a hire signal from all reviews" },
  { icon: "💬", label: "Respond", desc: "Defend your choices — explain trade-offs and alternatives" },
  { icon: "🔄", label: "Re-evaluate", desc: "AI reconsiders your signal based on your responses" },
];

/* ── Page ─────────────────────────────────────────────────── */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 pt-20 pb-16">
        <ParticleBackground className="absolute inset-0" particleCount={35} />
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-[0_0_60px_oklch(0.72_0.25_285_/_40%)]"
          >
            <Image src="/logo.svg" alt="DrawLint.ai" width={80} height={80} className="rounded-2xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold font-heading tracking-tight"
          >
            About{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_3s_ease-in-out_infinite]">
              DrawLint.ai
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground italic"
          >
            For developers, by developers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <Link
              href="/canvas"
              className="group inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-7 h-11 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-[0_0_35px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
            >
              Start Drawing
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="https://github.com/omsitapara98/drawlint.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 h-11 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:border-foreground/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center pt-1"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ━━ Mission ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={fadeUp} className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Target className="h-6 w-6" />
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold font-heading mb-4">
            Who We Are
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground leading-relaxed">
            DrawLint.ai is built by a developer who shared a common frustration:{" "}
            <span className="text-foreground font-semibold">practicing system design with zero feedback</span>.
            Most engineers prepare by drawing on whiteboards alone, with{" "}
            <span className="text-foreground font-semibold">no way to know</span>{" "}
            if their architecture would pass a real interview.
          </motion.p>
          <motion.p variants={fadeUp} className="mt-4 text-lg leading-relaxed">
            <span className="text-muted-foreground">
              Having prepared for and gone through system design interviews firsthand, we&apos;re building the tool we always wished existed —{" "}
            </span>
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
              an AI-powered review partner that gives you real, actionable feedback.
            </span>
          </motion.p>
        </motion.div>
      </section>

      {/* ━━ Stats ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {[
            { value: 6, suffix: "", label: "AI Reviewers" },
            { value: 51, suffix: "", label: "Official Topics" },
            { value: 3, suffix: "", label: "AI Providers" },
            { value: 5, suffix: "", label: "Review Dimensions" },
            { value: 100, suffix: "%", label: "Public Code" },
            { value: 1, suffix: "/wk", label: "Weekly Challenge" },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={scaleIn}
              className="rounded-xl border border-border bg-card p-5 text-center"
            >
              <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                <Counter target={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ━━ Pipeline ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold font-heading">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-2 text-muted-foreground">
              Five steps from blank canvas to hire signal.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="relative flex flex-col gap-0"
          >
            {PIPELINE.map((step, i) => (
              <motion.div key={step.label} variants={fadeUp} className="relative flex items-stretch gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 text-xl">
                    {step.icon}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-violet-500/30 to-transparent" />
                  )}
                </div>
                <div className="pb-8 pt-1">
                  <h3 className="text-base font-semibold text-foreground">{step.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━ Features ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold font-heading">
              Beyond Reviews
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-2 text-muted-foreground">
              Practice, compete, and grow — all in one place.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <SpotlightCard>
              <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50 text-xl">🔥</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Weekly Challenge</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New system design problem every Monday. One-shot submission, leaderboard rankings, and streak tracking to keep you consistent.
                  </p>
                </div>
              </motion.div>
            </SpotlightCard>

            <SpotlightCard>
              <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50 text-xl">📚</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">51 Official Topics</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Curated problems with difficulty levels (Easy / Medium / Hard), pre-filled requirements, and scale expectations.
                  </p>
                </div>
              </motion.div>
            </SpotlightCard>

            <SpotlightCard>
              <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50 text-xl">🏷️</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Community Library</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Browse Official and Community tabs — learn from curated solutions and real submissions from other engineers.
                  </p>
                </div>
              </motion.div>
            </SpotlightCard>
          </motion.div>
        </div>
      </section>

      {/* ━━ Tech Stack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold font-heading">
              Built With
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-2 text-muted-foreground">
              Modern stack, zero compromises.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {TECH.map((t) => (
              <SpotlightCard key={t.label}>
                <motion.div variants={scaleIn} className="flex flex-col items-center gap-3 text-center">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50 ${t.color}`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </motion.div>
              </SpotlightCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━ Open Source ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-3xl"
        >
          <SpotlightCard className="text-center p-10">
            <motion.div variants={fadeUp}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20">
                <Sparkles className="h-7 w-7 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold font-heading mb-3">
                Publicly Available
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Every line of code is public under BSL 1.1. Audit it, fork it, contribute to it.
                No black boxes, no hidden logic.
              </p>
              <a
                href="https://github.com/omsitapara98/drawlint.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-7 h-11 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-[0_0_35px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
                <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </motion.div>
          </SpotlightCard>
        </motion.div>
      </section>

      {/* ━━ Our Story ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div variants={scaleIn}>
            <div className="relative mx-auto mb-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 p-[2px] shadow-[0_0_40px_oklch(0.72_0.25_285_/_30%)]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-2xl font-bold">
                  OS
                </div>
              </div>
            </div>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold font-heading mb-4">
            Our Story
          </motion.h2>
          <motion.p variants={fadeUp} className="text-base text-muted-foreground leading-relaxed">
            What began as a side project to automate system design feedback evolved into something bigger — a mission to rethink how engineers prepare for system design interviews.
          </motion.p>
          <motion.p variants={fadeUp} className="mt-4 text-base text-muted-foreground leading-relaxed">
            Today, DrawLint.ai is focused on creating the best AI-powered system design review platform, where{" "}
            <span className="text-foreground font-semibold">visual thinking</span>,{" "}
            <span className="text-foreground font-semibold">engineering discipline</span>, and{" "}
            <span className="text-foreground font-semibold">AI</span>{" "}
            work together seamlessly.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6">
            <p className="text-sm text-muted-foreground">
              Created by{" "}
              <a
                href="https://omsitapara.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent font-semibold hover:underline"
              >
                Om Sitapara
              </a>
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href="https://omsitapara.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 h-9 text-xs font-medium text-muted-foreground transition-all hover:text-foreground hover:border-foreground/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Portfolio
              </a>
              <a
                href="https://github.com/omsitapara98"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 h-9 text-xs font-medium text-muted-foreground transition-all hover:text-foreground hover:border-foreground/20"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ━━ Contact CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative px-4 py-20">
        <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-border dark:border-white/[0.08] bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/3 dark:from-violet-500/10 dark:via-card dark:to-cyan-500/5 p-12 text-center"
        >
          <ParticleBackground className="absolute inset-0" particleCount={20} />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <MessageSquareReply className="h-8 w-8 text-violet-400" />
            <h2 className="text-2xl font-bold font-heading">Get in Touch</h2>
            <p className="text-muted-foreground max-w-md">
              Questions, feedback, or feature requests? We&apos;d love to hear from you.
            </p>
            <a
              href="mailto:drawlint.ai.support@gmail.com"
              className="group inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-7 h-11 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-[0_0_35px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
            >
              drawlint.ai.support@gmail.com
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </motion.div>
      </section>

      {/* ━━ Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
      <footer className="px-4 py-10 text-center text-sm text-muted-foreground">
        <p className="font-medium">Built for system design interview practice</p>
        <p className="mt-1 text-xs text-muted-foreground/50 italic">For developers, by developers.</p>
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/" className="hover:text-muted-foreground transition-colors">Home</Link>
          <span>·</span>
          <Link href="/changelog" className="hover:text-muted-foreground transition-colors">Changelog</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/40">© {new Date().getFullYear()} DrawLint.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
