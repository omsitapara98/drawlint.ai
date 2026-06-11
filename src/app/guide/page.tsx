"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion, useInView } from "framer-motion";
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
    <div className="mt-4 rounded-xl border-l-[3px] border-l-violet-500 border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/30 p-4 shadow-sm">
      <span className="font-semibold text-violet-700 dark:text-violet-300">💡 Tip:</span>{" "}
      <span className="text-violet-900/80 dark:text-violet-200/80">{children}</span>
    </div>
  );
}

function SectionHeading({ emoji, title }: { emoji: string; title: string }) {
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

/* ── Animated Canvas Previews ─────────────────────────────── */

/** Animated box that draws itself */
function AnimBox({ x, y, w, h, label, delay, color = "violet" }: {
  x: number; y: number; w: number; h: number; label: string; delay: number; color?: string;
}) {
  const colors: Record<string, { border: string; bg: string; text: string }> = {
    violet: { border: "stroke-violet-500", bg: "fill-violet-500/10", text: "fill-violet-300" },
    cyan: { border: "stroke-cyan-500", bg: "fill-cyan-500/10", text: "fill-cyan-300" },
    amber: { border: "stroke-amber-500", bg: "fill-amber-500/10", text: "fill-amber-300" },
    emerald: { border: "stroke-emerald-500", bg: "fill-emerald-500/10", text: "fill-emerald-300" },
    red: { border: "stroke-red-500", bg: "fill-red-500/10", text: "fill-red-300" },
  };
  const c = colors[color] ?? colors.violet;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <rect x={x} y={y} width={w} height={h} rx={6} className={`${c.bg} ${c.border}`} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className={`${c.text} text-[10px] font-medium`}>{label}</text>
    </motion.g>
  );
}

/** Animated arrow between two points */
function AnimArrow({ x1, y1, x2, y2, delay, label }: {
  x1: number; y1: number; x2: number; y2: number; delay: number; label?: string;
}) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <motion.line
        x1={x1} y1={y1} x2={x2} y2={y2}
        className="stroke-zinc-400/60"
        strokeWidth={1.5}
        markerEnd="url(#arrowhead)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay }}
      />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" className="fill-zinc-400 text-[8px]">{label}</text>
      )}
    </motion.g>
  );
}

/** SVG canvas wrapper with sketch background */
function CanvasPreview({ children, height = 180 }: { children: React.ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="mt-5 rounded-xl border border-border dark:border-white/[0.08] bg-zinc-950 dark:bg-zinc-900/60 p-2 overflow-hidden"
    >
      <svg viewBox={`0 0 600 ${height}`} className="w-full h-auto">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="fill-zinc-400/50" />
          </marker>
        </defs>
        {inView && children}
      </svg>
    </motion.div>
  );
}

