import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type { Design } from "@/types/library";
import type { ReviewLevel } from "@/types/feedback";

const DB_NAME = "drawlint-db";

async function collection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Design>("designs");
}

/** List designs for a topic, newest first. */
export async function getDesignsByTopic(
  topicId: string,
  limit = 50,
): Promise<Design[]> {
  const col = await collection();
  try {
    return await col
      .find({ topicId: new ObjectId(topicId), status: { $ne: "draft" } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch {
    const docs = await col
      .find({ topicId: new ObjectId(topicId), status: { $ne: "draft" } })
      .limit(limit)
      .toArray();
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return docs;
  }
}

/** List designs by a specific user, newest first. */
export async function getDesignsByUser(
  userId: string,
  limit = 50,
): Promise<Design[]> {
  const col = await collection();
  try {
    return await col
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch {
    const docs = await col
      .find({ userId: new ObjectId(userId) })
      .limit(limit)
      .toArray();
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return docs;
  }
}

/** Get a single design by its ID. */
export async function getDesignById(
  designId: string,
): Promise<Design | null> {
  const col = await collection();
  return col.findOne({ _id: new ObjectId(designId) });
}

/** Create a new design document. */
export async function createDesign(input: {
  topicId: string;
  userId: string;
  blobUrl: string;
  blobKey: string;
  reviewLevel: ReviewLevel;
  version: number;
  forkedFrom?: string;
  anonymousName?: string;
  submissionType?: "regular" | "challenge";
  challengeId?: string;
  status?: Design["status"];
}): Promise<Design> {
  const col = await collection();
  const now = new Date();

  const doc: Design = {
    _id: new ObjectId(),
    topicId: new ObjectId(input.topicId),
    userId: new ObjectId(input.userId),
    version: input.version,
    blobUrl: input.blobUrl,
    blobKey: input.blobKey,
    status: input.status ?? "reviewing",
    reviewLevel: input.reviewLevel,
    submissionType: input.submissionType ?? "regular",
    createdAt: now,
    updatedAt: now,
  };

  if (input.forkedFrom) {
    doc.forkedFrom = new ObjectId(input.forkedFrom);
  }
  if (input.anonymousName) {
    doc.anonymousName = input.anonymousName;
  }
  if (input.challengeId) {
    doc.challengeId = new ObjectId(input.challengeId);
  }

  await col.insertOne(doc);
  return doc;
}

/** Update the status of a design. */
export async function updateDesignStatus(
  designId: string,
  status: Design["status"],
): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { _id: new ObjectId(designId) },
    { $set: { status, updatedAt: new Date() } },
  );
}

/** Update a design's blob reference and reset status for re-review. */
export async function updateDesignBlob(
  designId: string,
  blobUrl: string,
  blobKey: string,
): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { _id: new ObjectId(designId) },
    { $set: { blobUrl, blobKey, status: "reviewing" as const, updatedAt: new Date() } },
  );
}

/** Delete a design by ID. */
export async function deleteDesign(designId: string): Promise<void> {
  const col = await collection();
  await col.deleteOne({ _id: new ObjectId(designId) });
}

/** Get the latest version number for a user's designs under a topic. */
export async function getLatestVersion(
  topicId: string,
  userId: string,
): Promise<number> {
  const col = await collection();
  try {
    const latest = await col
      .find({
        topicId: new ObjectId(topicId),
        userId: new ObjectId(userId),
      })
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    return latest.length > 0 ? latest[0].version : 0;
  } catch {
    const docs = await col
      .find({
        topicId: new ObjectId(topicId),
        userId: new ObjectId(userId),
      })
      .toArray();
    if (docs.length === 0) return 0;
    return Math.max(...docs.map((d) => d.version));
  }
}
