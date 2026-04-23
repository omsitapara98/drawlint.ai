import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type { Review } from "@/types/library";
import type { AIReviewResponse } from "@/types/feedback";

const DB_NAME = "drawlint-db";

async function collection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Review>("reviews");
}

/** Get the review for a design. */
export async function getReviewByDesignId(
  designId: string,
): Promise<Review | null> {
  const col = await collection();
  return col.findOne({ designId: new ObjectId(designId) });
}

/** Create a review from an AI review response. */
export async function createReview(input: {
  designId: string;
  version: number;
  level: AIReviewResponse["level"];
  summary: string;
  nfrReview: AIReviewResponse["nfrReview"];
  entitiesReview: AIReviewResponse["entitiesReview"];
  capacityReview: AIReviewResponse["capacityReview"];
  apiReview: AIReviewResponse["apiReview"];
  hldReview: AIReviewResponse["hldReview"];
  leadReviewer: AIReviewResponse["leadReviewer"];
  followUpQuestions: string[];
}): Promise<Review> {
  const col = await collection();
  const doc: Review = {
    _id: new ObjectId(),
    designId: new ObjectId(input.designId),
    version: input.version,
    level: input.level,
    summary: input.summary,
    nfrReview: input.nfrReview,
    entitiesReview: input.entitiesReview,
    capacityReview: input.capacityReview,
    apiReview: input.apiReview,
    hldReview: input.hldReview,
    leadReviewer: input.leadReviewer,
    followUpQuestions: input.followUpQuestions,
    createdAt: new Date(),
  };

  await col.insertOne(doc);
  return doc;
}

/** Delete the review associated with a design. */
export async function deleteReviewByDesignId(
  designId: string,
): Promise<void> {
  const col = await collection();
  await col.deleteOne({ designId: new ObjectId(designId) });
}
