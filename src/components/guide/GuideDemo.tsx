"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Sparkles,
  Circle,
  Loader2,
  CheckCircle2,
  Play,
  MessageSquare,
  Send,
  RefreshCw,
} from "lucide-react";

/* ───────────────────────── Types & constants ───────────────────────── */

type Stage =
  | "idle"
  | "fade-in"
  | "cursor-to-fr"
  | "type-fr"
  | "cursor-to-nfr"
  | "type-nfr"
  | "cursor-to-assumptions"
  | "type-assumptions"
  | "cursor-to-api"
  | "type-api"
  | "cursor-to-canvas"
  | "draw-entry"
  | "draw-services"
  | "draw-data"
  | "draw-arrows"
  | "trail-anim"
  | "cursor-to-button"
  | "click-button"
  | "analyzing"
  | "complete-header"
  | "complete-cards"
  | "complete-lead"
  | "hold-1"
  | "respond-nfr-arrow"
  | "respond-nfr-click"
  | "respond-nfr-typing"
  | "respond-nfr-evaluating"
  | "respond-nfr-verdict"
  | "respond-api-arrow"
  | "respond-api-click"
  | "respond-api-typing"
  | "respond-api-evaluating"
  | "respond-api-verdict"
  | "reeval-banner"
  | "reeval-arrow"
  | "reeval-click"
  | "reeval-running"
  | "reeval-complete"
  | "done";

// Absolute timeline (seconds) — when each stage BEGINS.
const STAGES: { stage: Stage; t: number }[] = [
  { stage: "fade-in", t: 0.0 },
  { stage: "cursor-to-fr", t: 0.8 },
  { stage: "type-fr", t: 1.0 },
  { stage: "cursor-to-nfr", t: 3.6 },
  { stage: "type-nfr", t: 3.8 },
  { stage: "cursor-to-assumptions", t: 5.9 },
  { stage: "type-assumptions", t: 6.1 },
  { stage: "cursor-to-api", t: 8.1 },
  { stage: "type-api", t: 8.3 },
  { stage: "cursor-to-canvas", t: 9.9 },
  { stage: "draw-entry", t: 10.5 },
  { stage: "draw-services", t: 12.7 },
  { stage: "draw-data", t: 14.0 },
  { stage: "draw-arrows", t: 15.2 },
  { stage: "trail-anim", t: 16.2 },
  { stage: "cursor-to-button", t: 17.4 },
  { stage: "click-button", t: 18.4 },
  { stage: "analyzing", t: 18.9 },
  { stage: "complete-header", t: 22.0 },
  { stage: "complete-cards", t: 22.6 },
  { stage: "complete-lead", t: 23.4 },
  { stage: "hold-1", t: 24.0 },
  { stage: "respond-nfr-arrow", t: 24.5 },
  { stage: "respond-nfr-click", t: 24.9 },
  { stage: "respond-nfr-typing", t: 25.4 },
  { stage: "respond-nfr-evaluating", t: 28.4 },
  { stage: "respond-nfr-verdict", t: 29.4 },
  { stage: "respond-api-arrow", t: 29.9 },
  { stage: "respond-api-click", t: 30.3 },
  { stage: "respond-api-typing", t: 30.8 },
  { stage: "respond-api-evaluating", t: 33.3 },
  { stage: "respond-api-verdict", t: 34.3 },
  { stage: "reeval-banner", t: 34.8 },
  { stage: "reeval-arrow", t: 35.3 },
  { stage: "reeval-click", t: 35.7 },
  { stage: "reeval-running", t: 35.8 },
  { stage: "reeval-complete", t: 37.2 },
  { stage: "done", t: 38.2 },
];

const FR_BULLETS = [
  "• Users can post a system design for AI review",
  "• 5 reviewers analyze NFR, Entities, Capacity, API, HLD",
  "• Reviewers return severity-tagged findings within 30s",
];
const FR_TEXT = FR_BULLETS.join("\n");

const NFR_TEXT =
  "• p99 latency < 300ms for review submissions\n• 99.9% uptime with graceful degradation\n• Support 10k concurrent active users";
const ASSUMPTIONS_TEXT =
  "• Reviewers are stateless LLM workers\n• Designs stored as JSON + Excalidraw scenes\n• Read-heavy workload (10:1 read/write)";
const API_TEXT =
  "POST /api/designs/{id}/review\nGET  /api/designs/{id}/feedback\nPOST /api/designs/{id}/respond";

