"use client";

import { useState } from "react";

import type { AIReviewResponse, AnalysisStatus, FeedbackItem, ReviewHighlight, ReviewDimension, ReviewLevel, ReviewerProgress, ReviewerKey, ReviewerStatus } from "@/types/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  HelpCircle,
  Zap,
  Activity,
  Target,
  Layers,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  XCircle,
  Circle,
} from "lucide-react";

interface FeedbackPanelProps {
  aiReview?: AIReviewResponse | null;
  aiStatus?: AnalysisStatus;
  aiError?: string;
  reviewerProgress?: ReviewerProgress;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  strong: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  good: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
};

const SEVERITY_BADGE: Record<string, string> = {
  strong: "bg-emerald-600 text-white",
  good: "bg-green-500 text-white",
  critical: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
};

const SEVERITY_LABEL: Record<string, string> = {
  strong: "⭐ Excellent",
  good: "✅ Good",
  critical: "critical",
  warning: "warning",
  info: "info",
};

/* ── Dimension Card ──────────────────────────────────────────── */

const DIMENSION_META: Record<string, { icon: React.ReactNode; label: string; emoji: string }> = {
  nfrReview: { icon: <Layers className="h-4 w-4" />, label: "NFR Review", emoji: "📋" },
  entitiesReview: { icon: <Target className="h-4 w-4" />, label: "Core Entities Review", emoji: "🗃️" },
  capacityReview: { icon: <Activity className="h-4 w-4" />, label: "Capacity Review", emoji: "📊" },
  apiReview: { icon: <Zap className="h-4 w-4" />, label: "API Review", emoji: "🔌" },
  hldReview: { icon: <Activity className="h-4 w-4" />, label: "HLD Review", emoji: "🏗️" },
};

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  mid: "Mid (L4-L5)",
  senior: "Senior (L5-L6)",
  staff: "Staff (L6+)",
  deep: "Deep Analysis",
};

