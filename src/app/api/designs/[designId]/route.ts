import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignById, deleteDesign, updateDesignBlob, updateDesignStatus } from "@/lib/db/designs";
import { getReviewByDesignId, deleteReviewByDesignId, createReview } from "@/lib/db/reviews";
import { decrementSubmissionCount } from "@/lib/db/topics";
import { uploadDesign, deleteDesign as deleteBlob } from "@/lib/blob/storage";
import { analyzeDesign } from "@/lib/ai";
import { parseDiagram } from "@/lib/diagram";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import type { Topic } from "@/types/library";
import type { ReviewLevel } from "@/types/feedback";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const DB_NAME = "drawlint-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const { designId } = await params;

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const review = await getReviewByDesignId(designId);

  // Fetch author info
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const author = await db.collection("users").findOne(
    { _id: new ObjectId(design.userId) },
    { projection: { _id: 1, name: 1, image: 1 } },
  );

  // Fetch topic
  const topic = await db
    .collection<Topic>("topics")
    .findOne({ _id: new ObjectId(design.topicId) });

  return NextResponse.json({ design, review, author, topic });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await params;

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  // Must be the author
  if (design.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete blob
  try {
    await deleteBlob(design.blobKey);
  } catch (err) {
    console.error("Failed to delete blob:", err);
  }

  // Delete review
  await deleteReviewByDesignId(designId);

  // Delete design doc
  await deleteDesign(designId);

  // Decrement topic count
  await decrementSubmissionCount(design.topicId.toString());

  return new NextResponse(null, { status: 204 });
}

const VALID_LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await params;

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  if (design.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    elements?: unknown[];
    reviewLevel?: ReviewLevel;
    anonymous?: boolean;
    apiKey?: string;
    endpoint?: string;
    deployment?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  if (!Array.isArray(body.elements) || body.elements.length === 0) {
    return NextResponse.json(
      { error: "elements array is required and must not be empty." },
      { status: 400 },
    );
  }

  const reviewLevel: ReviewLevel =
    body.reviewLevel && VALID_LEVELS.includes(body.reviewLevel)
      ? body.reviewLevel
      : design.reviewLevel;

  const userId = session.user.id;
  const version = design.version + 1;

  // Resolve anonymous name if toggled on
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  let anonymousName: string | undefined;
  if (body.anonymous) {
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { pseudonym: 1 } },
    );
    if (user?.pseudonym) {
      anonymousName = user.pseudonym as string;
    } else {
      const ADJECTIVES = ["Swift","Brave","Curious","Clever","Bold","Calm","Keen","Wise","Noble","Bright","Agile","Steady","Quick","Sharp","Silent","Fierce","Gentle","Witty","Daring","Nimble"];
      const ANIMALS = ["Panda","Eagle","Fox","Wolf","Owl","Bear","Hawk","Lion","Tiger","Falcon","Lynx","Raven","Cobra","Otter","Shark","Phoenix","Dragon","Panther","Jaguar","Viper"];
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const num = Math.floor(Math.random() * 90) + 10;
      anonymousName = `${adj} ${animal} ${num}`;
      await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { pseudonym: anonymousName } });
    }
  }

  // 1. Delete old blob
  try {
    await deleteBlob(design.blobKey);
  } catch (err) {
    console.error("Failed to delete old blob:", err);
  }

  // 2. Upload new blob
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

  // 3. Update design document
  await updateDesignBlob(designId, blobUrl, blobKey);
  // Also bump version + reviewLevel + anonymousName
  const col = (await clientPromise).db(DB_NAME).collection("designs");
  const updateFields: Record<string, unknown> = { version, reviewLevel, updatedAt: new Date() };
  if (anonymousName) {
    updateFields.anonymousName = anonymousName;
  } else if (body.anonymous === false) {
    // Explicitly remove anonymousName when toggling off
  }
  await col.updateOne(
    { _id: new ObjectId(designId) },
    anonymousName
      ? { $set: updateFields }
      : { $set: updateFields, $unset: { anonymousName: "" } },
  );

  // 4. Delete old review
  await deleteReviewByDesignId(designId);

  // 5. Parse diagram for AI
  const diagram = parseDiagram(body.elements as ExcalidrawElement[]);

  // 6. Attempt AI review
  const apiKey = body.apiKey || process.env.AZURE_OPENAI_API_KEY;
  const endpoint = body.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = body.deployment || process.env.AZURE_OPENAI_DEPLOYMENT;

  if (apiKey && endpoint && deployment) {
    try {
      const aiResult = await analyzeDesign(diagram, {
        apiKey,
        endpoint,
        deployment,
        level: reviewLevel,
      });

      const review = await createReview({
        designId,
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

      await updateDesignStatus(designId, "reviewed");

      const updatedDesign = await getDesignById(designId);
      return NextResponse.json({ design: updatedDesign, review });
    } catch (err) {
      console.error("AI review failed during update:", err);
    }
  }

  // No AI keys or review failed
  await updateDesignStatus(designId, "submitted");
  const updatedDesign = await getDesignById(designId);
  return NextResponse.json({ design: updatedDesign, review: null });
}
