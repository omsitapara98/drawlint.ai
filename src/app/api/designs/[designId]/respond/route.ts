import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignById } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import { upsertResponse } from "@/lib/db/responses";
import { getUserAiSettings } from "@/lib/db/users";
import { resolveAnalysisProvider, isResolutionError } from "@/lib/ai/resolve-provider";
import { createProvider } from "@/lib/ai";
import { getIssueResponsePrompt } from "@/lib/ai/response-prompt";
import type { ReviewSection } from "@/types/library";
import type { FeedbackItem } from "@/types/feedback";

const VALID_SECTIONS: (ReviewSection | "followUpQuestions")[] = [
  "nfrReview", "entitiesReview", "capacityReview", "apiReview", "hldReview", "followUpQuestions",
];

// In-memory rate limit: 20 respond calls per hour per userId (managed mode only)
const RESPOND_MAX = 20;
const RESPOND_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const respondAttempts = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of respondAttempts) {
    if (now - record.windowStart > RESPOND_WINDOW_MS) respondAttempts.delete(key);
  }
}, 30 * 60 * 1000).unref?.();

interface RespondBody {
  section: string;
  issueIndex: number;
  response: string;
  // BYO credentials (same pattern as analyze routes)
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
}

/** POST — evaluate a user's response to a specific issue */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await params;

  // Validate design exists and user owns it
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
    return NextResponse.json({ error: "You can only respond to your own designs." }, { status: 403 });
  }

  // Get the review
  const review = await getReviewByDesignId(designId);
  if (!review) {
    return NextResponse.json({ error: "No review found for this design." }, { status: 404 });
  }

  // Parse body
  let body: RespondBody;
  try {
    body = (await request.json()) as RespondBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // In-memory rate limit (managed mode only — BYO key users exempt)
  if (!body.apiKey) {
    const userId = session.user.id;
    const now = Date.now();
    const record = respondAttempts.get(userId) ?? { count: 0, windowStart: now };
    if (now - record.windowStart > RESPOND_WINDOW_MS) {
      record.count = 0;
      record.windowStart = now;
    }
    if (record.count >= RESPOND_MAX) {
      return NextResponse.json(
        { error: "Rate limit reached. You can respond to up to 20 issues per hour." },
        { status: 429 },
      );
    }
    record.count++;
    respondAttempts.set(userId, record);
  }

  // Validate section
  const section = body.section as ReviewSection | "followUpQuestions";
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Invalid section." }, { status: 400 });
  }

  // Validate issue index + get original content
  let originalIssue: { severity: "critical" | "warning" | "info"; title: string; description: string };
  let isFollowUp = false;

  if (section === "followUpQuestions") {
    isFollowUp = true;
    if (!review.followUpQuestions || body.issueIndex < 0 || body.issueIndex >= review.followUpQuestions.length) {
      return NextResponse.json({ error: "Invalid question index." }, { status: 400 });
    }
    originalIssue = {
      severity: "info",
      title: `Follow-up Q${body.issueIndex + 1}`,
      description: review.followUpQuestions[body.issueIndex],
    };
  } else {
    const dimension = review[section];
    if (!dimension || !Array.isArray(dimension.issues)) {
      return NextResponse.json({ error: "Section has no issues." }, { status: 400 });
    }
    if (body.issueIndex < 0 || body.issueIndex >= dimension.issues.length) {
      return NextResponse.json({ error: "Invalid issue index." }, { status: 400 });
    }
    originalIssue = dimension.issues[body.issueIndex] as FeedbackItem;
  }

  // Validate response text
  const responseText = body.response?.trim();
  if (!responseText || responseText.length < 10) {
    return NextResponse.json({ error: "Response must be at least 10 characters." }, { status: 400 });
  }
  if (responseText.length > 2000) {
    return NextResponse.json({ error: "Response must be under 2000 characters." }, { status: 400 });
  }

  // Block responses to critical issues — those should be fixed in the design
  if (!isFollowUp && originalIssue.severity === "critical") {
    return NextResponse.json(
      { error: "Critical issues should be addressed by updating your design, not via verbal response." },
      { status: 400 },
    );
  }

  // Resolve AI provider (same as analyze routes)
  const userSettings = await getUserAiSettings(session.user.id);
  const providerResult = resolveAnalysisProvider(userSettings, body);
  if (isResolutionError(providerResult)) {
    return NextResponse.json(
      { error: providerResult.error, code: providerResult.errorCode },
      { status: providerResult.status },
    );
  }

  // Build prompt with context
  const sectionLabels: Record<string, string> = {
    nfrReview: "Non-Functional Requirements",
    entitiesReview: "Core Entities",
    capacityReview: "Capacity Calculations",
    apiReview: "API Design",
    hldReview: "High-Level Design",
    followUpQuestions: "Follow-up Interview Question",
  };

  const promptCtx = getIssueResponsePrompt({
    section: sectionLabels[section] ?? section,
    issueSeverity: isFollowUp ? "question" : originalIssue.severity,
    issueTitle: originalIssue.title,
    issueDescription: originalIssue.description,
  });

  // Call AI
  try {
    const provider = createProvider(providerResult.credentials);
    const result = await provider.generate({
      systemPrompt: promptCtx.systemPrompt,
      userContent: promptCtx.userContent + "\n" + responseText,
      maxTokens: 256,
    });

    const parsed = result.parsed as { verdict?: string; explanation?: string };
    const validVerdicts = ["resolved", "partially-addressed", "not-addressed"];
    const verdict = validVerdicts.includes(parsed.verdict ?? "")
      ? (parsed.verdict as "resolved" | "partially-addressed" | "not-addressed")
      : "not-addressed";
    const explanation = typeof parsed.explanation === "string"
      ? parsed.explanation
      : "Unable to evaluate response.";

    // Store the response
    const stored = await upsertResponse({
      designId,
      reviewId: review._id.toString(),
      userId: session.user.id,
      section,
      issueIndex: body.issueIndex,
      originalIssue: {
        severity: originalIssue.severity,
        title: originalIssue.title,
        description: originalIssue.description,
      },
      userResponse: responseText,
      verdict,
      explanation,
      evaluatedBy: providerResult.credentials.provider,
    });

    return NextResponse.json({
      verdict,
      explanation,
      responseId: stored._id.toString(),
    });
  } catch (err) {
    console.error("Response evaluation failed:", err);
    return NextResponse.json(
      { error: "Response evaluation failed. Please try again." },
      { status: 500 },
    );
  }
}

/** GET — fetch all responses for a design (public — peer library) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const { designId } = await params;

  // Validate ObjectId format
  if (!/^[a-f0-9]{24}$/.test(designId)) {
    return NextResponse.json({ responses: [] });
  }

  const responses = await getResponsesByDesignId(designId);

  return NextResponse.json({
    responses: responses.map((r) => ({
      section: r.section,
      issueIndex: r.issueIndex,
      userResponse: r.userResponse,
      verdict: r.verdict,
      explanation: r.explanation,
      createdAt: r.createdAt,
    })),
  });
}
