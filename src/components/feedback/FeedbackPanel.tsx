"use client";

import { useState } from "react";
import type { ParsedDiagram, GraphNode } from "@/types/diagram";
import type { AIReviewResponse, AnalysisStatus, FeedbackItem, ReviewDimension, ReviewLevel } from "@/types/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Zap,
  Activity,
  Target,
  Layers,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
} from "lucide-react";

interface FeedbackPanelProps {
  diagram: ParsedDiagram | null;
  aiReview?: AIReviewResponse | null;
  aiStatus?: AnalysisStatus;
  aiError?: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

const SECTION_LABELS: {
  key: keyof ParsedDiagram["sections"];
  label: string;
}[] = [
  { key: "functionalRequirements", label: "Functional Requirements" },
  { key: "assumptions", label: "Assumptions" },
  { key: "nonFunctionalRequirements", label: "Non-Functional Requirements" },
  { key: "coreEntities", label: "Core Entities" },
  { key: "capacityCalculations", label: "Capacity Calculations" },
  { key: "apiRoutes", label: "API Routes" },
];

const TYPE_COLORS: Record<GraphNode["type"], string> = {
  client: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "api-gateway": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "load-balancer": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  service: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  worker: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  database: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cache: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  queue: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pubsub: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  storage: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  cdn: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  dns: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  firewall: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  server: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  unknown: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

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

const SEVERITY_ORDER: Record<string, number> = {
  strong: 0,
  good: 1,
  critical: 2,
  warning: 3,
  info: 4,
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
      {expanded && dimension.issues.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="space-y-2">
            {[...dimension.issues]
              .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5))
              .map((issue, i) => (
                <IssueRow key={i} issue={issue} />
              ))}
          </div>
        </CardContent>
      )}
      {expanded && dimension.issues.length === 0 && (
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground italic">No issues found — looks good! ✅</p>
        </CardContent>
      )}
    </Card>
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

/* ── AI Review Tab Content ───────────────────────────────────── */

function AIReviewContent({
  review,
  status,
  error,
  onRetry,
  onOpenSettings,
  hasBYOKey,
}: {
  review: AIReviewResponse | null;
  status: AnalysisStatus;
  error?: string;
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

  // Loading
  if (status === "analyzing") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <div className="text-center">
          <p className="text-sm font-medium">Analyzing your design…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            AI reviewers are evaluating your design…
          </p>
        </div>
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

        {/* Flow Analysis */}
        {(review.flowAnalysis.criticalPath.length > 0 ||
          review.flowAnalysis.missingEdges.length > 0 ||
          review.flowAnalysis.sequenceGaps.length > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Flow Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {review.flowAnalysis.criticalPath.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Critical Path
                  </h4>
                  <div className="space-y-1">
                    {review.flowAnalysis.criticalPath.map((path, i) => (
                      <div key={i} className="rounded-md bg-muted px-3 py-2 text-xs font-mono">
                        {path}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.flowAnalysis.missingEdges.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Missing Edges
                  </h4>
                  <div className="space-y-1">
                    {review.flowAnalysis.missingEdges.map((edge, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                        {edge}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.flowAnalysis.sequenceGaps.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sequence Gaps
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {review.flowAnalysis.sequenceGaps.map((gap, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        Step #{gap} missing
                      </Badge>
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

/* ── Parse Tab Content (existing) ────────────────────────────── */

function ParseTabContent({ diagram }: { diagram: ParsedDiagram }) {
  const { sections, hld } = diagram;
  const nodeMap = new Map(hld.nodes.map((n) => [n.id, n]));

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
        {/* Text sections */}
        {SECTION_LABELS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {sections[key] ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {sections[key]}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No content yet
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* HLD Graph section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              High-Level Design
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {hld.nodes.length} component{hld.nodes.length !== 1 ? "s" : ""}
              {hld.clusters.length > 0 && (
                <> · {hld.clusters.length} cluster{hld.clusters.length !== 1 ? "s" : ""}</>
              )}
              {" · "}
              {hld.edges.length} connection{hld.edges.length !== 1 ? "s" : ""}
              {" · "}
              {hld.annotations.length} annotation{hld.annotations.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Components */}
            {hld.nodes.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Components
                </h4>
                <div className="space-y-1.5">
                  {hld.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[node.type]}`}
                      >
                        {node.type}
                      </Badge>
                      <span className="truncate">
                        {node.label || "(unlabeled)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clusters */}
            {hld.clusters.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clusters
                </h4>
                <div className="space-y-1.5">
                  {hld.clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm"
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      >
                        ×{cluster.count}
                      </Badge>
                      <span className="truncate">{cluster.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {hld.edges.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Connections
                </h4>
                <div className="space-y-1.5">
                  {hld.edges.map((edge) => {
                    const fromNode = nodeMap.get(edge.from);
                    const toNode = nodeMap.get(edge.to);
                    return (
                      <div
                        key={edge.id}
                        className="rounded-md border px-2.5 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-1 text-xs">
                          {edge.sequence !== undefined && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 mr-1">
                              #{edge.sequence}
                            </Badge>
                          )}
                          <span className="font-medium truncate">
                            {fromNode?.label || edge.from || "?"}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium truncate">
                            {toNode?.label || edge.to || "?"}
                          </span>
                        </div>
                        {edge.label && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {edge.label}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Annotations */}
            {hld.annotations.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Annotations
                </h4>
                <div className="space-y-1.5">
                  {hld.annotations.map((ann) => {
                    const nearNode = nodeMap.get(ann.nearestNodeId);
                    return (
                      <div
                        key={ann.id}
                        className="rounded-md border px-2.5 py-1.5 text-sm"
                      >
                        <p className="text-xs whitespace-pre-wrap">
                          {ann.text}
                        </p>
                        {nearNode && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            near: {nearNode.label || nearNode.id}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hld.nodes.length === 0 &&
              hld.edges.length === 0 &&
              hld.annotations.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No HLD components drawn yet
                </p>
              )}
          </CardContent>
        </Card>

        {/* Raw JSON */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Raw JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
              {JSON.stringify(diagram, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/* ── Main FeedbackPanel ──────────────────────────────────────── */

export function FeedbackPanel({
  diagram,
  aiReview,
  aiStatus = "idle",
  aiError,
  onRetry,
  onOpenSettings,
}: FeedbackPanelProps) {
  // Check if BYO key is configured
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

  const defaultTab = aiReview || aiStatus === "analyzing" || aiStatus === "error" || hasBYOKey
    ? "ai-review"
    : "parse";

  if (!diagram) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
          ✏️
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Ready to analyze</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click &quot;Analyze Design&quot; to extract your design sections
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
      <TabsList className="mx-4 mt-3 shrink-0 grid w-auto grid-cols-2">
        <TabsTrigger value="ai-review" className="text-xs">
          <Sparkles className="mr-1.5 h-3 w-3" />
          AI Review
        </TabsTrigger>
        <TabsTrigger value="parse" className="text-xs">
          Parse
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ai-review" className="flex-1 overflow-hidden mt-0">
        <AIReviewContent
          review={aiReview ?? null}
          status={aiStatus}
          error={aiError}
          onRetry={onRetry}
          onOpenSettings={onOpenSettings}
          hasBYOKey={hasBYOKey}
        />
      </TabsContent>

      <TabsContent value="parse" className="flex-1 overflow-hidden mt-0">
        <ParseTabContent diagram={diagram} />
      </TabsContent>
    </Tabs>
  );
}
