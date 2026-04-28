"use client";

import { useCallback, useEffect, useState } from "react";

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
  MessageSquare,
  Send,
} from "lucide-react";

/* ── Response types ──────────────────────────────────────────── */

interface StoredResponse {
  section: string;
  issueIndex: number;
  userResponse: string;
  verdict: "resolved" | "partially-addressed" | "not-addressed";
  explanation: string;
}

interface FeedbackPanelProps {
  aiReview?: AIReviewResponse | null;
  aiStatus?: AnalysisStatus;
  aiError?: string;
  reviewerProgress?: ReviewerProgress;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  designId?: string | null;
  isAuthor?: boolean;
  /** Pre-loaded responses from initial design fetch */
  initialResponses?: { section: string; issueIndex: number; userResponse: string; verdict: string; explanation: string }[];
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

function DimensionCard({
  name,
  dimension,
  designId,
  canRespond,
  responses,
  onRespond,
  forceExpanded,
}: {
  name: string;
  dimension: ReviewDimension;
  designId?: string | null;
  canRespond?: boolean;
  responses: Map<string, StoredResponse>;
  onRespond?: (section: string, issueIndex: number, text: string) => Promise<StoredResponse | null>;
  forceExpanded?: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(true);

  // Sync with global collapse/expand
  useEffect(() => {
    if (forceExpanded !== undefined) setLocalExpanded(forceExpanded);
  }, [forceExpanded]);

  const expanded = localExpanded;
  const meta = DIMENSION_META[name] ?? { icon: null, label: name, emoji: "" };
  const hasContent = dimension.highlights.length > 0 || dimension.issues.length > 0;

  return (
    <Card>
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setLocalExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          {meta.icon}
          <span className="text-sm font-semibold">{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Count badges when collapsed */}
          {!expanded && (
            <>
              {dimension.highlights.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
                  ✓ {dimension.highlights.length}
                </span>
              )}
              {(() => {
                // Exclude resolved issues from counts
                const unresolvedIssues = dimension.issues.filter((_: unknown, i: number) => responses.get(`${name}:${i}`)?.verdict !== "resolved");
                const resolvedCount = dimension.issues.length - unresolvedIssues.length;
                const criticals = unresolvedIssues.filter((i) => i.severity === "critical").length;
                const warnings = unresolvedIssues.filter((i) => i.severity === "warning").length;
                const infos = unresolvedIssues.filter((i) => i.severity === "info").length;
                return (
                  <>
                    {criticals > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-medium text-red-700 dark:text-red-300">
                        {criticals} critical
                      </span>
                    )}
                    {warnings > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
                        {warnings} warning
                      </span>
                    )}
                    {infos > 0 && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300">
                        {infos} info
                      </span>
                    )}
                    {resolvedCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 dark:text-violet-300">
                        💬 {resolvedCount} resolved
                      </span>
                    )}
                  </>
                );
              })()}
              {!hasContent && (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400">All good ✅</span>
              )}
            </>
          )}
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
              <IssueRow
                key={`i-${i}`}
                issue={issue}
                section={name}
                issueIndex={i}
                canRespond={!!canRespond && !!designId}
                existingResponse={responses.get(`${name}:${i}`)}
                onRespond={onRespond}
              />
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

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  resolved: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "✅ Resolved" },
  "partially-addressed": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "🟡 Partially Addressed" },
  "not-addressed": { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "❌ Not Addressed" },
};

