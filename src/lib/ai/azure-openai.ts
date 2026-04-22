import type { ParsedDiagram } from "@/types/diagram";
import type { AIReviewResponse, ReviewDimension, FeedbackItem, ReviewLevel, LeadReviewer } from "@/types/feedback";
import { getReviewPrompt } from "./prompts";
import { formatDiagramForAnalysis } from "./format-prompt";

interface AnalyzeOptions {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  level?: ReviewLevel;
}

export class AzureOpenAIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AzureOpenAIError";
  }
}

/**
 * Analyze a system design diagram using Azure OpenAI with level-based review prompts.
 *
 * Uses the caller's own Azure OpenAI credentials (BYO key).
 */
export async function analyzeDesign(
  diagram: ParsedDiagram,
  options?: AnalyzeOptions,
): Promise<AIReviewResponse> {
  const apiKey = options?.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? "";
  const endpoint = options?.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
  const deployment = options?.deployment ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "";
  const level: ReviewLevel = options?.level ?? "senior";
  const apiVersion = "2025-01-01-preview";

  if (!apiKey) {
    throw new AzureOpenAIError(
      "No Azure OpenAI API key configured. Provide your own key or set AZURE_OPENAI_API_KEY.",
      400,
      "missing_api_key",
    );
  }
  if (!endpoint) {
    throw new AzureOpenAIError(
      "No Azure OpenAI endpoint configured. Provide your own endpoint or set AZURE_OPENAI_ENDPOINT.",
      400,
      "missing_endpoint",
    );
  }
  if (!deployment) {
    throw new AzureOpenAIError(
      "No Azure OpenAI deployment configured. Provide your own deployment or set AZURE_OPENAI_DEPLOYMENT.",
      400,
      "missing_deployment",
    );
  }

  const formattedDiagram = formatDiagramForAnalysis(diagram, level);

  const url = `${endpoint.replace(/\/+$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const body = {
    messages: [
      { role: "system", content: getReviewPrompt(level) },
      { role: "user", content: formattedDiagram },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new AzureOpenAIError(
      `Network error connecting to Azure OpenAI: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      "network_error",
    );
  }

  if (!response.ok) {
    const status = response.status;
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      // ignore read errors
    }

    if (status === 401 || status === 403) {
      throw new AzureOpenAIError(
        "Authentication failed. Check your Azure OpenAI API key and endpoint.",
        status,
        "auth_error",
      );
    }
    if (status === 429) {
      throw new AzureOpenAIError(
        "Rate limit exceeded. Please wait a moment and try again.",
        429,
        "rate_limit",
      );
    }
    throw new AzureOpenAIError(
      `Azure OpenAI request failed (HTTP ${status}): ${errorBody}`,
      status,
      "api_error",
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new AzureOpenAIError(
      "Failed to parse Azure OpenAI response as JSON.",
      undefined,
      "parse_error",
    );
  }

  // Extract the assistant message content
  const content = extractContent(json);

  // Parse the inner JSON from the assistant message
  let review: AIReviewResponse;
  try {
    review = JSON.parse(content) as AIReviewResponse;
  } catch {
    throw new AzureOpenAIError(
      "Azure OpenAI returned a non-JSON response. The model may have produced invalid output.",
      undefined,
      "malformed_response",
    );
  }

  return validateReview(review, level);
}

/** Extract the text content from the Azure OpenAI chat completion response. */
function extractContent(json: unknown): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "choices" in json &&
    Array.isArray((json as Record<string, unknown>).choices)
  ) {
    const choices = (json as Record<string, unknown>).choices as unknown[];
    const first = choices[0];
    if (
      typeof first === "object" &&
      first !== null &&
      "message" in first &&
      typeof (first as Record<string, unknown>).message === "object"
    ) {
      const message = (first as Record<string, unknown>).message as Record<string, unknown>;
      if (typeof message.content === "string") {
        return message.content;
      }
    }
  }
  throw new AzureOpenAIError(
    "Unexpected response structure from Azure OpenAI.",
    undefined,
    "malformed_response",
  );
}