const TYPE_DURATIONS = {
  fr: 2500,
  nfr: 1900,
  assumptions: 1900,
  api: 1500,
};

const NFR_RESPONSE =
  "We'll target p99 < 300ms based on similar design review systems. Will document SLA in NFR section.";
const API_RESPONSE =
  "We'll use URI versioning (/v1, /v2) and deprecate old versions with 6-month notice via response headers.";

const NFR_VERDICT_TEXT =
  "Clear SLA target with reasonable justification. Ready to be added to NFR section.";
const API_VERDICT_TEXT =
  "Good versioning approach. Consider also documenting backward compatibility policy.";

type VerdictKind = "resolved" | "partial" | "notAddressed";

const VERDICT_LABEL: Record<VerdictKind, string> = {
  resolved: "🟢 Resolved",
  partial: "🟡 Partially Addressed",
  notAddressed: "🔴 Not Addressed",
};

const VERDICT_STYLES: Record<VerdictKind, string> = {
  resolved:
    "bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-900 dark:text-green-200",
  partial:
    "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200",
  notAddressed:
    "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200",
};

const MOCK_REVIEW = {
  level: {
    label: "Senior (L5-L6)",
    classes:
      "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  },
  summary:
    "Solid foundation with clean separation of concerns. Caching and capacity assumptions need work.",
  dimensions: [
    {
      key: "nfrReview",
      emoji: "📋",
      label: "NFR Review",
      severity: "warning" as const,
      title: "Latency target not specified",
    },
    {
      key: "entitiesReview",
      emoji: "🗃️",
      label: "Core Entities Review",
      severity: "good" as const,
      title: "Clear entity boundaries",
    },
    {
      key: "capacityReview",
      emoji: "📊",
      label: "Capacity Review",
      severity: "critical" as const,
      title: "No back-of-envelope numbers",
    },
    {
      key: "apiReview",
      emoji: "🔌",
      label: "API Review",
      severity: "info" as const,
      title: "Consider versioning strategy",
    },
    {
      key: "hldReview",
      emoji: "🏗️",
      label: "HLD Review",
      severity: "strong" as const,
      title: "Stateless services enable easy scaling",
    },
  ],
  lead: {
    signal: "Lean Hire",
    signalAfterReeval: "Hire",
    summary:
      "Solid fundamentals. Address NFR latency target and capacity assumptions to clear the senior bar.",
    summaryAfterReeval:
      "Strong follow-through on NFR and API concerns. Capacity gap remains but the seniority signals are clear.",
  },
};

type Severity = "strong" | "good" | "critical" | "warning" | "info";

const SEVERITY_STYLES: Record<Severity, string> = {
  strong:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  good: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  critical:
    "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
};
const SEVERITY_BADGE: Record<Severity, string> = {
  strong: "bg-emerald-600 text-white",
  good: "bg-green-500 text-white",
  critical: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
};
const SEVERITY_LABEL: Record<Severity, string> = {
  strong: "⭐ Excellent",
  good: "✅ Good",
  critical: "critical",
  warning: "warning",
  info: "info",
};
const HIRE_SIGNAL_CLASS = "bg-emerald-400 text-white";
const LEAN_HIRE_SIGNAL_CLASS = "bg-yellow-400 text-white";

// 9-box layered architecture (entry / services / data).
type ArchNode = {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  layer: "entry" | "services" | "data";
};
const BOX_W = 64;
const BOX_H = 38;

const ENTRY_NODES: ArchNode[] = [
  { id: "client", label: "Client", icon: "🌐", x: 60, y: 30, layer: "entry" },
  { id: "cdn", label: "CDN", icon: "☁️", x: 208, y: 30, layer: "entry" },
  { id: "apigw", label: "API GW", icon: "🚪", x: 356, y: 30, layer: "entry" },
];
const SERVICE_NODES: ArchNode[] = [
  { id: "auth", label: "Auth", icon: "🔐", x: 60, y: 140, layer: "services" },
  { id: "review", label: "Review", icon: "🎯", x: 208, y: 140, layer: "services" },
  { id: "notif", label: "Notif", icon: "📨", x: 356, y: 140, layer: "services" },
];
const DATA_NODES: ArchNode[] = [
  { id: "pg", label: "Postgres", icon: "🐘", x: 60, y: 250, layer: "data" },
  { id: "redis", label: "Redis", icon: "🔴", x: 208, y: 250, layer: "data" },
  { id: "s3", label: "S3", icon: "📦", x: 356, y: 250, layer: "data" },
];
const ALL_NODES = [...ENTRY_NODES, ...SERVICE_NODES, ...DATA_NODES];

const LAYER_STROKE: Record<ArchNode["layer"], string> = {
  entry: "rgb(6,182,212)", // cyan-500
  services: "rgb(139,92,246)", // violet-500
  data: "rgb(245,158,11)", // amber-500
};

function nodeCenter(n: ArchNode) {
  return { cx: n.x + BOX_W / 2, cy: n.y + BOX_H / 2 };
}
function nodeBottom(n: ArchNode) {
  return { x: n.x + BOX_W / 2, y: n.y + BOX_H };
}
function nodeTop(n: ArchNode) {
  return { x: n.x + BOX_W / 2, y: n.y };
}

/* ───────────────────────── Hook: stage timeline ───────────────────────── */

function useTimeline(active: boolean, reset: number) {
  const [stage, setStage] = useState<Stage>("idle");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setStage("idle");

    if (!active) return;

    STAGES.forEach(({ stage: s, t }) => {
      const id = window.setTimeout(() => setStage(s), t * 1000);
      timersRef.current.push(id);
    });

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [active, reset]);

  return stage;
}