function IssueRow({
  issue,
  section,
  issueIndex,
  canRespond,
  existingResponse,
  onRespond,
  hideServerityBadge,
}: {
  issue: FeedbackItem;
  section: string;
  issueIndex: number;
  canRespond: boolean;
  existingResponse?: StoredResponse;
  onRespond?: (section: string, issueIndex: number, text: string) => Promise<StoredResponse | null>;
  hideServerityBadge?: boolean;
}) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState(existingResponse?.userResponse ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [localVerdict, setLocalVerdict] = useState<StoredResponse | null>(existingResponse ?? null);

  const handleSubmit = useCallback(async () => {
    if (!onRespond || !text.trim()) return;
    setSubmitting(true);
    const result = await onRespond(section, issueIndex, text.trim());
    if (result) {
      setLocalVerdict(result);
      setShowInput(false);
    }
    setSubmitting(false);
  }, [onRespond, section, issueIndex, text]);

  const verdict = localVerdict;
  const verdictStyle = verdict ? VERDICT_STYLES[verdict.verdict] : null;

  return (
    <div className={`rounded-lg border p-3 ${verdict?.verdict === "resolved" ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" : SEVERITY_STYLES[issue.severity] ?? ""}`}>
      <div className="flex items-start gap-2">
        {!hideServerityBadge && (
          <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${verdict?.verdict === "resolved" ? "bg-emerald-500 text-white" : SEVERITY_BADGE[issue.severity] ?? ""}`}>
            {verdict?.verdict === "resolved" ? "resolved" : (SEVERITY_LABEL[issue.severity] ?? issue.severity)}
          </Badge>
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${verdict?.verdict === "resolved" ? "line-through opacity-60" : ""}`}>{issue.title}</p>
          <p className="mt-1 text-xs opacity-80">{issue.description}</p>

          {/* Existing verdict display */}
          {verdict && (
            <div className={`mt-2 rounded-md ${verdictStyle?.bg} p-2`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-bold ${verdictStyle?.text}`}>{verdictStyle?.label}</span>
              </div>
              <p className={`text-xs ${verdictStyle?.text} opacity-80`}>{verdict.explanation}</p>
              {verdict.userResponse && (
                <p className="mt-1.5 text-[10px] text-muted-foreground italic">Your response: &ldquo;{verdict.userResponse}&rdquo;</p>
              )}
            </div>
          )}

          {/* Respond button / input — not for resolved issues or critical severity */}
          {canRespond && !showInput && issue.severity !== "critical" && verdict?.verdict !== "resolved" && (
            <button
              onClick={() => setShowInput(true)}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              {verdict ? "Respond again" : "Respond"}
            </button>
          )}

          {/* Critical issues — show fix-in-design hint instead */}
          {canRespond && issue.severity === "critical" && !verdict && (
            <p className="mt-2 text-[10px] text-muted-foreground italic">
              ⚠️ Critical issues should be fixed in the design, not addressed verbally.
            </p>
          )}

          {showInput && (
            <div className="mt-2 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Explain how you'd address this concern (like in a real interview)..."
                className="w-full rounded-md border border-border dark:border-white/[0.08] bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                rows={3}
                maxLength={2000}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || text.trim().length < 10}
                  className="inline-flex items-center gap-1 rounded-md bg-violet-500 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  {submitting ? "Evaluating..." : "Submit Response"}
                </button>
                <button
                  onClick={() => { setShowInput(false); setText(existingResponse?.userResponse ?? ""); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <span className="text-[10px] text-muted-foreground ml-auto">{text.length}/2000</span>
              </div>
            </div>
          )}
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
  designId,
  isAuthor,
  initialResponses,
}: {
  review: AIReviewResponse | null;
  status: AnalysisStatus;
  error?: string;
  reviewerProgress?: ReviewerProgress;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  hasBYOKey: boolean;
  designId?: string | null;
  isAuthor?: boolean;
  initialResponses?: { section: string; issueIndex: number; userResponse: string; verdict: string; explanation: string }[];
}) {
  // Response state — initialize from pre-loaded data if available
  const [responses, setResponses] = useState<Map<string, StoredResponse>>(() => {
    const map = new Map<string, StoredResponse>();
    if (initialResponses) {
      for (const r of initialResponses) {
        map.set(`${r.section}:${r.issueIndex}`, r as StoredResponse);
      }
    }
    return map;
  });
  const canRespond = !!isAuthor && !!designId && status === "complete";

  // Also fetch responses when designId changes (for cases where initialResponses wasn't available)
  useEffect(() => {
    if (!designId) return;
    // Skip fetch if we already have initial responses loaded
    if (initialResponses && initialResponses.length > 0) return;
    fetch(`/api/designs/${designId}/respond`)
      .then((r) => r.ok ? r.json() : { responses: [] })
      .then((data: { responses: StoredResponse[] }) => {
        if (data.responses.length > 0) {
          const map = new Map<string, StoredResponse>();
          for (const r of data.responses) {
            map.set(`${r.section}:${r.issueIndex}`, r);
          }
          setResponses(map);
        }
      })
      .catch(() => {});
  }, [designId, initialResponses]);

  // Handle submitting a response
  const handleRespond = useCallback(async (section: string, issueIndex: number, text: string): Promise<StoredResponse | null> => {
    if (!designId) return null;

    // Get BYO credentials
    let creds: Record<string, string> = {};
    try {
      const { getCredentialsForRequest, getAIConfig } = await import("@/lib/storage/ai-config");
      const config = getAIConfig();
      let provider: "managed" | "gemini" | "azure" = "managed";
      if (config.gemini?.apiKey) provider = "gemini";
      if (config.azure?.apiKey) provider = "azure";
      creds = getCredentialsForRequest(provider);
    } catch {}

    try {
      const res = await fetch(`/api/designs/${designId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          issueIndex,
          response: text,
          ...creds,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        // If unauthorized/forbidden, don't show alert — user shouldn't have the button
        if (res.status === 403 || res.status === 401) return null;
        alert(data.error ?? "Failed to submit response.");
        return null;
      }

      const data = (await res.json()) as { verdict: string; explanation: string };
      const stored: StoredResponse = {
        section,
        issueIndex,
        userResponse: text,
        verdict: data.verdict as StoredResponse["verdict"],
        explanation: data.explanation,
      };

      setResponses((prev) => {
        const next = new Map(prev);
        next.set(`${section}:${issueIndex}`, stored);
        return next;
      });

      return stored;
    } catch {
      alert("Network error — try again.");
      return null;
    }
  }, [designId]);
  // Re-evaluation state
  const [reeval, setReeval] = useState<{
    originalSignal: string;
    updatedSignal: string;
    updatedSignalReason: string;
    resolvedCount: number;
    partialCount: number;
  } | null>(null);
  const [reevaling, setReevaling] = useState(false);
  const [allExpanded, setAllExpanded] = useState(true);

  // Load existing re-evaluation
  useEffect(() => {
    if (!designId) return;
    fetch(`/api/designs/${designId}/re-evaluate`)
      .then((r) => r.ok ? r.json() : { reeval: null })
      .then((data: { reeval: typeof reeval }) => {
        if (data.reeval) setReeval(data.reeval);
      })
      .catch(() => {});
  }, [designId]);

  const resolvedCount = [...responses.values()].filter((r) => r.verdict === "resolved" && r.section !== "followUpQuestions").length;
  const partialCount = [...responses.values()].filter((r) => r.verdict === "partially-addressed" && r.section !== "followUpQuestions").length;
  const currentResponseCount = resolvedCount + partialCount;
  // Enable re-eval only when there are new responses since last re-eval
  const lastReEvalCount = reeval ? (reeval.resolvedCount + reeval.partialCount) : 0;
  const canReEval = canRespond && currentResponseCount >= 1 && currentResponseCount > lastReEvalCount;

  const handleReEvaluate = useCallback(async () => {
    if (!designId) return;
    setReevaling(true);

    let creds: Record<string, string> = {};
    try {
      const { getCredentialsForRequest, getAIConfig } = await import("@/lib/storage/ai-config");
      const config = getAIConfig();
      let provider: "managed" | "gemini" | "azure" = "managed";
      if (config.gemini?.apiKey) provider = "gemini";
      if (config.azure?.apiKey) provider = "azure";
      creds = getCredentialsForRequest(provider);
    } catch {}

    try {
      const res = await fetch(`/api/designs/${designId}/re-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Re-evaluation failed.");
        return;
      }
      const data = (await res.json()) as typeof reeval;
      setReeval(data);
    } catch {
      alert("Network error.");
    } finally {
      setReevaling(false);
    }
  }, [designId]);

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
            Configure your AI provider in Settings to get an AI-powered 5-reviewer analysis of your design.
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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    AI Review
                  </span>
                  <Badge className={`text-[10px] px-2 py-0 ${LEVEL_COLORS[level]}`}>
                    {LEVEL_LABELS[level]}
                  </Badge>
                </div>
                <button
                  onClick={() => setAllExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {allExpanded ? "Collapse All" : "Expand All"}
                </button>
              </div>
              <p className="text-sm text-foreground">{review.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Section Reviewer Cards */}
        {SECTION_DIMENSIONS.map((dim) => (
          <DimensionCard
            key={dim}
            name={dim}
            dimension={review[dim]}
            designId={designId}
            canRespond={canRespond}
            responses={responses}
            onRespond={handleRespond}
            forceExpanded={allExpanded}
          />
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
              {/* Hire Signal — original */}
              <div className="flex items-center gap-3">
                <Badge className={`text-sm px-3 py-1 font-bold ${reeval ? "opacity-50 line-through" : ""} ${SIGNAL_STYLES[review.leadReviewer.signal] ?? "bg-gray-400 text-white"}`}>
                  {SIGNAL_LABELS[review.leadReviewer.signal] ?? review.leadReviewer.signal}
                </Badge>
                {!reeval && review.leadReviewer.signalReason && (
                  <p className="text-xs text-muted-foreground flex-1">{review.leadReviewer.signalReason}</p>
                )}
                {reeval && (
                  <span className="text-[10px] text-muted-foreground">Original</span>
                )}
              </div>

              {/* Updated signal after re-evaluation */}
              {reeval && (
                <div className="rounded-lg border-2 border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">After Responses</span>
                    <span className="text-[10px] text-muted-foreground">({reeval.resolvedCount} resolved)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-sm px-3 py-1 font-bold ${SIGNAL_STYLES[reeval.updatedSignal] ?? "bg-gray-400 text-white"}`}>
                      {SIGNAL_LABELS[reeval.updatedSignal] ?? reeval.updatedSignal}
                    </Badge>
                    <p className="text-xs text-foreground flex-1">{reeval.updatedSignalReason}</p>
                  </div>
                </div>
              )}

              {/* Re-evaluate button */}
              {canReEval && (
                <button
                  onClick={handleReEvaluate}
                  disabled={reevaling}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {reevaling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {reevaling ? "Rechecking..." : reeval ? "Recheck Again" : "Recheck Hire Signal"}
                </button>
              )}

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


        {/* Follow-up Questions — respondable */}
        {review.followUpQuestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Follow-up Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {review.followUpQuestions.map((q, i) => (
                  <IssueRow
                    key={`fq-${i}`}
                    issue={{ severity: "question" as "info", title: `Q${i + 1}`, description: q }}
                    section="followUpQuestions"
                    issueIndex={i}
                    canRespond={canRespond}
                    existingResponse={responses.get(`followUpQuestions:${i}`)}
                    onRespond={handleRespond}
                    hideServerityBadge
                  />
                ))}
              </div>
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
  designId,
  isAuthor,
  initialResponses,
}: FeedbackPanelProps) {
  const hasBYOKey = (() => {
    try {
      const v2Raw = localStorage.getItem("drawlint:ai-config:v2");
      if (v2Raw) {
        const config = JSON.parse(v2Raw) as { gemini?: { apiKey?: string }; azure?: { apiKey?: string } };
        return !!(config.gemini?.apiKey || config.azure?.apiKey);
      }
      const legacyRaw = localStorage.getItem("drawlint:byo-key");
      if (legacyRaw) {
        const config = JSON.parse(legacyRaw) as { apiKey?: string };
        return !!config.apiKey;
      }
      return false;
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
      designId={designId}
      isAuthor={isAuthor}
      initialResponses={initialResponses}
    />
  );
}
