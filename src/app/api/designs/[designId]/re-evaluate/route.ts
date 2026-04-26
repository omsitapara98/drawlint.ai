import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignById } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import { getResponsesByReviewId, upsertReEvalSignal, getReEvalSignal } from "@/lib/db/responses";
import { getUserAiSettings } from "@/lib/db/users";
import { resolveAnalysisProvider, isResolutionError } from "@/lib/ai/resolve-provider";
import { createProvider } from "@/lib/ai";

interface ReEvalBody {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
}

const RE_EVAL_PROMPT = `You are the Lead Reviewer on a system design interview panel.

You previously gave an initial hire signal based on a design review. The candidate has now VERBALLY RESPONDED to some of the issues raised, just like they would in a real interview when probed by the panel.

Your job: re-evaluate the hire signal considering the candidate's responses.

RULES:
- Each response has been independently evaluated with a verdict: resolved, partially-addressed, or not-addressed.
- "resolved" means the candidate gave a specific, technically sound answer that satisfies the concern.
- "partially-addressed" means the direction was right but lacked depth.
- "not-addressed" means the concern remains.
- RESOLVED issues should be treated as if the design addressed them — upgrade your signal accordingly.
- PARTIALLY-ADDRESSED issues should reduce the weight of that concern but not eliminate it.
- NOT-ADDRESSED issues remain as-is.
- The updated signal should reflect what the candidate demonstrated through BOTH the design AND their verbal responses — this is closer to a real interview outcome.
- Be fair: if a candidate resolves the critical gaps that drove a lower signal, upgrade the signal.

Return a JSON object with EXACTLY this structure:
{
  "updatedSignal": "strong-hire" | "hire" | "lean-hire" | "lean-no-hire" | "no-hire",
  "updatedSignalReason": "<2-3 sentence justification for the updated signal, referencing what was resolved and what remains>"
}

Return ONLY valid JSON. No markdown fences.`;

/** POST — re-evaluate hire signal with responses factored in */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await params;

  // Validate ownership
  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }
  if (!design || design.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const review = await getReviewByDesignId(designId);
  if (!review || !review.leadReviewer) {
    return NextResponse.json({ error: "No review found." }, { status: 404 });
  }

  // Rate limit: max 5 re-evaluations per design
  const existingReeval = await getReEvalSignal(review._id.toString());
  if (existingReeval) {
    // Check if created recently (within 5 minutes)
    const client = await import("@/lib/db/mongodb").then((m) => m.default);
    const reevalDoc = await client.db("drawlint-db").collection("reeval_signals").findOne({ reviewId: review._id });
    if (reevalDoc?.createdAt) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (new Date(reevalDoc.createdAt as string) > fiveMinAgo) {
        return NextResponse.json(
          { error: "Please wait a few minutes before re-evaluating again." },
          { status: 429 },
        );
      }
    }
  }

  const responses = await getResponsesByReviewId(review._id.toString());
  if (responses.length === 0) {
    return NextResponse.json({ error: "No responses to evaluate." }, { status: 400 });
  }

  const resolvedCount = responses.filter((r) => r.verdict === "resolved").length;
  const partialCount = responses.filter((r) => r.verdict === "partially-addressed").length;

  if (resolvedCount === 0 && partialCount === 0) {
    return NextResponse.json({ error: "No issues have been addressed yet." }, { status: 400 });
  }

  // Parse body for BYO credentials
  let body: ReEvalBody = {};
  try {
    body = (await request.json()) as ReEvalBody;
  } catch {
    // No body is fine for managed mode
  }

  // Resolve provider
  const userSettings = await getUserAiSettings(session.user.id);
  const providerResult = resolveAnalysisProvider(userSettings, body);
  if (isResolutionError(providerResult)) {
    return NextResponse.json(
      { error: providerResult.error },
      { status: providerResult.status },
    );
  }

  // Build user content with original signal + response summaries
  const lines: string[] = [];
  lines.push(`ORIGINAL HIRE SIGNAL: ${review.leadReviewer.signal}`);
  lines.push(`ORIGINAL REASON: ${review.leadReviewer.signalReason}`);
  lines.push("");
  lines.push("ORIGINAL TOP RISKS:");
  for (const risk of review.leadReviewer.topRisks) {
    lines.push(`  - ${risk}`);
  }
  lines.push("");
  lines.push(`CANDIDATE RESPONSES (${responses.length} total, ${resolvedCount} resolved, ${partialCount} partially addressed):`);
  lines.push("");

  for (const r of responses) {
    lines.push(`--- ${r.section} / Issue: "${r.originalIssue.title}" (${r.originalIssue.severity}) ---`);
    lines.push(`Candidate said: "${r.userResponse}"`);
    lines.push(`Verdict: ${r.verdict}`);
    lines.push(`Evaluation: ${r.explanation}`);
    lines.push("");
  }

  try {
    const provider = createProvider(providerResult.credentials);
    const result = await provider.generate({
      systemPrompt: RE_EVAL_PROMPT,
      userContent: lines.join("\n"),
      maxTokens: 512,
    });

    const parsed = result.parsed as { updatedSignal?: string; updatedSignalReason?: string };
    const validSignals = ["strong-hire", "hire", "lean-hire", "lean-no-hire", "no-hire"];
    const updatedSignal = validSignals.includes(parsed.updatedSignal ?? "")
      ? parsed.updatedSignal!
      : review.leadReviewer.signal;
    const updatedSignalReason = typeof parsed.updatedSignalReason === "string"
      ? parsed.updatedSignalReason
      : "Unable to re-evaluate.";

    // Store separately (don't mutate original review)
    await upsertReEvalSignal({
      designId,
      reviewId: review._id.toString(),
      originalSignal: review.leadReviewer.signal,
      updatedSignal,
      updatedSignalReason,
      resolvedCount,
      partialCount,
      totalResponses: responses.length,
    });

    return NextResponse.json({
      originalSignal: review.leadReviewer.signal,
      updatedSignal,
      updatedSignalReason,
      resolvedCount,
      partialCount,
      totalResponses: responses.length,
    });
  } catch (err) {
    console.error("Re-evaluation failed:", err);
    return NextResponse.json(
      { error: "Re-evaluation failed. Please try again." },
      { status: 500 },
    );
  }
}

/** GET — fetch existing re-evaluated signal */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const { designId } = await params;

  // Validate ObjectId format
  if (!/^[a-f0-9]{24}$/.test(designId)) {
    return NextResponse.json({ reeval: null });
  }

  const review = await getReviewByDesignId(designId);
  if (!review) {
    return NextResponse.json({ reeval: null });
  }

  const reeval = await getReEvalSignal(review._id.toString());
  return NextResponse.json({ reeval });
}