function stageIndex(s: Stage): number {
  return STAGES.findIndex((x) => x.stage === s);
}
function isAtOrAfter(current: Stage, target: Stage): boolean {
  const ci = stageIndex(current);
  const ti = stageIndex(target);
  if (ci === -1 || ti === -1) return false;
  return ci >= ti;
}

/* ───────────────────────── Sub-components ───────────────────────── */

function FauxBrowserChrome() {
  return (
    <div className="flex items-center gap-2 border-b border-border/70 dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.03] px-3 py-2">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
      </div>
      <div className="ml-2 flex-1 max-w-[260px]">
        <div className="rounded-md border border-border/70 dark:border-white/[0.08] bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          drawlint.ai/whiteboard
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  highlight = false,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border bg-background/70 px-2.5 py-2 ${
        highlight
          ? "border-violet-300 dark:border-violet-700/60 ring-1 ring-violet-300/30"
          : "border-border/70 dark:border-white/[0.06]"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function Typewriter({
  fullText,
  durationMs,
  active,
  done,
}: {
  fullText: string;
  durationMs: number;
  active: boolean;
  done: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (done) {
      setCount(fullText.length);
      return;
    }
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    const total = fullText.length;
    const step = Math.max(1, Math.floor(durationMs / total));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= total) window.clearInterval(id);
    }, step);
    return () => window.clearInterval(id);
  }, [active, done, fullText, durationMs]);

  const shown = fullText.slice(0, count);
  return (
    <pre className="whitespace-pre-wrap font-sans text-[10px] leading-snug text-foreground/90 m-0">
      {shown}
      {active && !done && (
        <motion.span
          className="inline-block w-[1px] h-3 bg-foreground align-middle ml-0.5"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      )}
    </pre>
  );
}