/** Validate a single FeedbackItem. */
function validateItem(item: unknown): FeedbackItem {
  const raw = item as Record<string, unknown>;
  const severity = raw.severity;
  return {
    severity:
      severity === "critical" || severity === "warning" || severity === "info"
        ? severity
        : "info",
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
    affectedComponents: Array.isArray(raw.affectedComponents)
      ? (raw.affectedComponents as string[])
      : [],
  };
}

/** Validate a ReviewDimension. */
function validateDimension(raw: unknown): ReviewDimension {
  if (typeof raw !== "object" || raw === null) {
    return { score: 5, issues: [] };
  }
  const d = raw as Record<string, unknown>;
  return {
    score:
      typeof d.score === "number" ? Math.max(1, Math.min(10, d.score)) : 5,
    issues: Array.isArray(d.issues) ? d.issues.map(validateItem) : [],
  };
}

/** Validate the lead reviewer object. */
function validateLeadReviewer(raw: unknown): LeadReviewer {
  if (typeof raw !== "object" || raw === null) {
    return {
      topStrengths: [],
      topRisks: [],
      signal: "lean-hire",
      signalReason: "",
      improvementAreas: [],
    };
  }
  const d = raw as Record<string, unknown>;
  const validSignals = ["strong-hire", "hire", "lean-hire", "lean-no-hire", "no-hire"] as const;
  const signal = validSignals.includes(d.signal as typeof validSignals[number])
    ? (d.signal as LeadReviewer["signal"])
    : "lean-hire";
  return {
    topStrengths: Array.isArray(d.topStrengths) ? (d.topStrengths as string[]).slice(0, 5) : [],
    topRisks: Array.isArray(d.topRisks) ? (d.topRisks as string[]).slice(0, 5) : [],
    signal,
    signalReason: typeof d.signalReason === "string" ? d.signalReason : "",
    improvementAreas: Array.isArray(d.improvementAreas) ? (d.improvementAreas as string[]) : [],
  };
}

/** Validate and normalize the parsed AIReviewResponse. */
function validateReview(raw: AIReviewResponse, level: ReviewLevel): AIReviewResponse {
  const flowRaw = raw.flowAnalysis;
  const base: AIReviewResponse = {
    level,
    score:
      typeof raw.score === "number"
        ? Math.max(0, Math.min(100, raw.score))
        : 0,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    bottlenecks: validateDimension(raw.bottlenecks),
    flowAnalysis: {
      criticalPath:
        typeof flowRaw === "object" &&
        flowRaw !== null &&
        Array.isArray(flowRaw.criticalPath)
          ? flowRaw.criticalPath
          : [],
      missingEdges:
        typeof flowRaw === "object" &&
        flowRaw !== null &&
        Array.isArray(flowRaw.missingEdges)
          ? flowRaw.missingEdges
          : [],
      sequenceGaps:
        typeof flowRaw === "object" &&
        flowRaw !== null &&
        Array.isArray(flowRaw.sequenceGaps)
          ? flowRaw.sequenceGaps
          : [],
    },
    leadReviewer: validateLeadReviewer(raw.leadReviewer),
    followUpQuestions: Array.isArray(raw.followUpQuestions)
      ? raw.followUpQuestions
      : [],
  };

  // Add level-specific dimensions
  if (level === "mid") {
    base.correctness = validateDimension(raw.correctness);
  }
  if (level === "senior" || level === "staff" || level === "deep") {
    base.scalability = validateDimension(raw.scalability);
    base.reliability = validateDimension(raw.reliability);
  }
  if (level === "staff" || level === "deep") {
    base.completeness = validateDimension(raw.completeness);
  }
  if (level === "deep") {
    base.security = validateDimension(raw.security);
  }

  return base;
}
