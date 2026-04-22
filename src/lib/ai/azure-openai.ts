import type { SerializedDiagram } from "@/types/diagram";
import type { DiagramFeedback } from "@/types/feedback";
import { SYSTEM_DESIGN_REVIEWER_PROMPT } from "./prompts";
import { formatDiagramForAnalysis } from "./format-prompt";

interface AnalyzeOptions {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  sections?: Record<string, string>;
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
 * Analyze a system design diagram using Azure OpenAI.
 *
 * If `options.apiKey` is provided, uses the caller's own Azure OpenAI credentials (BYO key).
 * Otherwise falls back to platform environment variables.
 */
export async function analyzeDesign(
  diagram: SerializedDiagram,
  options?: AnalyzeOptions,
): Promise<DiagramFeedback> {
  const apiKey = options?.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? "";
  const endpoint = options?.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
  const deployment = options?.deployment ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";

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

  const formattedDiagram = formatDiagramForAnalysis(diagram, options?.sections);

  const url = `${endpoint.replace(/\/+$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const body = {
    messages: [
      { role: "system", content: SYSTEM_DESIGN_REVIEWER_PROMPT },
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
  let feedback: DiagramFeedback;
  try {
    feedback = JSON.parse(content) as DiagramFeedback;
  } catch {
    throw new AzureOpenAIError(
      "Azure OpenAI returned a non-JSON response. The model may have produced invalid output.",
      undefined,
      "malformed_response",
    );
  }

  return validateFeedback(feedback);
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

/** Validate and normalize the parsed DiagramFeedback object. */
function validateFeedback(raw: DiagramFeedback): DiagramFeedback {
  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    score: typeof raw.score === "number" ? Math.max(0, Math.min(100, raw.score)) : 0,
    scalabilityIssues: Array.isArray(raw.scalabilityIssues) ? raw.scalabilityIssues : [],
    bottlenecks: Array.isArray(raw.bottlenecks) ? raw.bottlenecks : [],
    singlePointsOfFailure: Array.isArray(raw.singlePointsOfFailure) ? raw.singlePointsOfFailure : [],
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
    followUpQuestions: Array.isArray(raw.followUpQuestions) ? raw.followUpQuestions : [],
  };
}
