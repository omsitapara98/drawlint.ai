import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type { IssueResponse, IssueVerdict, ReviewSection } from "@/types/library";

const DB_NAME = "drawlint-db";

async function collection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<IssueResponse>("responses");
}

/** Ensure unique index on (reviewId, section, issueIndex) — one response per issue. */
async function ensureIndexes() {
  const col = await collection();
  await col.createIndex(
    { reviewId: 1, section: 1, issueIndex: 1 },
    { unique: true, background: true },
  ).catch(() => {
    // Index may already exist
  });
}

// Run once on module load
ensureIndexes().catch(console.error);

/** Create or update a response for a specific issue. */
export async function upsertResponse(input: {
  designId: string;
  reviewId: string;
  userId: string;
  section: ReviewSection;
  issueIndex: number;
  originalIssue: { severity: "critical" | "warning" | "info"; title: string; description: string };
  userResponse: string;
  verdict: IssueVerdict;
  explanation: string;
  evaluatedBy?: "drawlint" | "gemini" | "azure";
}): Promise<IssueResponse> {
  const col = await collection();
  const now = new Date();

  const filter = {
    reviewId: new ObjectId(input.reviewId),
    section: input.section,
    issueIndex: input.issueIndex,
  };

  const doc = {
    $set: {
      designId: new ObjectId(input.designId),
      reviewId: new ObjectId(input.reviewId),
      userId: new ObjectId(input.userId),
      section: input.section,
      issueIndex: input.issueIndex,
      originalIssue: input.originalIssue,
      userResponse: input.userResponse,
      verdict: input.verdict,
      explanation: input.explanation,
      evaluatedBy: input.evaluatedBy,
      updatedAt: now,
    },
    $setOnInsert: {
      _id: new ObjectId(),
      createdAt: now,
    },
  };

  const result = await col.findOneAndUpdate(filter, doc, {
    upsert: true,
    returnDocument: "after",
  });

  return result!;
}

/** Get all responses for a review. */
export async function getResponsesByReviewId(
  reviewId: string,
): Promise<IssueResponse[]> {
  const col = await collection();
  return col
    .find({ reviewId: new ObjectId(reviewId) })
    .sort({ section: 1, issueIndex: 1 })
    .toArray();
}

/** Delete all responses for a review (called on re-review or design delete). */
export async function deleteResponsesByReviewId(
  reviewId: string,
): Promise<void> {
  const col = await collection();
  await col.deleteMany({ reviewId: new ObjectId(reviewId) });
}

/** Delete all responses for a design (called on design delete). */
export async function deleteResponsesByDesignId(
  designId: string,
): Promise<void> {
  const col = await collection();
  await col.deleteMany({ designId: new ObjectId(designId) });
}