const LEVEL_COLORS: Record<ReviewLevel, string> = {
  mid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  senior: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  staff: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  deep: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

const SIGNAL_STYLES: Record<string, string> = {
  "strong-hire": "bg-emerald-500 text-white",
  "hire": "bg-emerald-400 text-white",
  "lean-hire": "bg-yellow-400 text-yellow-900",
  "lean-no-hire": "bg-orange-400 text-white",
  "no-hire": "bg-red-500 text-white",
};

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire",
  "hire": "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

// All 4 section reviewers always shown at every level
const SECTION_DIMENSIONS = ["nfrReview", "entitiesReview", "capacityReview", "apiReview", "hldReview"] as const;

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
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
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

function HighlightRow({ highlight }: { highlight: ReviewHighlight }) {
  return (
    <div className={`rounded-lg border p-3 ${SEVERITY_STYLES[highlight.severity] ?? ""}`}>
      <div className="flex items-start gap-2">
        <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${SEVERITY_BADGE[highlight.severity] ?? ""}`}>
          {SEVERITY_LABEL[highlight.severity] ?? highlight.severity}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium">{highlight.title}</p>
          <p className="mt-1 text-xs opacity-80">{highlight.description}</p>
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: FeedbackItem }) {
  return (
    <div className={`rounded-lg border p-3 ${SEVERITY_STYLES[issue.severity] ?? ""}`}>
      <div className="flex items-start gap-2">
        <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${SEVERITY_BADGE[issue.severity] ?? ""}`}>
          {SEVERITY_LABEL[issue.severity] ?? issue.severity}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium">{issue.title}</p>
          <p className="mt-1 text-xs opacity-80">{issue.description}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Reviewer Progress Row ────────────────────────────────────── */

const REVIEWER_ORDER: { key: ReviewerKey; label: string; emoji: string }[] = [
  { key: "nfrReview", label: "NFR Review", emoji: "📋" },
  { key: "entitiesReview", label: "Core Entities Review", emoji: "🗃️" },
  { key: "capacityReview", label: "Capacity Review", emoji: "📊" },
  { key: "apiReview", label: "API Review", emoji: "🔌" },
  { key: "hldReview", label: "HLD Review", emoji: "🏗️" },
  { key: "leadReviewer", label: "Lead Reviewer", emoji: "🎯" },
];

function ReviewerStatusIcon({ status }: { status: ReviewerStatus }) {
  switch (status) {
    case "analyzing":
      return <Loader2 className="h-4 w-4 animate-spin text-violet-500" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40" />;
  }
}

function ReviewerStatusLabel({ status }: { status: ReviewerStatus }) {
  switch (status) {
    case "analyzing":
      return <span className="text-xs text-violet-600 dark:text-violet-400">Analyzing…</span>;
    case "done":
      return <span className="text-xs text-emerald-600 dark:text-emerald-400">Done</span>;
    case "error":
      return <span className="text-xs text-red-600 dark:text-red-400">Failed</span>;
    default:
      return <span className="text-xs text-muted-foreground">Pending</span>;
  }
}

/* ── AI Review Tab Content ───────────────────────────────────── */

function AIReviewContent({
  review,
  status,
  error,
  reviewerProgress,
  onRetry,
  onOpenSettings,
  hasBYOKey,
}: {
  review: AIReviewResponse | null;
  status: AnalysisStatus;
  error?: string;
  reviewerProgress?: ReviewerProgress;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  hasBYOKey: boolean;
}) {
  // No BYO key configured
  if (!hasBYOKey && status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
          <Settings className="h-8 w-8 text-violet-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">AI Review Available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your Azure OpenAI API key in Settings to get an AI-powered 5-reviewer analysis of your design.
          </p>
        </div>
        {onOpenSettings && (
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Open Settings
          </Button>
        )}
      </div>
    );
  }

  // Loading — per-reviewer progress
  if (status === "analyzing") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-8">
        <div className="text-center">
          <p className="text-sm font-medium">Analyzing your design…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            AI reviewers are evaluating your design
          </p>
        </div>
        <Card className="w-full max-w-xs">
          <CardContent className="py-3">
            <div className="space-y-2">
              {REVIEWER_ORDER.map(({ key, label, emoji }) => {
                const s = reviewerProgress?.[key] ?? "pending";
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <ReviewerStatusIcon status={s} />
                    <span className="text-sm flex-1">
                      {emoji} {label}
                    </span>
                    <ReviewerStatusLabel status={s} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-3xl">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Analysis Failed</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {error ?? "An unexpected error occurred."}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry Analysis
          </Button>
        )}
      </div>
    );
  }

  // Complete — show review
  if (!review) return null;

  const level = review.level ?? "deep";

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
        {/* Level + Summary Header */}
        <Card>
          <CardContent className="py-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  AI Review
                </span>
                <Badge className={`text-[10px] px-2 py-0 ${LEVEL_COLORS[level]}`}>
                  {LEVEL_LABELS[level]}
                </Badge>
              </div>
              <p className="text-sm text-foreground">{review.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Section Reviewer Cards — always all 4 */}
        {SECTION_DIMENSIONS.map((dim) => (
          <DimensionCard key={dim} name={dim} dimension={review[dim]} />
        ))}

        {/* Lead Reviewer Card */}
        {review.leadReviewer && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🎯 Lead Reviewer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hire Signal */}
              <div className="flex items-center gap-3">
                <Badge className={`text-sm px-3 py-1 font-bold ${SIGNAL_STYLES[review.leadReviewer.signal] ?? "bg-gray-400 text-white"}`}>
                  {SIGNAL_LABELS[review.leadReviewer.signal] ?? review.leadReviewer.signal}
                </Badge>
                {review.leadReviewer.signalReason && (
                  <p className="text-xs text-muted-foreground flex-1">{review.leadReviewer.signalReason}</p>
                )}
              </div>

              {/* Top Strengths */}
              {review.leadReviewer.topStrengths.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top Strengths
                  </h4>
                  <div className="space-y-1">
                    {review.leadReviewer.topStrengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Risks */}
              {review.leadReviewer.topRisks.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top Risks
                  </h4>
                  <div className="space-y-1">
                    {review.leadReviewer.topRisks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertOctagon className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvement Areas */}
              {review.leadReviewer.improvementAreas.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Areas to Improve
                  </h4>
                  <div className="space-y-1">
                    {review.leadReviewer.improvementAreas.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Follow-up Questions */}
        {review.followUpQuestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Follow-up Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {review.followUpQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-foreground">
                    {q}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
/* ── Main FeedbackPanel ──────────────────────────────────────── */

export function FeedbackPanel({
  aiReview,
  aiStatus = "idle",
  aiError,
  reviewerProgress,
  onRetry,
  onOpenSettings,
}: FeedbackPanelProps) {
  const hasBYOKey = (() => {
    try {
      const raw = localStorage.getItem("drawlint:byo-key");
      if (!raw) return false;
      const config = JSON.parse(raw) as { apiKey?: string };
      return !!config.apiKey;
    } catch {
      return false;
    }
  })();

  return (
    <AIReviewContent
      review={aiReview ?? null}
      status={aiStatus}
      error={aiError}
      reviewerProgress={reviewerProgress}
      onRetry={onRetry}
      onOpenSettings={onOpenSettings}
      hasBYOKey={hasBYOKey}
    />
  );
}
