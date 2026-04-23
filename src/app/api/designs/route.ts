import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadDesign } from "@/lib/blob/storage";
import {
  createDesign,
  getLatestVersion,
  updateDesignStatus,
} from "@/lib/db/designs";
import { createReview } from "@/lib/db/reviews";
import { incrementSubmissionCount } from "@/lib/db/topics";
import { analyzeDesign } from "@/lib/ai";
import type { SubmitDesignInput } from "@/types/library";
import type { ReviewLevel } from "@/types/feedback";

const VALID_LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SubmitDesignInput;
  try {
    body = (await request.json()) as SubmitDesignInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.topicId || typeof body.topicId !== "string") {
    return NextResponse.json(
      { error: "topicId is required." },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.elements) || body.elements.length === 0) {
    return NextResponse.json(
      { error: "elements array is required and must not be empty." },
      { status: 400 },
    );
  }
  if (!body.parsedDiagram || typeof body.parsedDiagram !== "object") {
    return NextResponse.json(
      { error: "parsedDiagram is required." },
      { status: 400 },
    );
  }

  const reviewLevel: ReviewLevel =
    body.reviewLevel && VALID_LEVELS.includes(body.reviewLevel)
      ? body.reviewLevel
      : "senior";

  const userId = session.user.id;

  // 1. Determine version
  const latestVersion = await getLatestVersion(body.topicId, userId);
  const version = latestVersion + 1;

  // 2. Upload elements to blob storage
  // Generate a temporary ObjectId string for the blob path
  const { ObjectId } = await import("mongodb");
  const designId = new ObjectId().toString();

  let blobUrl: string;
  let blobKey: string;
  try {
    const result = await uploadDesign(userId, designId, version, body.elements);
    blobUrl = result.blobUrl;
    blobKey = result.blobKey;
  } catch (err) {
    console.error("Blob upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload design to storage." },
      { status: 500 },
    );
  }

  // 3. Create design doc in Cosmos (status: "reviewing")
  const design = await createDesign({
    topicId: body.topicId,
    userId,
    blobUrl,
    blobKey,
    parsedDiagram: body.parsedDiagram,
    reviewLevel,
    version,
    forkedFrom: body.forkedFrom,
  });

  // 4. Attempt AI review using platform env vars
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (apiKey && endpoint && deployment) {
    try {
      const aiResult = await analyzeDesign(body.parsedDiagram, {
        apiKey,
        endpoint,
        deployment,
        level: reviewLevel,
      });

      // 5. Save review to Cosmos
      const review = await createReview({
        designId: design._id.toString(),
        version,
        level: aiResult.level,
        summary: aiResult.summary,
        nfrReview: aiResult.nfrReview,
        entitiesReview: aiResult.entitiesReview,
        capacityReview: aiResult.capacityReview,
        apiReview: aiResult.apiReview,
        hldReview: aiResult.hldReview,
        leadReviewer: aiResult.leadReviewer,
        followUpQuestions: aiResult.followUpQuestions,
      });

      // 6. Update design status to "reviewed"
      await updateDesignStatus(design._id.toString(), "reviewed");
      design.status = "reviewed";

      // 7. Increment topic submission count
      await incrementSubmissionCount(body.topicId);

      return NextResponse.json({ design, review }, { status: 201 });
    } catch (err) {
      console.error("AI review failed, saving design without review:", err);
      // Fall through — save design as "submitted" without review
    }
  }

  // No AI keys or review failed — save as "submitted"
  await updateDesignStatus(design._id.toString(), "submitted");
  design.status = "submitted";
  await incrementSubmissionCount(body.topicId);

  return NextResponse.json({ design, review: null }, { status: 201 });
}
