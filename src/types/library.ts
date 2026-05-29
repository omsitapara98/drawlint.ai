import type { ObjectId } from "mongodb";
import type {
  ReviewLevel,
  ReviewDimension,
  LeadReviewer,
} from "./feedback";

/* ── Topic ───────────────────────────────────────────────────── */

export type TopicDifficulty = "easy" | "medium" | "hard";
export type TopicSource = "official" | "community";

export interface Topic {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  difficulty?: TopicDifficulty;
  source?: TopicSource;
  brief?: string;
  requirements?: string[];
  scale?: string[];
  hints?: string[];
  timeMinutes?: number;
  relatedSlugs?: string[];
  submissionCount: number;
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Design ──────────────────────────────────────────────────── */

export interface Design {
  _id: ObjectId;
  topicId: ObjectId;
  userId: ObjectId;
  version: number;
  blobUrl: string;
  blobKey: string;
  status: "draft" | "submitted" | "reviewing" | "reviewed";
  forkedFrom?: ObjectId;
  reviewLevel: ReviewLevel;
  anonymousName?: string;
  /** Candidate's free-text walkthrough of their HLD design choices and tradeoffs */
  hldExplanation?: string;
  /** Set when this design was submitted as part of a weekly challenge */
  challengeId?: ObjectId;
  /** How this design was submitted */
  submissionType?: "regular" | "challenge";
  createdAt: Date;
  updatedAt: Date;
}

/* ── Review ──────────────────────────────────────────────────── */

export interface Review {
  _id: ObjectId;
  designId: ObjectId;
  version: number;
  level: ReviewLevel;
  summary: string;
  nfrReview: ReviewDimension;
  entitiesReview: ReviewDimension;
  capacityReview: ReviewDimension;
  apiReview: ReviewDimension;
  hldReview: ReviewDimension;
  leadReviewer: LeadReviewer;
  followUpQuestions: string[];
  /** Which AI provider generated this review */
  reviewedBy?: "drawlint" | "gemini" | "azure";
  createdAt: Date;
}

/* ── Issue Response (user responds to AI feedback) ────────── */

export type IssueVerdict = "resolved" | "partially-addressed" | "not-addressed";
export type ReviewSection = "nfrReview" | "entitiesReview" | "capacityReview" | "apiReview" | "hldReview" | "followUpQuestions";

export interface IssueResponse {
  _id: ObjectId;
  designId: ObjectId;
  reviewId: ObjectId;
  userId: ObjectId;
  section: ReviewSection;
  issueIndex: number;
  originalIssue: {
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
  };
  userResponse: string;
  verdict: IssueVerdict;
  explanation: string;
  evaluatedBy?: "drawlint" | "gemini" | "azure";
  createdAt: Date;
  updatedAt: Date;
}

/** Re-evaluated hire signal after candidate responses */
export interface ReEvaluatedSignal {
  _id: ObjectId;
  designId: ObjectId;
  reviewId: ObjectId;
  originalSignal: string;
  updatedSignal: string;
  updatedSignalReason: string;
  resolvedCount: number;
  partialCount: number;
  totalResponses: number;
  createdAt: Date;
}

/* ── Composite ───────────────────────────────────────────────── */

export interface DesignWithReview {
  design: Design;
  review: Review | null;
  author: { _id: ObjectId; name?: string; image?: string } | null;
  topic: Topic | null;
}

/* ── Input types for API validation ──────────────────────────── */

export interface CreateTopicInput {
  name: string;
}

export interface SubmitDesignInput {
  topicId: string;
  elements: unknown[];
  reviewLevel?: ReviewLevel;
  forkedFrom?: string;
  anonymous?: boolean;
  /** Candidate's free-text walkthrough of their HLD design choices and tradeoffs */
  hldExplanation?: string;
  /** "challenge" when submitted via weekly challenge flow */
  submissionType?: "regular" | "challenge";
  /** BYO key mode: sent from client localStorage, never stored server-side */
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
}
