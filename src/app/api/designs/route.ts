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
import {
  getUserAiSettings,
  reserveManagedQuota,
  releaseManagedQuota,
  isEmailVerified,
} from "@/lib/db/users";
import { analyzeDesign } from "@/lib/ai";
import { parseDiagram } from "@/lib/diagram";
import type { SubmitDesignInput } from "@/types/library";
import type { ReviewLevel } from "@/types/feedback";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

interface DesignRequestBody extends SubmitDesignInput {
  draft?: boolean;
}

const VALID_LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson",
  "Cache-Control": "no-cache, no-transform",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DesignRequestBody;
  try {
    body = (await request.json()) as DesignRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  if (!body.topicId || typeof body.topicId !== "string") {
    return NextResponse.json({ error: "topicId is required." }, { status: 400 });
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
      : "senior";

  const userId = session.user.id;

  // ── Draft save fast path ─────────────────────────────────────
  if (body.draft) {
    const latestVersion = await getLatestVersion(body.topicId, userId);
    const version = latestVersion + 1;
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

    const design = await createDesign({
      topicId: body.topicId,
      userId,
      blobUrl,
      blobKey,
      reviewLevel,
      version,
      forkedFrom: body.forkedFrom,
      status: "draft",
    });

    return NextResponse.json({
      designId: design._id.toString(),
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

  // ── Resolve pseudonym if posting anonymously ───────────────────
  let anonymousName: string | undefined;
  if (body.anonymous) {
    const { ObjectId: OId } = await import("mongodb");
    const mongoClient = await (await import("@/lib/db/mongodb")).default;
    const usersCol = mongoClient.db("drawlint-db").collection("users");
    const user = await usersCol.findOne(
      { _id: new OId(userId) },
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
      await usersCol.updateOne({ _id: new OId(userId) }, { $set: { pseudonym: anonymousName } });
    }
  }

  // ── 1. Determine version ───────────────────────────────────────
  const latestVersion = await getLatestVersion(body.topicId, userId);
  const version = latestVersion + 1;

  // ── 2. Upload elements to blob storage ─────────────────────────
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

  // ── 3. Parse diagram (for AI review only, not stored) ──────────
  const diagram = parseDiagram(body.elements as ExcalidrawElement[]);

  // ── 4. Create design doc ───────────────────────────────────────
  const design = await createDesign({
    topicId: body.topicId,
    userId,
    blobUrl,
    blobKey,
    reviewLevel,
    version,
    forkedFrom: body.forkedFrom,
    anonymousName,
  });

  const encoder = new TextEncoder();

  // ── No-AI fast path ────────────────────────────────────────────
  if (!credentials) {
    await updateDesignStatus(design._id.toString(), "submitted");
    await incrementSubmissionCount(body.topicId);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "design", designId: design._id.toString(), version }) + "\n"));
        controller.enqueue(encoder.encode(JSON.stringify({ type: "complete", review: null }) + "\n"));
        controller.close();
      },
    });
    return new Response(stream, { headers: NDJSON_HEADERS });
  }

  // ── AI path — runs to completion even if client disconnects ────
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* client disconnected */ }
      };

      enqueue({ type: "design", designId: design._id.toString(), version });

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
        await updateDesignStatus(design._id.toString(), "reviewed");
        await incrementSubmissionCount(body.topicId);

        enqueue({ type: "complete", review: aiResult });
      } catch (err) {
        console.error("AI review failed:", err);
        enqueue({ type: "error", message: err instanceof Error ? err.message : "AI review failed" });
        if (isManagedMode) await releaseManagedQuota(userId).catch(console.error);
        await updateDesignStatus(design._id.toString(), "submitted").catch(console.error);
        await incrementSubmissionCount(body.topicId).catch(console.error);
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}
