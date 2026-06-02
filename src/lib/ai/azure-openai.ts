import type { ParsedDiagram } from "@/types/diagram";
import type { AIReviewResponse, ReviewDimension, ReviewHighlight, FeedbackItem, ReviewLevel, LeadReviewer, ReviewerKey } from "@/types/feedback";
import { getReviewerPrompt, getLeadReviewerPrompt } from "./prompts";
import type { ReviewerSection } from "./prompts";
import { formatSectionForReview } from "./format-prompt";
import { truncateWords } from "@/lib/utils";
import {
  createProvider,
  withRetry,
  withConcurrencyLimit,
  type AIProvider,
  type ProviderCredentials,
} from "./providers";

interface AnalyzeOptions {
  /** New: provider credentials (preferred) */
  credentials?: ProviderCredentials;
  /** @deprecated — use credentials instead. Kept for backward compat. */
  apiKey?: string;
  /** @deprecated */
  endpoint?: string;
  /** @deprecated */
  deployment?: string;
  level?: ReviewLevel;
  signal?: AbortSignal;
  /** Candidate's free-text walkthrough injected into every reviewer and the Lead Reviewer */
  hldExplanation?: string;
  onSectionComplete?: (key: ReviewerKey, data: ReviewDimension) => void;
  onLeadStarted?: () => void;
}

/**
 * @deprecated Use ProviderError instead. Kept for backward compatibility.
 */
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
 * Resolve provider from options — supports both new credentials and legacy Azure fields.
 */
function resolveProvider(options?: AnalyzeOptions): AIProvider {
  // New path: explicit credentials
  if (options?.credentials) {
    return createProvider(options.credentials);
  }

  // Legacy path: Azure-specific fields
  const apiKey = options?.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? "";
  const endpoint = options?.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
  const deployment = options?.deployment ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "";

  if (!apiKey) {
    throw new AzureOpenAIError("No Azure OpenAI API key configured.", 400, "missing_api_key");
  }

  return createProvider({
    provider: "azure",
    apiKey,
    endpoint,
    deployment,
  });
}

/**
 * Analyze a system design diagram using multiple focused API calls.
 * 5 section reviewers run with provider-appropriate concurrency,
 * then 1 Lead Reviewer synthesizes.
 */
export async function analyzeDesign(
  diagram: ParsedDiagram,
  options?: AnalyzeOptions,
): Promise<AIReviewResponse> {
  const provider = resolveProvider(options);
  const level: ReviewLevel = options?.level ?? "senior";

  /** Make a single reviewer call with retry on malformed JSON. */
  async function callReviewer(systemPrompt: string, userContent: string): Promise<unknown> {
    const result = await withRetry(
      () =>
        provider.generate({
          systemPrompt,
          userContent,
          temperature: 0.2,
          maxTokens: 2048,
          signal: options?.signal,
        }),
      provider.type,
      1, // 1 retry on malformed JSON
    );
    return result.parsed;
  }

  // Step 1: Run 5 section reviewers with concurrency cap
  const dimensions: Record<string, ReviewDimension> = {};
  const reviewerTasks = REVIEWER_SECTIONS.map((section) => {
    return async () => {
      const systemPrompt = getReviewerPrompt(section, level);
      const userContent = formatSectionForReview(diagram, section, level, options?.hldExplanation);
      const result = await callReviewer(systemPrompt, userContent);
      const dimension = validateDimension(result);
      dimensions[section] = dimension;
      options?.onSectionComplete?.(SECTION_TO_KEY[section], dimension);
    };
  });

  await withConcurrencyLimit(reviewerTasks, provider.capabilities.maxConcurrency);

  // Step 2: Build lead reviewer input from section results
  options?.onLeadStarted?.();
  const leadUserContent = buildLeadReviewerInput(diagram, dimensions, level, options?.hldExplanation);
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
  hldExplanation?: string,
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

  if (hldExplanation?.trim()) {
    lines.push("=== CANDIDATE'S EXPLANATION (overall design walkthrough) ===");
    lines.push("");
    lines.push(truncateWords(hldExplanation.trim(), 5000));
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