/** Template layout preview — full architecture diagram */
function TemplatePreview() {
  return (
    <CanvasPreview height={340}>
      {/* ── Left column: compact, pushed left ── */}
      <AnimBox x={5} y={10} w={120} h={45} label="Functional Reqs" delay={0.1} />
      <AnimBox x={130} y={10} w={70} h={45} label="Assumptions" delay={0.15} />

      <AnimBox x={5} y={63} w={195} h={45} label="Non-Functional Requirements" delay={0.2} />

      <AnimBox x={5} y={116} w={95} h={42} label="Core Entities" delay={0.3} />
      <AnimBox x={105} y={116} w={95} h={42} label="Capacity Calc" delay={0.35} />

      <AnimBox x={5} y={166} w={195} h={50} label="API Routes" delay={0.4} />

      {/* Divider */}
      <motion.line x1={210} y1={5} x2={210} y2={395} className="stroke-violet-500/30" strokeWidth={1.5} strokeDasharray="6 4"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.3 }} />

      {/* ── Right area: HLD with more space ── */}
      <motion.text x={400} y={20} textAnchor="middle" className="fill-violet-400/25 text-[11px] font-bold tracking-wider"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        HIGH-LEVEL DESIGN
      </motion.text>

      <AnimBox x={365} y={35} w={75} h={30} label="Client" delay={0.6} color="cyan" />
      <AnimArrow x1={402} y1={65} x2={402} y2={90} delay={0.7} label="HTTPS" />

      <AnimBox x={350} y={90} w={105} h={30} label="Load Balancer" delay={0.8} color="violet" />

      <AnimBox x={235} y={155} w={85} h={30} label="Auth Svc" delay={1.0} color="emerald" />
      <AnimBox x={340} y={155} w={85} h={30} label="API Server" delay={1.1} color="violet" />
      <AnimBox x={445} y={155} w={75} h={30} label="Worker" delay={1.2} color="amber" />
      <AnimArrow x1={380} y1={120} x2={277} y2={155} delay={0.9} />
      <AnimArrow x1={402} y1={120} x2={382} y2={155} delay={0.95} />
      <AnimArrow x1={425} y1={120} x2={482} y2={155} delay={1.0} />

      <AnimBox x={235} y={220} w={85} h={30} label="PostgreSQL" delay={1.3} color="emerald" />
      <AnimBox x={340} y={220} w={85} h={30} label="Redis" delay={1.4} color="red" />
      <AnimBox x={445} y={220} w={75} h={30} label="Kafka" delay={1.5} color="amber" />
      <AnimArrow x1={277} y1={185} x2={277} y2={220} delay={1.3} />
      <AnimArrow x1={382} y1={185} x2={382} y2={220} delay={1.35} />
      <AnimArrow x1={482} y1={185} x2={482} y2={220} delay={1.4} />

      {/* Blob Storage — below PostgreSQL */}
      <AnimBox x={235} y={290} w={100} h={30} label="Blob Storage" delay={1.6} color="cyan" />
      <AnimArrow x1={277} y1={250} x2={285} y2={290} delay={1.6} />

      {/* Kafka annotation — horizontal, right of Kafka */}
      <motion.g initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.9, duration: 0.4 }}>
        <rect x={530} y={215} width={60} height={42} rx={5} className="fill-amber-500/5 stroke-amber-500/20" strokeWidth={1} strokeDasharray="4 4" />
        <text x={537} y={230} className="fill-amber-300/80 text-[6px] font-medium">💬 3 partitions</text>
        <text x={537} y={242} className="fill-amber-300/60 text-[6px]">parallel consume</text>
      </motion.g>
      <motion.line x1={520} y1={235} x2={530} y2={235} className="stroke-amber-500/40" strokeWidth={1.5} strokeDasharray="4 4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} />

      {/* Redis annotation — right side bottom */}
      <motion.g initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.1, duration: 0.4 }}>
        <rect x={440} y={290} width={130} height={40} rx={5} className="fill-red-500/5 stroke-red-500/20" strokeWidth={1} strokeDasharray="4 4" />
        <text x={452} y={306} className="fill-red-300/80 text-[7px] font-medium">💬 LRU eviction, TTL=3600s</text>
        <text x={452} y={320} className="fill-red-300/60 text-[6px]">session + leaderboard cache</text>
      </motion.g>
      <motion.line x1={425} y1={250} x2={470} y2={290} className="stroke-red-500/30" strokeWidth={1.5} strokeDasharray="4 4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} />
    </CanvasPreview>
  );
}

/** Components preview */
function ComponentsPreview() {
  return (
    <CanvasPreview height={220}>
      <AnimBox x={20} y={25} w={150} h={45} label="API Gateway" delay={0.1} color="cyan" />
      <AnimBox x={210} y={25} w={150} h={45} label="User Service" delay={0.2} color="violet" />
      <AnimBox x={400} y={25} w={150} h={45} label="Redis Cache" delay={0.3} color="red" />
      <AnimBox x={20} y={125} w={150} h={45} label="Kafka Queue" delay={0.4} color="amber" />
      <AnimBox x={210} y={125} w={150} h={45} label="PostgreSQL" delay={0.5} color="emerald" />
      <AnimBox x={400} y={125} w={150} h={45} label="CDN" delay={0.6} color="cyan" />
      {/* Auto-detected labels */}
      <motion.text x={95} y={90} textAnchor="middle" className="fill-cyan-500/70 text-[9px] font-medium"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>↑ auto-detected: gateway</motion.text>
      <motion.text x={285} y={90} textAnchor="middle" className="fill-violet-500/70 text-[9px] font-medium"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>↑ auto-detected: service</motion.text>
      <motion.text x={475} y={90} textAnchor="middle" className="fill-red-500/70 text-[9px] font-medium"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>↑ auto-detected: cache</motion.text>
      <motion.text x={95} y={190} textAnchor="middle" className="fill-amber-500/70 text-[9px] font-medium"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>↑ auto-detected: queue</motion.text>
      <motion.text x={285} y={190} textAnchor="middle" className="fill-emerald-500/70 text-[9px] font-medium"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>↑ auto-detected: database</motion.text>
      <motion.text x={475} y={190} textAnchor="middle" className="fill-cyan-500/70 text-[9px] font-medium"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>↑ auto-detected: cdn</motion.text>
    </CanvasPreview>
  );
}