function LeftPane({ stage }: { stage: Stage }) {
  const frActive = stage === "type-fr";
  const frDone = isAtOrAfter(stage, "cursor-to-nfr");
  const nfrActive = stage === "type-nfr";
  const nfrDone = isAtOrAfter(stage, "cursor-to-assumptions");
  const assumpActive = stage === "type-assumptions";
  const assumpDone = isAtOrAfter(stage, "cursor-to-api");
  const apiActive = stage === "type-api";
  const apiDone = isAtOrAfter(stage, "cursor-to-canvas");

  const frHighlight = frActive || frDone;
  const nfrHighlight = nfrActive || nfrDone;
  const assumpHighlight = assumpActive || assumpDone;
  const apiHighlight = apiActive || apiDone;

  return (
    <div className="flex h-full flex-col gap-1.5 border-r border-border/70 dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.02] p-2">
      <SectionCard title="Functional Requirements" highlight={frHighlight}>
        <div className="min-h-[42px]">
          <Typewriter
            fullText={FR_TEXT}
            durationMs={TYPE_DURATIONS.fr}
            active={frActive}
            done={frDone}
          />
        </div>
      </SectionCard>
      <SectionCard title="Non-Functional" highlight={nfrHighlight}>
        <div className="min-h-[42px]">
          <Typewriter
            fullText={NFR_TEXT}
            durationMs={TYPE_DURATIONS.nfr}
            active={nfrActive}
            done={nfrDone}
          />
        </div>
      </SectionCard>
      <SectionCard title="Assumptions" highlight={assumpHighlight}>
        <div className="min-h-[42px]">
          <Typewriter
            fullText={ASSUMPTIONS_TEXT}
            durationMs={TYPE_DURATIONS.assumptions}
            active={assumpActive}
            done={assumpDone}
          />
        </div>
      </SectionCard>
      <SectionCard title="API Design" highlight={apiHighlight}>
        <div className="min-h-[42px]">
          <Typewriter
            fullText={API_TEXT}
            durationMs={TYPE_DURATIONS.api}
            active={apiActive}
            done={apiDone}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function ArchBox({
  node,
  reveal,
  delay,
}: {
  node: ArchNode;
  reveal: boolean;
  delay: number;
}) {
  const stroke = LAYER_STROKE[node.layer];
  return (
    <g>
      <motion.rect
        x={node.x}
        y={node.y}
        width={BOX_W}
        height={BOX_H}
        rx={6}
        ry={6}
        fill="transparent"
        stroke={stroke}
        strokeWidth={1.5}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: reveal ? 1 : 0,
          opacity: reveal ? 1 : 0,
        }}
        transition={{ duration: 0.9, delay, ease: "easeOut" }}
      />
      <motion.text
        x={node.x + 9}
        y={node.y + BOX_H / 2 + 3}
        className="fill-foreground"
        style={{ fontSize: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: reveal ? 1 : 0 }}
        transition={{ duration: 0.3, delay: delay + 0.7 }}
      >
        {node.icon}
      </motion.text>
      <motion.text
        x={node.x + 24}
        y={node.y + BOX_H / 2 + 3}
        className="fill-foreground"
        style={{ fontSize: 8.5, fontWeight: 500 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: reveal ? 1 : 0 }}
        transition={{ duration: 0.3, delay: delay + 0.7 }}
      >
        {node.label}
      </motion.text>
    </g>
  );
}

function ArchArrow({
  from,
  to,
  reveal,
  delay,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  reveal: boolean;
  delay: number;
}) {
  return (
    <motion.line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="rgb(148,163,184)"
      strokeWidth={1.1}
      markerEnd="url(#guide-demo-arrow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{
        pathLength: reveal ? 1 : 0,
        opacity: reveal ? 0.85 : 0,
      }}
      transition={{ duration: 0.45, delay }}
    />
  );
}

