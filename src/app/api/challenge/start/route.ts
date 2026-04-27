import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentChallenge, hasUserSubmitted } from "@/lib/db/challenges";
import { createDesign } from "@/lib/db/designs";
import { uploadDesign } from "@/lib/blob/storage";
import { createChallengeTemplate } from "@/lib/diagram";
import { getWeekId } from "@/types/challenge";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db/mongodb";

/**
 * POST /api/challenge/start
 * Creates a draft design for the current weekly challenge.
 * Pre-fills FR + Assumptions from the topic's requirements and scale data.
 * Returns the designId so the client can open the canvas in edit mode.
 * If a draft already exists, returns that instead.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // 2. Check if already submitted (completed)
  const alreadySubmitted = await hasUserSubmitted(challenge._id.toString(), userId);
  if (alreadySubmitted) {
    return NextResponse.json(
      { error: "You have already submitted for this week's challenge." },
      { status: 409 },
    );
  }

  // 3. Check for existing draft (scoped to this specific challenge, not just topic)
  const client = await clientPromise;
  const db = client.db("drawlint-db");
  const existingDraft = await db.collection("designs").findOne({
    userId: new ObjectId(userId),
    challengeId: challenge._id,
    submissionType: "challenge",
    status: "draft",
  });

  if (existingDraft) {
    return NextResponse.json({
      designId: existingDraft._id.toString(),
      existing: true,
    });
  }

  // 4. Fetch topic data for pre-filling FR + Assumptions
  const topic = await db.collection("topics").findOne({ _id: challenge.topicId });
  const requirements = (topic?.requirements as string[] | undefined) ?? [];
  const scale = (topic?.scale as string[] | undefined) ?? [];

  // 5. Create template with pre-filled FR + Assumptions
  const designId = new ObjectId().toString();
  const template = createChallengeTemplate(requirements, scale);

  const { blobUrl, blobKey } = await uploadDesign(
    userId,
    designId,
    1,
    template,
  );

  const design = await createDesign({
    topicId: challenge.topicId.toString(),
    userId,
    blobUrl,
    blobKey,
    reviewLevel: "senior",
    version: 1,
    submissionType: "challenge",
    challengeId: challenge._id.toString(),
    status: "draft",
  });

  return NextResponse.json({
    designId: design._id.toString(),
    existing: false,
  }, { status: 201 });
}
