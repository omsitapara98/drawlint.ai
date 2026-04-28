import {
  type AIProvider,
  type GenerateOptions,
  type GenerateResult,
  type ProviderCapabilities,
  ProviderError,
} from "./types";
import { extractJson } from "./base";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.1-flash-lite-preview";

/** Extra instructions appended for Gemini to enforce strict JSON output. */
const GEMINI_JSON_SUFFIX = `

CRITICAL FORMATTING RULES:
- Return ONLY a single valid JSON object. Nothing else.
- Do NOT wrap in markdown code fences.
- Do NOT add any text before or after the JSON.
- Do NOT add trailing commas.
- Ensure all strings are properly escaped.`;

/** Extract text content from Gemini REST API response. */
function extractGeminiContent(json: unknown): string {
  if (typeof json !== "object" || json === null) {
    throw new ProviderError("Empty response from Gemini.", "gemini", undefined, "malformed_response");
  }

  const data = json as Record<string, unknown>;

  // Check for API error
  if (data.error) {
    const err = data.error as Record<string, unknown>;
    const status = typeof err.code === "number" ? err.code : undefined;
    const message = typeof err.message === "string" ? err.message : "Gemini API error";

    if (status === 401 || status === 403) {
      throw new ProviderError("Authentication failed. Check your API key.", "gemini", status, "auth_error");
    }
    if (status === 429) {
      throw new ProviderError("Rate limit exceeded. Try again later.", "gemini", 429, "rate_limit");
    }
    throw new ProviderError(`Gemini API error: ${message}`, "gemini", status, "api_error");
  }

  // Extract from candidates[0].content.parts[0].text
  if (
    "candidates" in data &&
    Array.isArray(data.candidates) &&
    data.candidates.length > 0
  ) {
    const candidate = data.candidates[0] as Record<string, unknown>;
    if (
      typeof candidate.content === "object" &&
      candidate.content !== null
    ) {
      const content = candidate.content as Record<string, unknown>;
      if (Array.isArray(content.parts) && content.parts.length > 0) {
        const part = content.parts[0] as Record<string, unknown>;
        if (typeof part.text === "string") {
          return part.text;
        }
      }
    }
  }

  throw new ProviderError(
    "Unexpected response structure from Gemini.",
    "gemini",
    undefined,
    "malformed_response",
  );
}

export class GeminiProvider implements AIProvider {
  readonly type = "gemini" as const;
  readonly capabilities: ProviderCapabilities = {
    maxConcurrency: 2, // Conservative for free tier rate limits
    supportsJsonMode: true,
    displayName: "Gemini AI (Free)",
    qualityTier: "balanced",
  };

  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new ProviderError("No Gemini API key configured.", "gemini", 400, "missing_api_key");
    }
    this.apiKey = apiKey;
    this.model = model ?? DEFAULT_MODEL;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent`;

    // Append stricter JSON formatting instructions for Gemini
    const enhancedSystemPrompt = options.systemPrompt + GEMINI_JSON_SUFFIX;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${enhancedSystemPrompt}\n\n---\n\n${options.userContent}` },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: "application/json",
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });
    } catch (err) {
      throw new ProviderError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        "gemini",
        undefined,
        "network_error",
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ProviderError("Failed to parse Gemini response.", "gemini", undefined, "parse_error");
    }

    // Gemini returns 200 even for errors — error is in the body
    if (!response.ok) {
      // Let extractGeminiContent handle the error extraction
      extractGeminiContent(json);
    }

    const raw = extractGeminiContent(json);
    const parsed = extractJson(raw);

    return { parsed, raw };
  }

  async testConnection(signal?: AbortSignal): Promise<boolean> {
    await this.generate({
      systemPrompt: "You are a test assistant. Return valid JSON.",
      userContent: 'Respond with exactly: {"status":"ok"}',
      maxTokens: 64,
      signal,
    });
    return true;
  }
}
