import type { ParsedDiagram } from "@/types/diagram";
import type { AIReviewResponse, ReviewDimension, ReviewHighlight, FeedbackItem, ReviewLevel, LeadReviewer, ReviewerKey } from "@/types/feedback";
import { getReviewerPrompt, getLeadReviewerPrompt } from "./prompts";
import type { ReviewerSection } from "./prompts";
import { formatSectionForReview } from "./format-prompt";

/** Validate that an endpoint URL is a legitimate Azure OpenAI endpoint. */
function validateAzureEndpoint(endpoint: string): void {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new AzureOpenAIError("Invalid Azure OpenAI endpoint URL.", 400, "invalid_endpoint");
  }
  if (parsed.protocol !== "https:") {
    throw new AzureOpenAIError("Azure OpenAI endpoint must use HTTPS.", 400, "invalid_endpoint");
  }
  if (!parsed.hostname.endsWith(".openai.azure.com")) {
    throw new AzureOpenAIError(
      "Azure OpenAI endpoint must be an *.openai.azure.com host.",
      400,
      "invalid_endpoint",
    );
  }
}

/** Validate that a deployment name contains only safe characters. */
function validateDeploymentName(deployment: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(deployment)) {
    throw new AzureOpenAIError(
      "Deployment name contains invalid characters. Only alphanumeric, hyphens, and underscores are allowed.",
      400,
      "invalid_deployment",
    );
  }
}

interface AnalyzeOptions {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  level?: ReviewLevel;
  /** AbortSignal — aborts all in-flight Azure OpenAI calls when triggered. */
  signal?: AbortSignal;
  /** Called as each section completes (before all sections finish). */
  onSectionComplete?: (key: ReviewerKey, data: ReviewDimension) => void;
  /** Called immediately before the lead reviewer call starts. */
  onLeadStarted?: () => void;
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
  };
}

/** Validate a single ReviewHighlight. */
function validateHighlight(item: unknown): ReviewHighlight {
  const raw = item as Record<string, unknown>;
  const severity = raw.severity;
  return {
    severity: severity === "strong" || severity === "good" ? severity : "good",
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
  };
}

const HIGHLIGHT_SEVERITIES = new Set(["strong", "good"]);
const ISSUE_SEVERITIES = new Set(["critical", "warning", "info"]);

