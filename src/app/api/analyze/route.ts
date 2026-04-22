import { NextResponse } from "next/server";
import type { ParsedDiagram } from "@/types/diagram";
import type { ReviewLevel, ReviewMode } from "@/types/feedback";
import { analyzeDesign, analyzeDesignMultiCall, AzureOpenAIError } from "@/lib/ai";

const VALID_LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];
const VALID_MODES: ReviewMode[] = ["single", "multi"];

interface AnalyzeRequestBody {
  diagram?: ParsedDiagram;
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  level?: ReviewLevel;
  mode?: ReviewMode;
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

  // Check that credentials are available (BYO or platform)
  const hasApiKey = !!body.apiKey || !!process.env.AZURE_OPENAI_API_KEY;
  if (!hasApiKey) {
    return NextResponse.json(
      {
        error:
          "No Azure OpenAI API key available. Either provide your own key in the request or configure the platform key.",
      },
      { status: 400 },
    );
  }

  try {
    const level: ReviewLevel = body.level && VALID_LEVELS.includes(body.level) ? body.level : "senior";
    const mode: ReviewMode = body.mode && VALID_MODES.includes(body.mode) ? body.mode : "single";

    const opts = {
      apiKey: body.apiKey,
      endpoint: body.endpoint,
      deployment: body.deployment,
      level,
    };

    const review = mode === "multi"
      ? await analyzeDesignMultiCall(body.diagram, opts)
      : await analyzeDesign(body.diagram, opts);

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
