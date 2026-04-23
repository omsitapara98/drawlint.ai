import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type { Design } from "@/types/library";
import type { ParsedDiagram } from "@/types/diagram";
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
  return col
    .find({ topicId: new ObjectId(topicId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** List designs by a specific user, newest first. */
export async function getDesignsByUser(
  userId: string,
  limit = 50,
): Promise<Design[]> {
  const col = await collection();
  return col
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
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
  parsedDiagram: ParsedDiagram;
  reviewLevel: ReviewLevel;
  version: number;
  forkedFrom?: string;
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
    parsedDiagram: input.parsedDiagram,
    status: "reviewing",
    reviewLevel: input.reviewLevel,
    createdAt: now,
    updatedAt: now,
  };

  if (input.forkedFrom) {
    doc.forkedFrom = new ObjectId(input.forkedFrom);
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
  const latest = await col
    .find({
      topicId: new ObjectId(topicId),
      userId: new ObjectId(userId),
    })
    .sort({ version: -1 })
    .limit(1)
    .toArray();

  return latest.length > 0 ? latest[0].version : 0;
}
