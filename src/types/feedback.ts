export interface DiagramFeedback {
  summary: string;
  scalabilityIssues: FeedbackItem[];
  bottlenecks: FeedbackItem[];
  singlePointsOfFailure: FeedbackItem[];
  suggestions: FeedbackItem[];
  followUpQuestions: string[];
}

export interface FeedbackItem {
  severity: "strong" | "good" | "critical" | "warning" | "info";
  title: string;
  description: string;
}

export type AnalysisStatus = "idle" | "analyzing" | "complete" | "error";

export interface SectionContents {
  functionalRequirements: string;
  assumptions: string;
  nonFunctionalRequirements: string;
  coreEntities: string;
  capacityCalculations: string;
  apiRoutes: string;
  hld: string;
}

/* ── Review Level ────────────────────────────────────────────── */

export type ReviewLevel = "mid" | "senior" | "staff" | "deep";

/* ── Multi-Reviewer AI Response Types ────────────────────────── */

export interface ReviewDimension {
  issues: FeedbackItem[];
}

export interface LeadReviewer {
  topStrengths: string[];
  topRisks: string[];
  signal: "strong-hire" | "hire" | "lean-hire" | "lean-no-hire" | "no-hire";
  signalReason: string;
  improvementAreas: string[];
}

export interface AIReviewResponse {
  level: ReviewLevel;
  summary: string;
  // Section-based reviewers — always present at every level
  nfrReview: ReviewDimension;
  entitiesReview: ReviewDimension;
  capacityReview: ReviewDimension;
  apiReview: ReviewDimension;
  hldReview: ReviewDimension;
  flowAnalysis: {
    criticalPath: string[];
    missingEdges: string[];
    sequenceGaps: number[];
  };
  leadReviewer: LeadReviewer;
  followUpQuestions: string[];
}