/** Data flow preview */
function DataFlowPreview() {
  return (
    <CanvasPreview height={280}>
      <AnimBox x={30} y={115} w={120} h={45} label="Client" delay={0.1} color="cyan" />
      <AnimBox x={230} y={115} w={120} h={45} label="API Server" delay={0.2} color="violet" />
      <AnimBox x={440} y={15} w={120} h={45} label="Redis Cache" delay={0.3} color="red" />
      <AnimBox x={440} y={210} w={120} h={45} label="PostgreSQL" delay={0.4} color="emerald" />
      <AnimArrow x1={150} y1={137} x2={230} y2={137} delay={0.5} label="1. REST API" />
      <AnimArrow x1={350} y1={120} x2={440} y2={42} delay={0.7} label="2. Cache check" />
      <AnimArrow x1={350} y1={155} x2={440} y2={230} delay={0.9} label="3. Query DB" />
    </CanvasPreview>
  );
}

/** Annotations preview */
function AnnotationsPreview() {
  return (
    <CanvasPreview height={190}>
      <AnimBox x={240} y={55} w={140} h={55} label="Redis Cache" delay={0.1} color="red" />
      {/* Annotation text box */}
      <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
        <rect x={25} y={30} width={170} height={100} rx={6} className="fill-amber-500/5 stroke-amber-500/30" strokeWidth={1} strokeDasharray="4 4" />
        <text x={40} y={55} className="fill-amber-300 text-[10px] font-medium">Using sorted sets</text>
        <text x={40} y={72} className="fill-amber-300 text-[10px]">for leaderboard.</text>
        <text x={40} y={91} className="fill-amber-300 text-[10px]">TTL=3600 for</text>
        <text x={40} y={108} className="fill-amber-300 text-[10px]">session cache.</text>
      </motion.g>
      {/* Dotted line */}
      <motion.line x1={195} y1={82} x2={240} y2={82} className="stroke-amber-500/40" strokeWidth={1.5} strokeDasharray="4 4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} />
      {/* Credit indicator */}
      <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: "spring" }}>
        <rect x={430} y={50} width={120} height={60} rx={12} className="fill-emerald-500/10 stroke-emerald-500/50" strokeWidth={1.5} />
        <text x={490} y={75} textAnchor="middle" className="fill-emerald-400 text-[11px] font-bold">AI gives</text>
        <text x={490} y={93} textAnchor="middle" className="fill-emerald-400 text-[11px] font-bold">credit ✓</text>
      </motion.g>
    </CanvasPreview>
  );
}

/** Clusters preview */
function ClustersPreview() {
  return (
    <CanvasPreview height={190}>
      {/* Outer cluster box */}
      <motion.rect x={40} y={25} width={340} height={140} rx={10} className="fill-violet-500/5 stroke-violet-500/30" strokeWidth={1.5} strokeDasharray="6 4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} />
      <motion.text x={210} y={20} textAnchor="middle" className="fill-violet-400/60 text-[10px] font-medium"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>WS Server Cluster (×4)</motion.text>
      {/* Inner instances */}
      <AnimBox x={60} y={45} w={130} h={42} label="WS Server" delay={0.3} />
      <AnimBox x={230} y={45} w={130} h={42} label="WS Server" delay={0.4} />
      <AnimBox x={60} y={105} w={130} h={42} label="WS Server" delay={0.5} />
      <AnimBox x={230} y={105} w={130} h={42} label="WS Server" delay={0.6} />
      {/* Count badge */}
      <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, type: "spring" }}>
        <rect x={430} y={60} width={120} height={60} rx={12} className="fill-violet-500/15 stroke-violet-500/50" strokeWidth={1.5} />
        <text x={490} y={85} textAnchor="middle" className="fill-violet-300 text-[16px] font-bold">×4</text>
        <text x={490} y={105} textAnchor="middle" className="fill-violet-400/60 text-[9px]">auto-detected</text>
      </motion.g>
    </CanvasPreview>
  );
}