function RightPaneCanvas({ stage }: { stage: Stage }) {
  const showEntry = isAtOrAfter(stage, "draw-entry");
  const showServices = isAtOrAfter(stage, "draw-services");
  const showData = isAtOrAfter(stage, "draw-data");
  const showArrows = isAtOrAfter(stage, "draw-arrows");
  const showTrail = isAtOrAfter(stage, "trail-anim");

  const buttonPulse =
    isAtOrAfter(stage, "cursor-to-button") &&
    !isAtOrAfter(stage, "click-button");
  const buttonClicked = isAtOrAfter(stage, "click-button");

  // Trail path: Client → CDN → API GW → Review → Postgres
  const client = ENTRY_NODES[0];
  const cdn = ENTRY_NODES[1];
  const apigw = ENTRY_NODES[2];
  const review = SERVICE_NODES[1];
  const pg = DATA_NODES[0];

  const trailD = (() => {
    const p1 = { x: client.x + BOX_W, y: client.y + BOX_H / 2 };
    const p2 = { x: cdn.x, y: cdn.y + BOX_H / 2 };
    const p3 = { x: cdn.x + BOX_W, y: cdn.y + BOX_H / 2 };
    const p4 = { x: apigw.x, y: apigw.y + BOX_H / 2 };
    const p5 = nodeBottom(apigw);
    const p6 = nodeTop(review);
    const p7 = nodeBottom(review);
    const p8 = nodeTop(pg);
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} M ${p3.x} ${p3.y} L ${p4.x} ${p4.y} M ${p5.x} ${p5.y} L ${p6.x} ${p6.y} M ${p7.x} ${p7.y} L ${p8.x} ${p8.y}`;
  })();

  return (
    <div className="relative flex h-full flex-col bg-background/50">
      <div className="flex-1 p-2">
        <svg viewBox="0 0 480 320" className="h-full w-full">
          <defs>
            <marker
              id="guide-demo-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(148,163,184)" />
            </marker>
          </defs>

          {/* Entry layer */}
          {ENTRY_NODES.map((n, i) => (
            <ArchBox
              key={n.id}
              node={n}
              reveal={showEntry}
              delay={showEntry ? i * 0.6 : 0}
            />
          ))}
          {/* Services layer */}
          {SERVICE_NODES.map((n, i) => (
            <ArchBox
              key={n.id}
              node={n}
              reveal={showServices}
              delay={showServices ? i * 0.4 : 0}
            />
          ))}
          {/* Data layer */}
          {DATA_NODES.map((n, i) => (
            <ArchBox
              key={n.id}
              node={n}
              reveal={showData}
              delay={showData ? i * 0.4 : 0}
            />
          ))}

          {/* Arrows: entry chain */}
          <ArchArrow
            from={{ x: client.x + BOX_W, y: client.y + BOX_H / 2 }}
            to={{ x: cdn.x, y: cdn.y + BOX_H / 2 }}
            reveal={showArrows}
            delay={0.0}
          />
          <ArchArrow
            from={{ x: cdn.x + BOX_W, y: cdn.y + BOX_H / 2 }}
            to={{ x: apigw.x, y: apigw.y + BOX_H / 2 }}
            reveal={showArrows}
            delay={0.1}
          />

          {/* API GW fanout to services */}
          <ArchArrow
            from={nodeBottom(apigw)}
            to={nodeTop(SERVICE_NODES[0])}
            reveal={showArrows}
            delay={0.25}
          />
          <ArchArrow
            from={nodeBottom(apigw)}
            to={nodeTop(SERVICE_NODES[1])}
            reveal={showArrows}
            delay={0.3}
          />
          <ArchArrow
            from={nodeBottom(apigw)}
            to={nodeTop(SERVICE_NODES[2])}
            reveal={showArrows}
            delay={0.35}
          />

          {/* Services to data */}
          <ArchArrow
            from={nodeBottom(SERVICE_NODES[0])}
            to={nodeTop(DATA_NODES[0])}
            reveal={showArrows}
            delay={0.5}
          />
          <ArchArrow
            from={nodeBottom(SERVICE_NODES[1])}
            to={nodeTop(DATA_NODES[0])}
            reveal={showArrows}
            delay={0.55}
          />
          <ArchArrow
            from={nodeBottom(SERVICE_NODES[1])}
            to={nodeTop(DATA_NODES[1])}
            reveal={showArrows}
            delay={0.6}
          />
          <ArchArrow
            from={nodeBottom(SERVICE_NODES[2])}
            to={nodeTop(DATA_NODES[1])}
            reveal={showArrows}
            delay={0.65}
          />
          <ArchArrow
            from={nodeBottom(SERVICE_NODES[2])}
            to={nodeTop(DATA_NODES[2])}
            reveal={showArrows}
            delay={0.7}
          />

          {/* Request trail (dashed violet) */}
          <motion.path
            d={trailD}
            fill="none"
            stroke="rgb(139,92,246)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: showTrail ? 1 : 0,
              opacity: showTrail ? 0.55 : 0,
            }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

        </svg>
      </div>

      {/* Action button bottom-right */}
      <div className="absolute bottom-3 right-3">
        <motion.div
          className={`relative rounded-md px-3 py-1.5 text-[11px] font-semibold text-white shadow ${
            buttonClicked
              ? "bg-violet-700"
              : "bg-gradient-to-r from-violet-500 to-violet-600"
          }`}
          animate={
            buttonPulse
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(139,92,246,0.4)",
                    "0 0 0 8px rgba(139,92,246,0)",
                  ],
                }
              : {}
          }
          transition={
            buttonPulse ? { repeat: Infinity, duration: 1.2 } : {}
          }
        >
          Post for AI Review
        </motion.div>
      </div>
    </div>
  );
}

type ProgressStatus = "pending" | "active" | "done";

function ReviewerProgressRow({
  emoji,
  label,
  status,
}: {
  emoji: string;
  label: string;
  status: ProgressStatus;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex h-4 w-4 items-center justify-center">
        {status === "pending" && (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        {status === "active" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
        )}
        {status === "done" && (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        )}
      </div>
      <span className="text-sm">{emoji}</span>
      <span className="flex-1 text-[11px] text-foreground">{label}</span>
      <span
        className={`text-[10px] ${
          status === "done"
            ? "text-green-600 dark:text-green-400"
            : status === "active"
              ? "text-violet-600 dark:text-violet-400"
              : "text-muted-foreground/60"
        }`}
      >
        {status === "done"
          ? "done"
          : status === "active"
            ? "analyzing…"
            : "pending"}
      </span>
    </div>
  );
}

function AnalyzingCard({ phaseT }: { phaseT: number }) {
  function statusFor(idx: number): ProgressStatus {
    const activeStart = idx * 0.5;
    const doneAt = activeStart + 0.5;
    if (phaseT >= doneAt) return "done";
    if (phaseT >= activeStart) return "active";
    return "pending";
  }

  return (
    <div className="rounded-lg border border-border/70 dark:border-white/[0.08] bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
        <span className="text-[11px] font-semibold">
          Analyzing your design…
        </span>
      </div>
      <div className="space-y-0.5">
        {MOCK_REVIEW.dimensions.map((d, i) => (
          <ReviewerProgressRow
            key={d.key}
            emoji={d.emoji}
            label={d.label}
            status={statusFor(i)}
          />
        ))}
      </div>
    </div>
  );
}

function RespondBlock({
  responseText,
  responseDurationMs,
  verdictKind,
  verdictText,
  typingActive,
  typingDone,
  evaluating,
  showVerdict,
}: {
  responseText: string;
  responseDurationMs: number;
  verdictKind: VerdictKind;
  verdictText: string;
  typingActive: boolean;
  typingDone: boolean;
  evaluating: boolean;
  showVerdict: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.3 }}
      className="mt-1.5 space-y-1 overflow-hidden"
    >
      <AnimatePresence initial={false}>
        {!showVerdict && (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-1 overflow-hidden"
          >
            <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-2.5 w-2.5" />
              Your response
            </div>
            <div className="rounded border border-border/60 bg-background/80 px-1.5 py-1 min-h-[26px]">
              <Typewriter
                fullText={responseText}
                durationMs={responseDurationMs}
                active={typingActive}
                done={typingDone}
              />
            </div>
            <div className="flex justify-end">
              <div
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  evaluating
                    ? "bg-violet-500/80 text-white"
                    : "bg-violet-600 text-white"
                }`}
              >
                {evaluating ? (
                  <>
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Evaluating…
                  </>
                ) : (
                  <>
                    <Send className="h-2.5 w-2.5" />
                    Submit
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showVerdict && (
          <motion.div
            key="verdict"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={`mt-1 rounded border px-1.5 py-1 ${VERDICT_STYLES[verdictKind]}`}
          >
            <div className="text-[9px] font-semibold">
              {VERDICT_LABEL[verdictKind]}
            </div>
            <div className="mt-1 rounded border border-border/40 bg-background/60 px-1.5 py-0.5 text-[9px] italic leading-snug text-foreground/70">
              “{responseText}”
            </div>
            <div className="mt-1 text-[9px] leading-snug">{verdictText}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SparkleBurst() {
  // 4 dots radiating from center of pill
  const dots = [
    { dx: -10, dy: -10 },
    { dx: 10, dy: -10 },
    { dx: -10, dy: 10 },
    { dx: 10, dy: 10 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 h-1 w-1 rounded-full bg-emerald-400"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: d.dx,
            y: d.dy,
            opacity: 0,
            scale: 1.4,
          }}
          transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

function ReviewPanelOverlay({
  stage,
  analyzingPhaseT,
}: {
  stage: Stage;
  analyzingPhaseT: number;
}) {
  const visible = isAtOrAfter(stage, "analyzing");
  const showComplete = isAtOrAfter(stage, "complete-header");
  const showCards = isAtOrAfter(stage, "complete-cards");
  const showLead = isAtOrAfter(stage, "complete-lead");

  // Respond-state derivations
  const nfrRespondVisible = isAtOrAfter(stage, "respond-nfr-click");
  const nfrTypingActive = stage === "respond-nfr-typing";
  const nfrTypingDone = isAtOrAfter(stage, "respond-nfr-evaluating");
  const nfrEvaluating = stage === "respond-nfr-evaluating";
  const nfrVerdictShow = isAtOrAfter(stage, "respond-nfr-verdict");

  const apiRespondVisible = isAtOrAfter(stage, "respond-api-click");
  const apiTypingActive = stage === "respond-api-typing";
  const apiTypingDone = isAtOrAfter(stage, "respond-api-evaluating");
  const apiEvaluating = stage === "respond-api-evaluating";
  const apiVerdictShow = isAtOrAfter(stage, "respond-api-verdict");

  const reevalBannerVisible =
    isAtOrAfter(stage, "reeval-banner") &&
    !isAtOrAfter(stage, "reeval-running");
  const reevalRunning =
    isAtOrAfter(stage, "reeval-running") &&
    !isAtOrAfter(stage, "reeval-complete");
  const reevalComplete = isAtOrAfter(stage, "reeval-complete");

  const [sparkleOn, setSparkleOn] = useState(false);
  useEffect(() => {
    if (reevalComplete) {
      setSparkleOn(true);
      const id = window.setTimeout(() => setSparkleOn(false), 1100);
      return () => window.clearTimeout(id);
    }
    setSparkleOn(false);
  }, [reevalComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="review-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          className="absolute right-0 top-0 z-20 h-full w-[58%] border-l border-border/70 dark:border-white/[0.08] bg-background/95 backdrop-blur-md p-3 overflow-y-auto"
        >
          {!showComplete && <AnalyzingCard phaseT={analyzingPhaseT} />}

          {showComplete && (
            <div className="space-y-2 pb-1">
              {/* Re-evaluate banner */}
              <AnimatePresence>
                {(reevalBannerVisible || reevalRunning) && (
                  <motion.div
                    key="reeval-banner"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="sticky top-0 z-10 rounded-md border border-violet-300/60 dark:border-violet-700/60 bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-violet-950/40 dark:to-emerald-950/40 backdrop-blur-sm px-2 py-1.5"
                  >
                    {reevalRunning ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Re-evaluating with your responses…
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
                          <Sparkles className="h-3 w-3" />
                          ✨ 2 responses ready
                        </div>
                        <div className="inline-flex items-center gap-1 rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          <RefreshCw className="h-2.5 w-2.5" />
                          Re-evaluate
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-lg border border-border/70 dark:border-white/[0.08] bg-card p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    AI Review
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold ${MOCK_REVIEW.level.classes}`}
                  >
                    {MOCK_REVIEW.level.label}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-foreground/80">
                  {MOCK_REVIEW.summary}
                </p>
              </motion.div>

              {showCards && (
                <div className="space-y-1.5">
                  {MOCK_REVIEW.dimensions.map((d, i) => {
                    const isNFR = d.key === "nfrReview";
                    const isAPI = d.key === "apiReview";
                    const isResolvedCard = isNFR && nfrVerdictShow;
                    const cardClasses = isResolvedCard
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-foreground"
                      : SEVERITY_STYLES[d.severity];
                    const badgeClasses = isResolvedCard
                      ? "bg-emerald-500 text-white"
                      : SEVERITY_BADGE[d.severity];
                    const badgeLabel = isResolvedCard
                      ? "resolved"
                      : SEVERITY_LABEL[d.severity];
                    const titleClasses = isResolvedCard
                      ? "line-through opacity-60"
                      : "";
                    return (
                      <motion.div
                        key={d.key}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.12 }}
                        className={`rounded-md border px-2 py-1.5 ${cardClasses}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{d.emoji}</span>
                          <span className="text-[10px] font-semibold">
                            {d.label}
                          </span>
                          <span
                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase ${badgeClasses}`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 text-[9px] leading-snug ${titleClasses}`}
                        >
                          {d.title}
                        </p>

                        {isNFR && nfrRespondVisible && (
                          <RespondBlock
                            responseText={NFR_RESPONSE}
                            responseDurationMs={3000}
                            verdictKind="resolved"
                            verdictText={NFR_VERDICT_TEXT}
                            typingActive={nfrTypingActive}
                            typingDone={nfrTypingDone}
                            evaluating={nfrEvaluating}
                            showVerdict={nfrVerdictShow}
                          />
                        )}
                        {isAPI && apiRespondVisible && (
                          <RespondBlock
                            responseText={API_RESPONSE}
                            responseDurationMs={2500}
                            verdictKind="partial"
                            verdictText={API_VERDICT_TEXT}
                            typingActive={apiTypingActive}
                            typingDone={apiTypingDone}
                            evaluating={apiEvaluating}
                            showVerdict={apiVerdictShow}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {showLead && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="sticky bottom-0 z-10 rounded-lg border border-border/70 dark:border-white/[0.08] bg-card/95 backdrop-blur-sm shadow-sm ring-1 ring-violet-500/10 p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🎯</span>
                    <span className="text-[10px] font-semibold">
                      Lead Reviewer
                    </span>
                    <span
                      className={`ml-auto inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold transition-all duration-300 ${LEAN_HIRE_SIGNAL_CLASS} ${
                        reevalComplete ? "opacity-50 line-through" : ""
                      }`}
                    >
                      {MOCK_REVIEW.lead.signal}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-foreground/80">
                    {MOCK_REVIEW.lead.summary}
                  </p>
                  <AnimatePresence>
                    {reevalComplete && (
                      <motion.div
                        key="after-responses"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="mt-1.5 flex items-center justify-between gap-2 rounded border border-violet-200/60 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 px-1.5 py-1"
                      >
                        <span className="text-[8px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                          After Responses
                        </span>
                        <div className="relative">
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 320,
                              damping: 22,
                            }}
                            className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${HIRE_SIGNAL_CLASS}`}
                          >
                            {MOCK_REVIEW.lead.signalAfterReeval}
                          </motion.span>
                          {sparkleOn && <SparkleBurst />}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Main component ───────────────────────── */

export default function GuideDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [userOptedIn, setUserOptedIn] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Sync tour active state from document attribute.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Set initial value.
    setTourActive(document.documentElement.dataset.landingTourActive === "true");
    // Observe mutations on the attribute.
    const observer = new MutationObserver(() => {
      setTourActive(document.documentElement.dataset.landingTourActive === "true");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-landing-tour-active"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || reducedMotion) return;
    const node = containerRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.4) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: [0.4] },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [reducedMotion]);

  const playbackActive = ((inView && !reducedMotion) || userOptedIn) && !tourActive;
  const stage = useTimeline(playbackActive, resetKey);

  const [analyzingPhaseT, setAnalyzingPhaseT] = useState(0);
  useEffect(() => {
    if (stage !== "analyzing") {
      if (isAtOrAfter(stage, "complete-header")) setAnalyzingPhaseT(3);
      else setAnalyzingPhaseT(0);
      return;
    }
    setAnalyzingPhaseT(0);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      setAnalyzingPhaseT(Math.min(elapsed, 3));
      if (elapsed < 3) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const playing = playbackActive && stage !== "idle" && stage !== "done";

  function handleReplay() {
    if (playing) return;
    if (reducedMotion) {
      setUserOptedIn(true);
    } else {
      setInView(true);
    }
    setResetKey((k) => k + 1);
  }

  function handlePlayClick() {
    setUserOptedIn(true);
    setResetKey((k) => k + 1);
  }

  const showPlayOverlay = reducedMotion && !userOptedIn;
  const showReplay = !showPlayOverlay;

  return (
    <>
      {/* Mobile notice */}
      <div className="sm:hidden rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 p-4 text-center text-sm text-muted-foreground">
        📺 Watch the interactive demo on a larger screen.
      </div>

      {/* Demo */}
      <div className="hidden sm:block">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-semibold">
              Watch DrawLint in 30 seconds
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              From blank canvas to AI review — the full flow.
            </p>
          </div>
          {showReplay && (
            <button
              type="button"
              aria-label="Replay demo"
              onClick={handleReplay}
              disabled={playing}
              className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm transition ${
                playing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-background hover:shadow"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          role="img"
          aria-label="Animated demo of the DrawLint design review flow"
          className="relative rounded-2xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 backdrop-blur-sm shadow-md shadow-black/[0.04] dark:shadow-none overflow-hidden"
        >
          <FauxBrowserChrome />

          <div className="relative w-full aspect-[16/10] bg-background/40">
            <motion.div
              key={resetKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === "idle" ? 0 : 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0 grid grid-cols-[40%_60%]">
                <LeftPane stage={stage} />
                <RightPaneCanvas stage={stage} />
              </div>
              <ReviewPanelOverlay
                stage={stage}
                analyzingPhaseT={analyzingPhaseT}
              />
            </motion.div>

            {showPlayOverlay && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px]">
                <button
                  type="button"
                  aria-label="Play demo"
                  onClick={handlePlayClick}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play demo
                </button>
                <p className="max-w-xs px-3 text-center text-xs text-muted-foreground">
                  Animation paused for accessibility — click to play.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
