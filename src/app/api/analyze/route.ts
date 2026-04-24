import { NextResponse } from "next/server";
import type { ParsedDiagram } from "@/types/diagram";
import type { ReviewLevel } from "@/types/feedback";
import { analyzeDesign, AzureOpenAIError } from "@/lib/ai";

const VALID_LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

interface AnalyzeRequestBody {
  diagram?: ParsedDiagram;
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  level?: ReviewLevel;
}

export async function POST(request: Request) {
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

  // Require BYO credentials — no platform key fallback
  if (!body.apiKey) {
    return NextResponse.json(
      { error: "An Azure OpenAI API key is required. Configure your key in Settings." },
      { status: 400 },
    );
  }

  try {
    const level: ReviewLevel = body.level && VALID_LEVELS.includes(body.level) ? body.level : "senior";

    const review = await analyzeDesign(body.diagram, {
      apiKey: body.apiKey,
      endpoint: body.endpoint,
      deployment: body.deployment,
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
