import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { ParsedDiagram } from "@/types/diagram";
import type { ReviewLevel } from "@/types/feedback";
import { analyzeDesign, AzureOpenAIError } from "@/lib/ai";
import { isEmailVerified, getUserAiSettings } from "@/lib/db/users";
import { resolveAnalysisProvider, isResolutionError } from "@/lib/ai/resolve-provider";

const VALID_LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

interface AnalyzeRequestBody {
  diagram?: ParsedDiagram;
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  level?: ReviewLevel;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verified = await isEmailVerified(session.user.id);
  if (!verified) {
    return NextResponse.json(
      {
        error: "Please verify your email before submitting designs. Check your inbox for a verification link.",
        emailNotVerified: true,
      },
      { status: 403 },
    );
  }

  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  // Validate diagram
  if (!body.diagram || typeof body.diagram !== "object") {
    return NextResponse.json(
      { error: "Missing required field: diagram." },
      { status: 400 },
    );
  }

  if (
    !body.diagram.hld ||
    !Array.isArray(body.diagram.hld.nodes) ||
    body.diagram.hld.nodes.length === 0
  ) {
    return NextResponse.json(
      { error: "Diagram must contain at least one node in the HLD." },
      { status: 400 },
    );
  }

  // Resolve provider from user settings
  const userSettings = await getUserAiSettings(session.user.id);
  const providerResult = resolveAnalysisProvider(userSettings, body);

  if (isResolutionError(providerResult)) {
    return NextResponse.json(
      { error: providerResult.error, code: providerResult.errorCode },
      { status: providerResult.status },
    );
  }

  try {
    const level: ReviewLevel = body.level && VALID_LEVELS.includes(body.level) ? body.level : "senior";

    const review = await analyzeDesign(body.diagram, {
      credentials: providerResult.credentials,
      level,
    });

    return NextResponse.json(review);
  } catch (err) {
    if (err instanceof AzureOpenAIError) {
      const status = err.statusCode ?? 500;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred during analysis." },
      { status: 500 },
    );
  }
}