/** Writeup preview showing text sections */
function WriteupPreview() {
  const lines = [
    { label: "FR:", text: "Design a URL shortener that handles 100M URLs", delay: 0.1, color: "fill-cyan-400" },
    { label: "Assumptions:", text: "10K DAU, 100:1 read/write, 99.9% SLA", delay: 0.3, color: "fill-violet-400" },
    { label: "NFRs:", text: "p99 < 200ms, eventual consistency OK", delay: 0.5, color: "fill-amber-400" },
    { label: "Entities:", text: "URL { shortCode, originalUrl, userId, createdAt }", delay: 0.7, color: "fill-emerald-400" },
    { label: "Capacity:", text: "10K writes/day → 0.12 QPS write, 12 QPS read", delay: 0.9, color: "fill-red-400" },
  ];

  return (
    <CanvasPreview height={190}>
      {lines.map((line, i) => (
        <motion.g key={line.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: line.delay, duration: 0.4 }}
        >
          <text x={15} y={30 + i * 32} className={`${line.color} text-[10px] font-bold`}>{line.label}</text>
          <text x={110} y={30 + i * 32} className="fill-zinc-300 text-[9px]">{line.text}</text>
          {/* Typing cursor on last item */}
          {i === lines.length - 1 && (
            <motion.rect x={385} y={21 + i * 32} width={2} height={14} className="fill-violet-500"
              animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity, delay: line.delay + 0.5 }} />
          )}
        </motion.g>
      ))}
    </CanvasPreview>
  );
}

const KEYWORDS = [
  "service", "database", "db", "sql", "cache", "redis", "queue",
  "kafka", "rabbitmq", "gateway", "load balancer", "lb", "worker",
  "cdn", "dns", "pub-sub", "storage", "s3", "blob",
];

const CHECKLIST = [
  "Every box has a descriptive label",
  "Arrows connect from one box to another (not floating)",
  "Key connections are labeled with what flows through them",
  "At least FR and Assumptions are filled in",
  "Design decisions are written as text near the relevant component",
  "Explanation panel filled in — walk through your component choices, data flow, and key tradeoffs",
];

