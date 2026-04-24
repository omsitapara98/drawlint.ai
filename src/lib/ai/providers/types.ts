import type { ReviewLevel } from "@/types/feedback";

/* ── Provider identifiers ────────────────────────────────────── */

export type AIProviderType = "drawlint" | "gemini" | "azure";

/* ── Provider-specific credential shapes ─────────────────────── */

export interface DrawLintCredentials {
  provider: "drawlint";
}

export interface GeminiCredentials {
  provider: "gemini";
  apiKey: string;
}

export interface AzureCredentials {
  provider: "azure";
  apiKey: string;
  endpoint: string;
  deployment: string;
}

export type ProviderCredentials =
  | DrawLintCredentials
  | GeminiCredentials
  | AzureCredentials;

/* ── Generation options ──────────────────────────────────────── */

export interface GenerateOptions {
  systemPrompt: string;
  userContent: string;
  temperature?: number;
  maxTokens?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface GenerateResult {
  /** Parsed JSON from the model response */
  parsed: unknown;
  /** Raw text content (before JSON parse) */
  raw: string;
}

/* ── Provider capabilities ───────────────────────────────────── */

export interface ProviderCapabilities {
  /** Max parallel reviewer calls (1 = sequential) */
  maxConcurrency: number;
  /** Whether native structured JSON output is supported */
  supportsJsonMode: boolean;
  /** Display name for UI */
  displayName: string;
  /** Quality indicator for UI */
  qualityTier: "high" | "balanced" | "user-controlled";
}

/* ── AIProvider interface ────────────────────────────────────── */

export interface AIProvider {
  readonly type: AIProviderType;
  readonly capabilities: ProviderCapabilities;

  /**
   * Send a prompt to the LLM and return parsed JSON.
   * The provider handles its own message format, auth, and response extraction.
   */
  generate(options: GenerateOptions): Promise<GenerateResult>;

  /**
   * Lightweight connection test — sends a minimal prompt to verify credentials.
   * Returns true if connection is valid, throws ProviderError otherwise.
   */
  testConnection(signal?: AbortSignal): Promise<boolean>;
}

/* ── Shared error class ──────────────────────────────────────── */

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProviderType,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/* ── Analysis options (used by analyzeDesign) ─────────────────── */

export interface AnalysisProviderConfig {
  credentials: ProviderCredentials;
  level?: ReviewLevel;
  signal?: AbortSignal;
  onSectionComplete?: (key: string, data: unknown) => void;
  onLeadStarted?: () => void;
}
