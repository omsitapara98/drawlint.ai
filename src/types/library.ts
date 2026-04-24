import type { ObjectId } from "mongodb";
import type {
  ReviewLevel,
  ReviewDimension,
  LeadReviewer,
} from "./feedback";

/* ── Topic ───────────────────────────────────────────────────── */

export interface Topic {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
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
  /** BYO key mode: sent from client localStorage, never stored server-side */
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
}
