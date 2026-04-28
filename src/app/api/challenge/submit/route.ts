import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getCurrentChallenge,
  hasUserSubmitted,
  createChallengeSubmission,
  updateUserStreak,
  DuplicateSubmissionError,
} from "@/lib/db/challenges";
import { getWeekId, SIGNAL_SCORES } from "@/types/challenge";

export const dynamic = "force-dynamic";

/**
 * POST /api/challenge/submit
 * Records a challenge submission after the design + review are already created
 * via the normal /api/designs flow. This endpoint:
 *  1. Verifies the challenge is active and user hasn't submitted
 *  2. Links the design to the challenge (sets challengeId)
 *  3. Creates a challenge_submissions entry with the score
 *  4. Updates the user's streak
 *
 * Body: { designId: string, signal: string }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { designId?: string; signal?: string };

  if (!body.designId || !body.signal) {
    return NextResponse.json(
      { error: "designId and signal are required." },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const weekId = getWeekId();

  // 1. Get current challenge
  const challenge = await getCurrentChallenge();
  if (!challenge || challenge.weekId !== weekId) {
    return NextResponse.json(
      { error: "No active challenge this week." },
      { status: 404 },
    );
  }

  // 2. Check if already submitted
  const alreadySubmitted = await hasUserSubmitted(challenge._id.toString(), userId);
  if (alreadySubmitted) {
    return NextResponse.json(
      { error: "You have already submitted for this week's challenge." },
      { status: 409 },
    );
  }

  // 3. Validate design — must be owned, challenge type, reviewed, correct topic
  const { ObjectId } = await import("mongodb");
  const clientPromise = (await import("@/lib/db/mongodb")).default;
  const client = await clientPromise;
  const db = client.db("drawlint-db");

  let designOid: InstanceType<typeof ObjectId>;
  try {
    designOid = new ObjectId(body.designId);
  } catch {
    return NextResponse.json({ error: "Invalid designId." }, { status: 400 });
  }

  const design = await db.collection("designs").findOne({
    _id: designOid,
    userId: new ObjectId(userId),
  });

  if (!design) {
    return NextResponse.json(
      { error: "Design not found or not owned by you." },
      { status: 404 },
    );
  }

  // Must be a challenge submission for the correct topic
  if (design.submissionType !== "challenge") {
    return NextResponse.json(
      { error: "This design is not a challenge submission." },
      { status: 400 },
    );
  }
  if (design.topicId.toString() !== challenge.topicId.toString()) {
    return NextResponse.json(
      { error: "This design does not match the current challenge topic." },
      { status: 400 },
    );
  }

  // Must have a completed review — read signal from server, not client
  if (design.status !== "reviewed") {
    return NextResponse.json(
      { error: "Design must be reviewed before submitting to the challenge." },
      { status: 400 },
    );
  }

  const { getReviewByDesignId } = await import("@/lib/db/reviews");
  const review = await getReviewByDesignId(body.designId);
  if (!review?.leadReviewer?.signal) {
    return NextResponse.json(
      { error: "No AI review found for this design." },
      { status: 400 },
    );
  }

  // Use server-side signal, ignore client signal
  const serverSignal = review.leadReviewer.signal;

  // Set challengeId on the design + lock it
  await db.collection("designs").updateOne(
    { _id: designOid },
    { $set: { challengeId: challenge._id, updatedAt: new Date() } },
  );

  // 4. Create submission entry with server-verified signal
  const score = SIGNAL_SCORES[serverSignal] ?? 1;
  let submission;
  try {
    submission = await createChallengeSubmission({
      challengeId: challenge._id.toString(),
      userId,
      designId: body.designId,
      score,
      signal: serverSignal,
    });
  } catch (err) {
    if (err instanceof DuplicateSubmissionError) {
      return NextResponse.json(
        { error: "You have already submitted for this week's challenge." },
        { status: 409 },
      );
    }
    throw err;
  }

  // 5. Update streak
  const streak = await updateUserStreak(userId, weekId);

  return NextResponse.json({
    submission: {
      _id: submission._id.toString(),
      score: submission.score,
      signal: submission.signal,
    },
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalCompleted: streak.totalCompleted,
    },
  });
}
