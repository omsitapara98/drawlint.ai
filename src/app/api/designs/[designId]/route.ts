import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignById, deleteDesign, updateDesignBlob, updateDesignStatus } from "@/lib/db/designs";
import { getReviewByDesignId, deleteReviewByDesignId, createReview } from "@/lib/db/reviews";
import { deleteResponsesByDesignId } from "@/lib/db/responses";
import { decrementSubmissionCount, incrementSubmissionCount } from "@/lib/db/topics";
import { uploadDesign, deleteDesign as deleteBlob } from "@/lib/blob/storage";
import {
  getUserAiSettings,
  reserveManagedQuota,
  releaseManagedQuota,
  isEmailVerified,
} from "@/lib/db/users";
import { analyzeDesign } from "@/lib/ai";
import { parseDiagram } from "@/lib/diagram";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import type { Topic } from "@/types/library";
import type { ReviewLevel } from "@/types/feedback";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const DB_NAME = "drawlint-db";

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson",
  "Cache-Control": "no-cache, no-transform",
  "X-Content-Type-Options": "nosniff",
};

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

  // Draft privacy — only the owner can view their drafts
  if (design.status === "draft") {
    const session = await auth();
    if (!session?.user?.id || design.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Design not found." }, { status: 404 });
    }
  }

  const review = await getReviewByDesignId(designId);

  // Fetch responses for the design
  const { getResponsesByDesignId } = await import("@/lib/db/responses");
  const issueResponses = await getResponsesByDesignId(designId);

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

  return NextResponse.json({
    design,
    review,
    author,
    topic,
    responses: issueResponses.map((r) => ({
      section: r.section,
      issueIndex: r.issueIndex,
      userResponse: r.userResponse,
      verdict: r.verdict,
      explanation: r.explanation,
    })),
  });
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

  // Submitted challenge designs cannot be deleted (drafts can)
  if (design.submissionType === "challenge" && design.status !== "draft") {
    return NextResponse.json(
      { error: "Weekly challenge submissions cannot be deleted." },
      { status: 403 },
    );
  }

  // Delete blob
  try {
    await deleteBlob(design.blobKey);
  } catch (err) {
    console.error("Failed to delete blob:", err);
  }

  // Delete review + responses
  await deleteReviewByDesignId(designId);
  await deleteResponsesByDesignId(designId);

  // Delete design doc
  await deleteDesign(designId);

  // Decrement topic count (only for non-draft designs that were publicly counted)
  if (design.status !== "draft") {
    await decrementSubmissionCount(design.topicId.toString());
  }

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
    draft?: boolean;
    /** BYO key mode: sent from client localStorage, never stored server-side */
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
  const MAX_ELEMENTS = 5000;
  if (body.elements.length > MAX_ELEMENTS) {
    return NextResponse.json(
      { error: `Design exceeds maximum of ${MAX_ELEMENTS} elements.` },
      { status: 413 },
    );
  }

  const reviewLevel: ReviewLevel =
    body.reviewLevel && VALID_LEVELS.includes(body.reviewLevel)
      ? body.reviewLevel
      : design.reviewLevel;

  const userId = session.user.id;
  const version = design.version + 1;

  // ── Draft update fast path ──────────────────────────────────────
  if (body.draft) {
    // Delete old blob
    try {
      await deleteBlob(design.blobKey);
    } catch (err) {
      console.error("Failed to delete old blob:", err);
    }

    // Upload new blob
    let blobUrl: string;
    let blobKey: string;
    try {
      const result = await uploadDesign(userId, designId, version, body.elements!);
      blobUrl = result.blobUrl;
      blobKey = result.blobKey;
    } catch (err) {
      console.error("Blob upload failed:", err);
      return NextResponse.json(
        { error: "Failed to upload design to storage." },
        { status: 500 },
      );
    }

    // Update design document — keep status as "draft"
    const col = (await clientPromise).db(DB_NAME).collection("designs");
    await col.updateOne(
      { _id: new ObjectId(designId) },
      { $set: { blobUrl, blobKey, version, reviewLevel, status: "draft" as const, updatedAt: new Date() } },
    );

    return NextResponse.json({
      designId,
      version,
      status: "draft",
    });
  }

  // ── Email verification gate (all modes) ───────────────────────
  const verified = await isEmailVerified(userId);
  if (!verified) {
    return NextResponse.json(
      {
        error: "Please verify your email before submitting designs. Check your inbox for a verification link.",
        emailNotVerified: true,
      },
      { status: 403 },
    );
  }

  // ── Resolve AI credentials BEFORE any mutations ────────────────
  // Use centralized provider resolver based on user's aiMode.
  const { resolveAnalysisProvider, isResolutionError } = await import("@/lib/ai/resolve-provider");
  const userSettings = await getUserAiSettings(userId);
  const providerResult = resolveAnalysisProvider(userSettings, body);

  let isManagedMode = false;

  if (isResolutionError(providerResult)) {
    return NextResponse.json(
      { error: providerResult.error, code: providerResult.errorCode },
      { status: providerResult.status },
    );
  }

  const credentials = providerResult.credentials;
  isManagedMode = providerResult.isManagedQuota;

  // For managed mode: check and reserve quota
  if (isManagedMode) {
    const quota = await reserveManagedQuota(userId);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `You've used all ${quota.limit} free AI reviews this month. Switch to Free AI or add your own key in Settings to continue.`,
          quotaExceeded: true,
          used: quota.used,
          limit: quota.limit,
        },
        { status: 429 },
      );
    }
  }

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
  const col = (await clientPromise).db(DB_NAME).collection("designs");
  const updateFields: Record<string, unknown> = { version, reviewLevel, updatedAt: new Date() };
  if (anonymousName) {
    updateFields.anonymousName = anonymousName;
  }
  await col.updateOne(
    { _id: new ObjectId(designId) },
    anonymousName
      ? { $set: updateFields }
      : { $set: updateFields, $unset: { anonymousName: "" } },
  );

  // Track if this was a draft being published (for submission count)
  const wasDraft = design.status === "draft";

  // 4. Delete old review + responses
  await deleteReviewByDesignId(designId);
  await deleteResponsesByDesignId(designId);

  // 5. Parse diagram for AI
  const diagram = parseDiagram(body.elements as ExcalidrawElement[]);

  const encoder = new TextEncoder();

  if (!credentials) {
    await updateDesignStatus(designId, "submitted");
    if (wasDraft) await incrementSubmissionCount(design.topicId.toString());
    const updatedDesign = await getDesignById(designId);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "design", designId, version }) + "\n"));
        controller.enqueue(encoder.encode(JSON.stringify({ type: "complete", review: null, design: updatedDesign }) + "\n"));
        controller.close();
      },
    });
    return new Response(stream, { headers: NDJSON_HEADERS });
  }

  // AI path — runs to completion even if client disconnects; review is saved to DB
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* client already disconnected */ }
      };

      enqueue({ type: "design", designId, version });

      try {
        const aiResult = await analyzeDesign(diagram, {
          credentials,
          level: reviewLevel,
          onSectionComplete: (key, data) => {
            enqueue({ type: "section", section: key, data });
          },
          onLeadStarted: () => {
            enqueue({ type: "lead-started" });
          },
        });

        await createReview({
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
          reviewedBy: credentials.provider,
        });

        await updateDesignStatus(designId, "reviewed");
        if (wasDraft) await incrementSubmissionCount(design.topicId.toString());
        const updatedDesign = await getDesignById(designId);

        enqueue({ type: "complete", review: aiResult, design: updatedDesign });
      } catch (err) {
        console.error("AI review failed during update:", err);
        enqueue({ type: "error", message: err instanceof Error ? err.message : "AI review failed" });
        if (isManagedMode) await releaseManagedQuota(userId).catch(console.error);
        await updateDesignStatus(designId, "submitted").catch(console.error);
        if (wasDraft) await incrementSubmissionCount(design.topicId.toString()).catch(console.error);
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}