/** Validate a ReviewDimension, gracefully moving misplaced items between arrays. */
function validateDimension(raw: unknown): ReviewDimension {
  if (typeof raw !== "object" || raw === null) {
    return { highlights: [], issues: [] };
  }
  const d = raw as Record<string, unknown>;

  const rawHighlights: unknown[] = Array.isArray(d.highlights) ? d.highlights : [];
  const rawIssues: unknown[] = Array.isArray(d.issues) ? d.issues : [];

  const highlights: ReviewHighlight[] = [];
  const issues: FeedbackItem[] = [];

  // Process highlights array — move misplaced issues out
  for (const item of rawHighlights) {
    const r = item as Record<string, unknown>;
    if (ISSUE_SEVERITIES.has(r.severity as string)) {
      issues.push(validateItem(item));
    } else {
      highlights.push(validateHighlight(item));
    }
  }

  // Process issues array — move misplaced highlights out
  for (const item of rawIssues) {
    const r = item as Record<string, unknown>;
    if (HIGHLIGHT_SEVERITIES.has(r.severity as string)) {
      highlights.push(validateHighlight(item));
    } else {
      issues.push(validateItem(item));
    }
  }

  return { highlights, issues };
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

const REVIEWER_SECTIONS: ReviewerSection[] = ["nfr", "entities", "capacity", "api", "hld"];

const SECTION_TO_KEY: Record<ReviewerSection, Exclude<ReviewerKey, "leadReviewer">> = {
  nfr: "nfrReview",
  entities: "entitiesReview",
  capacity: "capacityReview",
  api: "apiReview",
  hld: "hldReview",
};

const SECTION_DISPLAY_NAME: Record<ReviewerSection, string> = {
  nfr: "NFR",
  entities: "Entities",
  capacity: "Capacity",
  api: "API",
  hld: "HLD",
};

/**
 * Analyze a system design diagram using multiple focused API calls.
 * 5 section reviewers run in parallel, then 1 Lead Reviewer synthesizes.
 */
export async function analyzeDesign(
  diagram: ParsedDiagram,
  options?: AnalyzeOptions,
): Promise<AIReviewResponse> {
  const apiKey = options?.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? "";
  const endpoint = options?.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
  const deployment = options?.deployment ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "";
  const level: ReviewLevel = options?.level ?? "senior";

  if (!apiKey) {
    throw new AzureOpenAIError("No Azure OpenAI API key configured.", 400, "missing_api_key");
  }
  if (!endpoint) {
    throw new AzureOpenAIError("No Azure OpenAI endpoint configured.", 400, "missing_endpoint");
  }
  if (!deployment) {
    throw new AzureOpenAIError("No Azure OpenAI deployment configured.", 400, "missing_deployment");
  }

  validateAzureEndpoint(endpoint);
  validateDeploymentName(deployment);

  const apiVersion = "2025-01-01-preview";
  // Extract base URL: strip any path after the host (users may paste full URLs from Azure portal)
  const baseUrl = endpoint.replace(/\/+$/, "").replace(/\/openai\/.*$/, "");
  const url = `${baseUrl}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const headers: Record<string, string> = { "Content-Type": "application/json", "api-key": apiKey };

  /** Make a single API call and parse the JSON response. */
  async function callReviewer(systemPrompt: string, userContent: string): Promise<unknown> {
    const body = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
      response_format: { type: "json_object" },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: options?.signal,
      });
    } catch (err) {
      throw new AzureOpenAIError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        "network_error",
      );
    }

    if (!response.ok) {
      const status = response.status;
      let errorBody = "";
      try { errorBody = await response.text(); } catch { /* ignore */ }

      if (status === 401 || status === 403) {
        throw new AzureOpenAIError("Authentication failed.", status, "auth_error");
      }
      if (status === 429) {
        throw new AzureOpenAIError("Rate limit exceeded.", 429, "rate_limit");
      }
      throw new AzureOpenAIError(`Azure OpenAI request failed (HTTP ${status}): ${errorBody}`, status, "api_error");
    }

    let json: unknown;
    try { json = await response.json(); } catch {
      throw new AzureOpenAIError("Failed to parse response as JSON.", undefined, "parse_error");
    }

    const content = extractContent(json);
    try { return JSON.parse(content); } catch {
      throw new AzureOpenAIError("Model returned invalid JSON.", undefined, "malformed_response");
    }
  }

  // Step 1: Fire 5 section reviewer calls in parallel, emitting each as it resolves
  const dimensions: Record<string, ReviewDimension> = {};
  await Promise.all(
    REVIEWER_SECTIONS.map(async (section) => {
      const systemPrompt = getReviewerPrompt(section, level);
      const userContent = formatSectionForReview(diagram, section, level);
      const result = await callReviewer(systemPrompt, userContent);
      const dimension = validateDimension(result);
      dimensions[section] = dimension;
      options?.onSectionComplete?.(SECTION_TO_KEY[section], dimension);
    }),
  );

  // Step 2: Build lead reviewer input from section results
  options?.onLeadStarted?.();
  const leadUserContent = buildLeadReviewerInput(diagram, dimensions, level);
  const leadSystemPrompt = getLeadReviewerPrompt(level);
  const leadResult = await callReviewer(leadSystemPrompt, leadUserContent) as Record<string, unknown>;

  // Step 3: Assemble final AIReviewResponse
  const assembled: AIReviewResponse = {
    level,
    summary: typeof leadResult.summary === "string" ? leadResult.summary : "",
    nfrReview: dimensions["nfr"],
    entitiesReview: dimensions["entities"],
    capacityReview: dimensions["capacity"],
    apiReview: dimensions["api"],
    hldReview: dimensions["hld"],
    leadReviewer: validateLeadReviewer(leadResult.leadReviewer),
    followUpQuestions: Array.isArray(leadResult.followUpQuestions)
      ? leadResult.followUpQuestions as string[]
      : [],
  };

  return assembled;
}

/** Build the user content for the Lead Reviewer call, summarizing all 5 reviewer findings. */
function buildLeadReviewerInput(
  diagram: ParsedDiagram,
  dimensions: Record<string, ReviewDimension>,
  level: ReviewLevel,
): string {
  const lines: string[] = [];
  const { sections } = diagram;

  lines.push(`=== REVIEW MODE: ${level.toUpperCase()} ===`);
  lines.push("");

  // Include FR + Assumptions for context
  if (sections.functionalRequirements?.trim()) {
    lines.push("FUNCTIONAL REQUIREMENTS:");
    lines.push(sections.functionalRequirements.trim());
    lines.push("");
  }
  if (sections.assumptions?.trim()) {
    lines.push("ASSUMPTIONS:");
    lines.push(sections.assumptions.trim());
    lines.push("");
  }

  lines.push("=== REVIEWER FINDINGS ===");
  lines.push("");

  for (const section of REVIEWER_SECTIONS) {
    const dim = dimensions[section];
    const name = SECTION_DISPLAY_NAME[section];

    lines.push(`--- ${name} Reviewer ---`);

    if (dim.highlights.length > 0) {
      lines.push("Highlights:");
      for (const h of dim.highlights) {
        lines.push(`  [${h.severity}] ${h.title}: ${h.description}`);
      }
    } else {
      lines.push("Highlights: (none)");
    }

    if (dim.issues.length > 0) {
      lines.push("Issues:");
      for (const i of dim.issues) {
        lines.push(`  [${i.severity}] ${i.title}: ${i.description}`);
      }
    } else {
      lines.push("Issues: (none)");
    }

    lines.push("");
  }

  return lines.join("\n");
}
