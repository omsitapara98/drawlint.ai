import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getCurrentChallenge,
  createChallenge,
  getRecentChallengeTopicIds,
  hasUserSubmitted,
} from "@/lib/db/challenges";
import { getTopics } from "@/lib/db/topics";
import { getWeekId } from "@/types/challenge";

export const dynamic = "force-dynamic";

/**
 * GET /api/challenge/current
 * Returns the current week's challenge. Auto-creates one if none exists.
 * Also returns whether the current user has already submitted.
 */
export async function GET() {
  const weekId = getWeekId();
  let challenge = await getCurrentChallenge();

  // Auto-create challenge if none exists for this week
  if (!challenge) {
    const recentTopicIds = await getRecentChallengeTopicIds(6);
    const allTopics = await getTopics("popular", 200);

    // Filter to official topics not used recently
    const eligible = allTopics.filter(
      (t) =>
        (!t.source || t.source === "official") &&
        t.difficulty &&
        !recentTopicIds.includes(t._id.toString()),
    );

    if (eligible.length === 0) {
      // Fallback: allow repeats if pool exhausted
      const fallback = allTopics.filter(
        (t) => (!t.source || t.source === "official") && t.difficulty,
      );
      if (fallback.length === 0) {
        return NextResponse.json(
          { error: "No eligible topics for challenge" },
          { status: 500 },
        );
      }
      // Pick random
      const pick = fallback[Math.floor(Math.random() * fallback.length)];
      challenge = await createChallenge(pick._id.toString(), weekId);
    } else {
      // Difficulty rotation: determine target difficulty based on week number
      const weekNum = parseInt(weekId.split("-W")[1], 10);
      const difficulties = ["easy", "medium", "hard"] as const;
      const targetDifficulty = difficulties[weekNum % 3];

      // Prefer target difficulty, fallback to any eligible
      const preferred = eligible.filter((t) => t.difficulty === targetDifficulty);
      const pool = preferred.length > 0 ? preferred : eligible;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      challenge = await createChallenge(pick._id.toString(), weekId);
    }
  }

  // Fetch topic details
  const { getTopicBySlug } = await import("@/lib/db/topics");
  const clientPromise = (await import("@/lib/db/mongodb")).default;
  const { ObjectId } = await import("mongodb");
  const client = await clientPromise;
  const db = client.db("drawlint-db");
  const topic = await db.collection("topics").findOne({ _id: new ObjectId(challenge.topicId) });

  // Check user's submission status + existing draft
  let userSubmitted = false;
  let userDraftDesignId: string | null = null;
  const session = await auth();
  if (session?.user?.id) {
    userSubmitted = await hasUserSubmitted(challenge._id.toString(), session.user.id);

    // Fallback: if challenge_submissions record is missing but a reviewed
    // challenge design exists, treat as submitted (fire-and-forget race fix)
    if (!userSubmitted) {
      const reviewedDesign = await db.collection("designs").findOne({
        userId: new ObjectId(session.user.id),
        submissionType: "challenge",
        topicId: challenge.topicId,
        status: "reviewed",
      });
      if (reviewedDesign) {
        userSubmitted = true;
      }
    }

    // Check for existing challenge draft
    if (!userSubmitted) {
      const draft = await db.collection("designs").findOne({
        userId: new ObjectId(session.user.id),
        challengeId: challenge._id,
        submissionType: "challenge",
        status: "draft",
      });
      if (draft) {
        userDraftDesignId = draft._id.toString();
      }
    }
  }

  // Get submission count
  const { getChallengeSubmissionCount } = await import("@/lib/db/challenges");
  const submissionCount = await getChallengeSubmissionCount(challenge._id.toString());

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
          description: topic.description,
          difficulty: topic.difficulty,
          brief: topic.brief,
          requirements: topic.requirements,
          scale: topic.scale,
          hints: topic.hints,
          timeMinutes: topic.timeMinutes,
        }
      : null,
    userSubmitted,
    userDraftDesignId,
    submissionCount,
  });
}
