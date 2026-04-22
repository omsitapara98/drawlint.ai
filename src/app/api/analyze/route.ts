import { NextResponse } from "next/server";
import type { SerializedDiagram } from "@/types/diagram";
import { analyzeDesign, AzureOpenAIError } from "@/lib/ai";

interface AnalyzeRequestBody {
  diagram?: SerializedDiagram;
  sections?: Record<string, string>;
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
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

  if (!Array.isArray(body.diagram.nodes) || body.diagram.nodes.length === 0) {
    return NextResponse.json(
      { error: "Diagram must contain at least one node." },
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
    const feedback = await analyzeDesign(body.diagram, {
      apiKey: body.apiKey,
      endpoint: body.endpoint,
      deployment: body.deployment,
      sections: body.sections,
    });

    return NextResponse.json(feedback);
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