/* ── Page ─────────────────────────────────────────────────── */
export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-24 pb-8">
        <ParticleBackground className="absolute inset-0" particleCount={30} />
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-violet-500/15 dark:bg-violet-500/20 rounded-full blur-[120px]" />

        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.h1 variants={item} className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">
            Drawing Guide
          </motion.h1>
          <motion.p variants={item} className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to get the most out of AI-powered design reviews
          </motion.p>
        </motion.div>
      </section>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 space-y-0">
        {/* Section 1 — Template Layout */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📝" title="The Whiteboard Template" />
            <p className="text-base leading-7 text-muted-foreground">
              The whiteboard has a <strong className="text-foreground">left column</strong> for text sections and a <strong className="text-foreground">right area</strong> for your HLD diagram.
            </p>
            <TemplatePreview />
          </div>
        </section>

        <Divider />

        {/* Section 2 — System Components */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="🏗️" title="System Components" />
            <p className="text-base leading-7 text-muted-foreground">
              Use <strong className="text-foreground">rectangles</strong> for services, databases, caches, queues. <strong className="text-foreground">Label every box</strong> — the parser reads the text inside to identify component types.
            </p>
            <ComponentsPreview />
            <p className="text-base leading-7 text-muted-foreground mt-4">Keywords that are auto-detected:</p>
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map((kw) => (
                <code key={kw} className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2 py-1 text-xs font-mono text-violet-700 dark:text-violet-300 font-medium">{kw}</code>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* Section 3 — Data Flow */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="➡️" title="Data Flow & Connections" />
            <p className="text-base leading-7 text-muted-foreground">
              Use <strong className="text-foreground">arrows</strong> to connect components. <strong className="text-foreground">Label</strong> them with what flows through, and <strong className="text-foreground">number</strong> them for flow sequence.
            </p>
            <DataFlowPreview />
            <Tip>Numbered arrows help the AI understand your request flow order.</Tip>
          </div>
        </section>

        <Divider />

        {/* Section 4 — Design Annotations */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📋" title="Design Annotations" />
            <p className="text-base leading-7 text-muted-foreground">
              Add <strong className="text-foreground">text boxes near components</strong> to explain design decisions. The AI reads these and gives you credit for thoughtful choices.
            </p>
            <AnnotationsPreview />
            <Tip>Long text boxes (3+ lines) are treated as design rationale, not component labels.</Tip>
          </div>
        </section>

        <Divider />

        {/* Section 5 — Service Clusters */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📦" title="Service Clusters" />
            <p className="text-base leading-7 text-muted-foreground">
              To show <strong className="text-foreground">multiple instances</strong>, draw a larger rectangle containing smaller copies. The parser auto-detects clusters and counts instances.
            </p>
            <ClustersPreview />
          </div>
        </section>

        <Divider />

        {/* Section 6 — Architecture Writeup */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="📊" title="Architecture Writeup" />
            <p className="text-base leading-7 text-muted-foreground">
              Fill in the left column sections with specifics. The more detail, the better the AI review.
            </p>
            <WriteupPreview />
            <Tip>The more you fill in the left column, the better feedback you&apos;ll get. Empty sections = less to review.</Tip>
          </div>
        </section>

        <Divider />

        {/* Section 7 — Explain Your Design */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="💬" title="Explain Your Design" />
            <p className="text-base leading-7 text-muted-foreground">
              Click the <strong className="text-foreground">Explain Design</strong> button in the top-right of the canvas to open the explanation panel. This is a free-text field — separate from your diagram — where you talk through your design as if you&apos;re in a live interview.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              Cover your <strong className="text-foreground">component choices</strong>, <strong className="text-foreground">data flow reasoning</strong>, and <strong className="text-foreground">key tradeoffs</strong>. The AI reads both your diagram <em>and</em> this explanation together, so concrete reasoning here earns real credit — even if your diagram doesn&apos;t show every detail.
            </p>

            {/* Explanation panel mockup */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="mt-5 rounded-xl border border-violet-300 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/30 overflow-hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-violet-300 dark:border-violet-500/20 bg-violet-100/60 dark:bg-violet-500/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400" />
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-300 tracking-wide">EXPLAIN YOUR DESIGN</span>
                </div>
                <span className="text-[10px] text-violet-500/70 dark:text-violet-400/60">0 / 2000 words</span>
              </div>
              {/* Fake textarea content */}
              <div className="px-5 py-4 space-y-2">
                <motion.p
                  className="text-sm text-violet-900/80 dark:text-violet-200/80 leading-6"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  I chose Kafka over a direct DB write because the write volume at peak (≈ 50k msg/s) would saturate Postgres. Kafka lets me buffer and fan-out to both the timeline service and the notification worker without coupling them...
                </motion.p>
                <motion.p
                  className="text-sm text-violet-900/50 dark:text-violet-200/50 leading-6"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  Redis stores the hot timeline (last 200 posts) with TTL=1h. For cold reads I fall back to Postgres with a covering index on (user_id, created_at DESC)...
                </motion.p>
              </div>
            </motion.div>

            <Tip>Think of this as your verbal walkthrough. The AI treats concrete mechanisms (&ldquo;Kafka at 50k msg/s&rdquo;) as real evidence. Vague claims (&ldquo;it scales&rdquo;) earn no credit.</Tip>
          </div>
        </section>

        <Divider />

        {/* Section 8 — Pre-Submit Checklist */}
        <section>
          <div className="rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm p-8 shadow-md shadow-black/[0.04] dark:shadow-none space-y-4">
            <SectionHeading emoji="✅" title="Pre-Submit Checklist" />
            <ul className="space-y-3 text-base text-muted-foreground">
              {CHECKLIST.map((text, i) => (
                <motion.li key={text} className="flex items-start gap-2.5"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-violet-500" />
                  <span>{text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <Divider />

        {/* Example */}
        <section>
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">📋 See a Real Example</p>
            <p className="text-sm text-muted-foreground mb-4">
              View a completed system design with full AI review, responses, and re-evaluation.
            </p>
            <Link
              href="/library/multiplayer-online-game-matchmaking/69e9f217a0b69e6c9446a7ea"
              className="inline-flex items-center rounded-lg border border-violet-500/30 bg-violet-500/5 px-5 h-10 text-sm font-medium text-violet-400 transition-all hover:bg-violet-500/10 hover:border-violet-500/50"
            >
              View Example Design
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <Divider />

        {/* CTA */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.08] bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/3 dark:from-violet-500/10 dark:via-card dark:to-cyan-500/5 p-12 text-center">
            <ParticleBackground className="absolute inset-0" particleCount={20} />
            <div className="relative z-10 flex flex-col items-center gap-5">
              <p className="text-2xl font-bold font-heading">Ready to put this into practice?</p>
              <Link href="/canvas" className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-8 h-12 text-base font-medium text-white shadow-lg shadow-violet-500/25 shadow-[0_0_25px_oklch(0.72_0.25_285_/_25%)] transition-all hover:shadow-xl hover:shadow-[0_0_35px_oklch(0.72_0.25_285_/_40%)] hover:-translate-y-0.5">
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
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span className="text-muted-foreground/30">·</span>
          <a href="https://github.com/omsitapara98/drawlint.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
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
