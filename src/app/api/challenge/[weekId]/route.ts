import { NextResponse } from "next/server";
import { getChallengeByWeek } from "@/lib/db/challenges";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  const { weekId } = await params;
  const challenge = await getChallengeByWeek(weekId);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const client = await clientPromise;
  const db = client.db("drawlint-db");
  const topic = await db
    .collection("topics")
    .findOne({ _id: new ObjectId(challenge.topicId.toString()) });

  const submissionCount = await db
    .collection("challenge_submissions")
    .countDocuments({ challengeId: challenge._id });

  return NextResponse.json({
    challenge: {
      _id: challenge._id.toString(),
      weekId: challenge.weekId,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    },
    topic: topic
      ? {
          _id: topic._id.toString(),
          name: topic.name,
          slug: topic.slug,
          difficulty: topic.difficulty,
          brief: topic.brief,
          timeMinutes: topic.timeMinutes,
        }
      : null,
    submissionCount,
  });
}
