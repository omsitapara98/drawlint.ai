"use client";

import { useState } from "react";
import type { ReviewDimension, ReviewHighlight, FeedbackItem, LeadReviewer, ReviewLevel } from "@/types/feedback";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Activity,
  Target,
  Layers,
  HelpCircle,
} from "lucide-react";

/* ── Style constants ─────────────────────────────────────────── */

const SEVERITY_STYLES: Record<string, string> = {
  strong: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  good: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
};

const SEVERITY_LABEL: Record<string, string> = {
  strong: "⭐ Excellent",
  good: "✅ Good",
  critical: "critical",
  warning: "warning",
  info: "info",
};

const SIGNAL_STYLES: Record<string, string> = {
  "strong-hire": "bg-emerald-500 text-white",
  hire: "bg-emerald-400 text-white",
  "lean-hire": "bg-yellow-400 text-yellow-900",
  "lean-no-hire": "bg-orange-400 text-white",
  "no-hire": "bg-red-500 text-white",
};

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire",
  hire: "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  mid: "Mid (L4-L5)",
  senior: "Senior (L5-L6)",
  staff: "Staff (L6+)",
  deep: "Deep Analysis",
};

const DIMENSION_META: Record<string, { icon: React.ReactNode; label: string; emoji: string }> = {
  nfrReview: { icon: <Layers className="h-4 w-4" />, label: "NFR Review", emoji: "📋" },
  entitiesReview: { icon: <Target className="h-4 w-4" />, label: "Core Entities Review", emoji: "🗃️" },
  capacityReview: { icon: <Activity className="h-4 w-4" />, label: "Capacity Review", emoji: "📊" },
  apiReview: { icon: <Zap className="h-4 w-4" />, label: "API Review", emoji: "🔌" },
  hldReview: { icon: <Activity className="h-4 w-4" />, label: "HLD Review", emoji: "🏗️" },
};

/* ── Sub-components ──────────────────────────────────────────── */

function HighlightRow({ highlight }: { highlight: ReviewHighlight }) {
  return (
    <div className={`rounded-lg border p-3 ${SEVERITY_STYLES[highlight.severity] ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-[0.65rem] font-bold uppercase tracking-wider">
          {SEVERITY_LABEL[highlight.severity] ?? highlight.severity}
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold">{highlight.title}</p>
      <p className="mt-0.5 text-xs opacity-80">{highlight.description}</p>
    </div>
  );
}

function IssueRow({ issue }: { issue: FeedbackItem }) {
  return (
    <div className={`rounded-lg border p-3 ${SEVERITY_STYLES[issue.severity] ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-[0.65rem] font-bold uppercase tracking-wider">
          {SEVERITY_LABEL[issue.severity] ?? issue.severity}
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold">{issue.title}</p>
      <p className="mt-0.5 text-xs opacity-80">{issue.description}</p>
    </div>
  );
}

function DimensionCard({ name, dimension }: { name: string; dimension: ReviewDimension }) {
  const [expanded, setExpanded] = useState(true);
  const meta = DIMENSION_META[name] ?? { icon: null, label: name, emoji: "" };
  const hasContent = dimension.highlights.length > 0 || dimension.issues.length > 0;

  return (
    <Card>
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          {meta.icon}
          <span className="text-sm font-semibold">{meta.label}</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && hasContent && (
        <CardContent className="pt-0 pb-3">
          <div className="space-y-2">
            {dimension.highlights.map((h, i) => (
              <HighlightRow key={`h-${i}`} highlight={h} />
            ))}
            {dimension.issues.map((issue, i) => (
              <IssueRow key={`i-${i}`} issue={issue} />
            ))}
          </div>
        </CardContent>
      )}
      {expanded && !hasContent && (
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground italic">No issues found — looks good! ✅</p>
        </CardContent>
      )}
    </Card>
  );
}

/* ── Main component ──────────────────────────────────────────── */

interface ReviewPanelProps {
  review: {
    level: ReviewLevel;
    summary: string;
    nfrReview: ReviewDimension;
    entitiesReview: ReviewDimension;
    capacityReview: ReviewDimension;
    apiReview: ReviewDimension;
    hldReview: ReviewDimension;
    leadReviewer: LeadReviewer;
    followUpQuestions: string[];
  };
}

const DIMENSIONS = ["nfrReview", "entitiesReview", "capacityReview", "apiReview", "hldReview"] as const;

export default function ReviewPanel({ review }: ReviewPanelProps) {
  return (
    <div className="space-y-4 p-4">
      {/* Level + Signal */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">
          {LEVEL_LABELS[review.level] ?? review.level}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            SIGNAL_STYLES[review.leadReviewer.signal] ?? ""
          }`}
        >
          {SIGNAL_LABELS[review.leadReviewer.signal] ?? review.leadReviewer.signal}
        </span>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-muted/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
        <p className="text-sm">{review.summary}</p>
      </div>

      {/* Lead Reviewer */}
      <Card>
        <div className="px-4 py-3">
          <p className="text-sm font-semibold">🎯 Lead Reviewer</p>
        </div>
        <CardContent className="pt-0 pb-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Signal Reason</p>
            <p className="mt-0.5 text-sm">{review.leadReviewer.signalReason}</p>
          </div>
          {review.leadReviewer.topStrengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Top Strengths</p>
              <ul className="mt-1 space-y-1">
                {review.leadReviewer.topStrengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground">✅ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {review.leadReviewer.topRisks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400">Top Risks</p>
              <ul className="mt-1 space-y-1">
                {review.leadReviewer.topRisks.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground">⚠️ {r}</li>
                ))}
              </ul>
            </div>
          )}
          {review.leadReviewer.improvementAreas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Improvement Areas</p>
              <ul className="mt-1 space-y-1">
                {review.leadReviewer.improvementAreas.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground">💡 {a}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimension Cards */}
      {DIMENSIONS.map((dim) => (
        <DimensionCard
          key={dim}
          name={dim}
          dimension={review[dim]}
        />
      ))}

      {/* Follow-up Questions */}
      {review.followUpQuestions.length > 0 && (
        <Card>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Follow-up Questions</p>
            </div>
          </div>
          <CardContent className="pt-0 pb-3">
            <ul className="space-y-2">
              {review.followUpQuestions.map((q, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {i + 1}. {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
