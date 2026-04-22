export interface DiagramFeedback {
  summary: string;
  score: number; // 0-100
  scalabilityIssues: FeedbackItem[];
  bottlenecks: FeedbackItem[];
  singlePointsOfFailure: FeedbackItem[];
  suggestions: FeedbackItem[];
  followUpQuestions: string[];
}

export interface FeedbackItem {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedComponents?: string[];
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

/* ── 5-Reviewer AI Response Types ────────────────────────────── */

export interface ReviewDimension {
  score: number;
  issues: FeedbackItem[];
}

export interface AIReviewResponse {
  score: number;
  summary: string;
  scalability: ReviewDimension;
  availability: ReviewDimension;
  bottlenecks: ReviewDimension;
  security: ReviewDimension;
  completeness: ReviewDimension;
  flowAnalysis: {
    criticalPath: string[];
    missingEdges: string[];
    sequenceGaps: number[];
  };
  followUpQuestions: string[];
}
