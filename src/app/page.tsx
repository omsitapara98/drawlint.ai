"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield, Star, ChevronDown, Brain, Layers, Target, Activity, Users, FileCheck, MessageSquareReply, RefreshCw } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { Header } from "@/components/layout";
import { ParticleBackground } from "@/components/ui/particle-background";
import LandingTour from "@/components/tour/LandingTour";
import GuideDemo from "@/components/guide/GuideDemo";

// Typewriter words for hero
const TYPEWRITER_WORDS = [
  "System Design Interviews",
  "Architecture Tradeoffs",
  "Hire Signal Drills",
  "Mock Rounds",
];

// Steps data
const steps = [
  {
    number: "01",
    title: "Design",
    emoji: "🎨",
    description: "Sketch your architecture on an interactive whiteboard with system design templates and components.",
    color: "violet",
  },
  {
    number: "02",
    title: "Review",
    emoji: "🤖",
    description: "Six specialized AI reviewers analyze your NFRs, entities, capacity, APIs, and HLD — then a Lead Reviewer gives your hire signal.",
    color: "cyan",
  },
  {
    number: "03",
    title: "Respond",
    emoji: "💬",
    description: "Explain your tradeoffs verbally — just like in a real interview. The AI rechecks your hire signal based on your responses.",
    color: "emerald",
  },
];

// Features
const features = [
  {
    icon: Zap,
    title: "Multi-Level Review",
    description: "Choose from Mid, Senior, Staff, or Deep analysis — each calibrated to a different experience level.",
  },
  {
    icon: Sparkles,
    title: "6 AI Reviewers",
    description: "5 section reviewers + 1 Lead Reviewer work in parallel for accurate, focused feedback on every dimension.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your API keys stay in your browser. We never store or log credentials. Post designs under a generated pseudonym for full anonymity — verified by our publicly available codebase.",
  },
  {
    icon: Star,
    title: "Weekly Challenge",
    description: "New system design problem every week. Compete on the leaderboard, build your streak, and practice under real interview pressure.",
  },
];

// AI reviewers for the pipeline animation
const AI_REVIEWERS = [
  { icon: Layers, label: "NFR", color: "text-blue-400" },
  { icon: Target, label: "Entities", color: "text-violet-400" },
  { icon: Activity, label: "Capacity", color: "text-amber-400" },
  { icon: Zap, label: "API", color: "text-cyan-400" },
  { icon: Brain, label: "HLD", color: "text-emerald-400" },
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
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 400);
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

// Counter animation hook
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return { count, ref };
}

// Glow-follows-cursor handler — sets CSS vars on element
const handleGlowMove = (e: React.MouseEvent<HTMLElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
};

