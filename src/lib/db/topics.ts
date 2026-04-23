import { ObjectId } from "mongodb";
import slugify from "slugify";
import clientPromise from "./mongodb";
import type { Topic } from "@/types/library";

const DB_NAME = "drawlint-db";

async function collection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Topic>("topics");
}

/** List topics, sorted by popularity or recency. */
export async function getTopics(
  sort: "popular" | "recent" = "popular",
  limit = 50,
): Promise<Topic[]> {
  const col = await collection();
  const sortField: Record<string, 1 | -1> =
    sort === "popular"
      ? { submissionCount: -1 }
      : { createdAt: -1 };
  return col.find().sort(sortField).limit(limit).toArray();
}

/** Find a topic by its URL slug. */
export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  const col = await collection();
  return col.findOne({ slug });
}

/** Create a new topic. Returns the inserted document. */
export async function createTopic(
  name: string,
  userId: string,
): Promise<Topic> {
  const col = await collection();
  const slug = slugify(name, { lower: true, strict: true });

  const now = new Date();
  const doc: Topic = {
    _id: new ObjectId(),
    name,
    slug,
    submissionCount: 0,
    createdBy: new ObjectId(userId),
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(doc);
  return doc;
}

/** Increment the denormalized submission counter. */
export async function incrementSubmissionCount(
  topicId: string,
): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { _id: new ObjectId(topicId) },
    { $inc: { submissionCount: 1 }, $set: { updatedAt: new Date() } },
  );
}

/** Decrement the denormalized submission counter. */
export async function decrementSubmissionCount(
  topicId: string,
): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { _id: new ObjectId(topicId) },
    { $inc: { submissionCount: -1 }, $set: { updatedAt: new Date() } },
  );
}
