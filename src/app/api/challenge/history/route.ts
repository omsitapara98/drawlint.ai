import { NextResponse } from "next/server";
import { getChallengeHistory, getChallengeSubmissionCount } from "@/lib/db/challenges";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/challenge/history
 * Returns past weekly challenges with topic info and submission counts.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "12", 10) || 12, 50);

  const challenges = await getChallengeHistory(limit);

  if (challenges.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  // Batch-fetch topic details
  const client = await clientPromise;
  const db = client.db("drawlint-db");
  const topicIds = [...new Set(challenges.map((c) => c.topicId.toString()))];
  const topics = await db
    .collection("topics")
    .find({ _id: { $in: topicIds.map((id) => new ObjectId(id)) } })
    .project({ _id: 1, name: 1, slug: 1, difficulty: 1 })
    .toArray();
  const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));

  // Get submission counts
  const enriched = await Promise.all(
    challenges.map(async (c) => {
      const topic = topicMap.get(c.topicId.toString());
      const count = await getChallengeSubmissionCount(c._id.toString());
      return {
        _id: c._id.toString(),
        weekId: c.weekId,
        startDate: c.startDate,
        endDate: c.endDate,
        submissionCount: count,
        topic: topic
          ? {
              _id: topic._id.toString(),
              name: topic.name,
              slug: topic.slug,
              difficulty: topic.difficulty,
            }
          : null,
      };
    }),
  );

  return NextResponse.json({ challenges: enriched });
}