// AI Pipeline animation component
function AIPipelineAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-100px" });
  const [activeStep, setActiveStep] = useState(-1);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setActiveStep(-1);
    // Animate through each reviewer, then lead
    const intervals: ReturnType<typeof setTimeout>[] = [];
    AI_REVIEWERS.forEach((_, i) => {
      intervals.push(setTimeout(() => setActiveStep(i), 400 * (i + 1)));
    });
    intervals.push(setTimeout(() => setActiveStep(5), 400 * 6)); // lead reviewer
    intervals.push(setTimeout(() => setActiveStep(6), 400 * 7)); // hire signal
    intervals.push(setTimeout(() => setActiveStep(7), 400 * 8.5)); // respond
    intervals.push(setTimeout(() => setActiveStep(8), 400 * 10)); // re-evaluate
    return () => intervals.forEach(clearTimeout);
  }, [inView, replayKey]);

  return (
    <div ref={containerRef} className="mx-auto max-w-2xl">
      {/* Input */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center gap-2 mb-6"
      >
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium">
          📋 Your Design
        </div>
        <motion.div
          animate={inView ? { opacity: [0.3, 1, 0.3] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </motion.div>

      {/* 5 Reviewers */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {AI_REVIEWERS.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-500 ${
              activeStep >= i
                ? "border-violet-500/50 bg-violet-500/5 shadow-[0_0_15px_oklch(0.72_0.25_285_/_15%)]"
                : "border-border bg-card"
            }`}
          >
            <r.icon className={`h-5 w-5 transition-colors duration-500 ${activeStep >= i ? r.color : "text-muted-foreground/40"}`} />
            <span className="text-[0.65rem] font-medium">{r.label}</span>
            {activeStep >= i && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[0.6rem] text-emerald-500 font-medium"
              >
                ✓
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Arrow down */}
      <div className="flex justify-center mb-6">
        <motion.div
          animate={activeStep >= 5 ? { opacity: 1 } : { opacity: 0.3 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-5 w-5 text-violet-500" />
        </motion.div>
      </div>

      {/* Lead Reviewer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.8 }}
        className={`flex items-center justify-center gap-3 rounded-xl border p-4 transition-all duration-500 ${
          activeStep >= 5
            ? "border-violet-500/50 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 shadow-[0_0_20px_oklch(0.72_0.25_285_/_20%)]"
            : "border-border bg-card"
        }`}
      >
        <Brain className={`h-6 w-6 transition-colors duration-500 ${activeStep >= 5 ? "text-violet-500" : "text-muted-foreground/40"}`} />
        <div>
          <span className="text-sm font-semibold">Lead Reviewer</span>
          {activeStep >= 6 && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-2 inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[0.6rem] font-bold text-white"
            >
              Hire ✓
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Arrow down to Respond */}
      <div className="flex justify-center my-4">
        <motion.div
          animate={activeStep >= 7 ? { opacity: 1 } : { opacity: 0.15 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-5 w-5 text-sky-500" />
        </motion.div>
      </div>

      {/* Respond + Re-Evaluate row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Respond to Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 1.0 }}
          className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-500 ${
            activeStep >= 7
              ? "border-sky-500/50 bg-sky-500/5 shadow-[0_0_15px_oklch(0.72_0.2_220_/_15%)]"
              : "border-border bg-card"
          }`}
        >
          <MessageSquareReply className={`h-5 w-5 transition-colors duration-500 ${activeStep >= 7 ? "text-sky-500" : "text-muted-foreground/40"}`} />
          <span className="text-xs font-semibold">Respond</span>
          <span className="text-[0.55rem] text-muted-foreground text-center">Explain your tradeoffs</span>
          {activeStep >= 7 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[0.55rem] text-sky-500 font-medium"
            >
              💬 3 responses
            </motion.span>
          )}
        </motion.div>

        {/* Re-Evaluate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 1.1 }}
          className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-500 ${
            activeStep >= 8
              ? "border-amber-500/50 bg-amber-500/5 shadow-[0_0_15px_oklch(0.72_0.15_85_/_15%)]"
              : "border-border bg-card"
          }`}
        >
          <RefreshCw className={`h-5 w-5 transition-colors duration-500 ${activeStep >= 8 ? "text-amber-500" : "text-muted-foreground/40"}`} />
          <span className="text-xs font-semibold">Re-Evaluate</span>
          <span className="text-[0.55rem] text-muted-foreground text-center">AI updates verdict</span>
          {activeStep >= 8 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[0.55rem] font-bold text-white"
            >
              Strong Hire ↑
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Replay button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => setReplayKey((k) => k + 1)}
          className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-500 transition-colors"
          aria-label="Replay pipeline animation"
        >
          <RefreshCw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-500" />
          Replay
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const typewriterText = useTypewriter(TYPEWRITER_WORDS);

  // Stats counters
  const topics = useCountUp(50);
  const reviewers = useCountUp(6);
  const levels = useCountUp(4);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <LandingTour />

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
            className="text-sm tracking-[0.2em] uppercase text-violet-500 dark:text-violet-400 font-semibold mb-4"
          >
            For developers, by developers
          </motion.p>

          <motion.h1
            variants={item}
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] mb-6"
          >
            <span className="text-foreground">DrawLint</span>
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">.ai</span>
          </motion.h1>

          <motion.div variants={item} className="h-10 flex items-center justify-center mb-6">
            <span className="text-xl md:text-2xl text-muted-foreground font-light">
              Practice{" "}
              <span className="text-foreground font-medium">{typewriterText}</span>
              <span className="inline-block w-0.5 h-6 ml-1 bg-violet-500 animate-pulse" />
            </span>
          </motion.div>

          <motion.p
            variants={item}
            className="max-w-xl mx-auto text-base text-muted-foreground mb-10"
          >
            Draw your design, defend your tradeoffs, get a hire signal —
            before your real interview.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/canvas"
              onMouseMove={handleGlowMove}
              className="group relative overflow-hidden inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-10 h-12 text-base sm:text-lg font-medium text-white shadow-[0_0_25px_oklch(0.72_0.25_285_/_25%)] transition-all hover:shadow-[0_0_40px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle 140px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.35), transparent 70%)",
                }}
              />
              <span className="relative z-10 inline-flex items-center">
                Try a Free Review
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center rounded-full border border-border dark:border-white/10 bg-card/50 dark:bg-white/5 backdrop-blur-sm px-6 h-10 text-sm font-medium text-foreground shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all"
            >
              Design Library
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

      {/* ── Live Demo ────────────────────────────────────────── */}
      <section className="relative px-4 pb-12">
        <div className="mx-auto w-full max-w-5xl">
          <GuideDemo />
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="relative px-4 py-16">
        <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="mx-auto max-w-3xl mt-16 grid grid-cols-3 gap-8">
          {[
            { ref: topics.ref, count: topics.count, suffix: "+", label: "Practice Problems", icon: FileCheck },
            { ref: reviewers.ref, count: reviewers.count, suffix: "", label: "AI Reviewers", icon: Brain },
            { ref: levels.ref, count: levels.count, suffix: "", label: "Review Levels", icon: Users },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon className="h-6 w-6 mx-auto mb-3 text-violet-500" />
              <span ref={stat.ref} className="block text-4xl font-black font-heading bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {stat.count}{stat.suffix}
              </span>
              <span className="text-sm text-muted-foreground mt-1">{stat.label}</span>
            </motion.div>
          ))}
        </div>
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

        {/* Steps with connecting line */}
        <div className="mx-auto max-w-4xl relative">
          {/* Connecting line */}
          <div className="hidden sm:block absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-emerald-500/20 z-0" />

          <div className="grid gap-6 sm:grid-cols-3 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{
                  opacity: 0,
                  x: i === 0 ? -60 : i === 2 ? 60 : 0,
                  y: i === 1 ? 40 : 0,
                }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 * i, ease: "easeOut" }}
                className="group relative rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Animated emoji */}
                <motion.span
                  className="text-4xl block mb-3"
                  whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  {step.emoji}
                </motion.span>
                <span className="text-5xl font-black text-violet-500/40 dark:text-violet-400/20 font-heading">{step.number}</span>
                <h3 className="mt-3 text-lg font-bold font-heading">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-violet-500/5 dark:bg-violet-500/10 blur-xl -z-10" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Review Pipeline (Live Animation) ─────────────── */}
      <section className="relative px-4 py-24">
        <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="gradient-text mt-16 mb-4 text-center font-heading text-3xl sm:text-4xl font-bold tracking-tight"
        >
          The Review Pipeline
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-muted-foreground mb-12 max-w-xl mx-auto"
        >
          Watch five specialized reviewers analyze your design in parallel, then defend your choices and get an updated verdict.
        </motion.p>
        <AIPipelineAnimation />
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
          Why DrawLint
        </motion.h2>
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className="group relative rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm shadow-md shadow-black/[0.04] dark:shadow-none hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:border-violet-500/30 transition-all duration-300 p-7 text-card-foreground"
            >
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <f.icon className="h-5 w-5" />
              </motion.div>
              <h3 className="text-base font-bold font-heading">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-violet-500/5 dark:bg-violet-500/10 blur-xl -z-10" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="relative px-4 py-24">
        <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
        <motion.div
          initial={{ opacity: 0, filter: "blur(20px)", scale: 0.95 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-border dark:border-white/[0.08] bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/3 dark:from-violet-500/10 dark:via-card dark:to-cyan-500/5 p-12 text-center"
        >
          <ParticleBackground className="absolute inset-0" particleCount={20} />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <motion.p
              className="text-2xl sm:text-3xl font-bold font-heading"
              whileInView={{ opacity: [0, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ready to find the holes in your design?
            </motion.p>
            <p className="text-muted-foreground max-w-md">
              Join engineers practicing system design with AI-powered reviews. Free to start.
            </p>
            <Link
              href="/canvas"
              onMouseMove={handleGlowMove}
              className="group relative overflow-hidden inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-8 h-12 text-base font-medium text-white shadow-lg shadow-violet-500/25 shadow-[0_0_25px_oklch(0.72_0.25_285_/_25%)] transition-all hover:shadow-xl hover:shadow-[0_0_35px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle 140px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.35), transparent 70%)",
                }}
              />
              <span className="relative z-10 inline-flex items-center">
                Try a Free Review
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border to-transparent" />
      <footer className="px-4 py-10 text-center text-sm text-muted-foreground">
        <p className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent font-semibold tracking-wide">
          For developers, by developers.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">Built for system design interview practice.</p>
        <div className="mt-3 flex items-center justify-center">
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
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/changelog" className="hover:text-muted-foreground transition-colors">Changelog</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms of Service</Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/40">© {new Date().getFullYear()} DrawLint.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
