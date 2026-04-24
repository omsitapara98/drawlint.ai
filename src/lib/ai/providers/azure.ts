import {
  type AIProvider,
  type GenerateOptions,
  type GenerateResult,
  type ProviderCapabilities,
  ProviderError,
} from "./types";
import { extractJson } from "./base";

/** Valid Azure endpoint hostname suffixes. */
const VALID_AZURE_HOSTS = [
  ".openai.azure.com",
  ".cognitiveservices.azure.com",
  ".services.ai.azure.com",
];

/** Validate that an endpoint URL is a legitimate Azure OpenAI or Azure AI Foundry endpoint. */
function validateAzureEndpoint(endpoint: string): void {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new ProviderError("Invalid Azure endpoint URL.", "azure", 400, "invalid_endpoint");
  }
  if (parsed.protocol !== "https:") {
    throw new ProviderError("Azure endpoint must use HTTPS.", "azure", 400, "invalid_endpoint");
  }
  const isValid = VALID_AZURE_HOSTS.some((suffix) => parsed.hostname.endsWith(suffix));
  if (!isValid) {
    throw new ProviderError(
      "Endpoint must be an Azure OpenAI (*.openai.azure.com) or Azure AI Foundry (*.cognitiveservices.azure.com) host.",
      "azure",
      400,
      "invalid_endpoint",
    );
  }
}

/** Validate that a deployment name contains only safe characters. */
function validateDeploymentName(deployment: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(deployment)) {
    throw new ProviderError(
      "Deployment name contains invalid characters.",
      "azure",
      400,
      "invalid_deployment",
    );
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
  throw new ProviderError(
    "Unexpected response structure from Azure OpenAI.",
    "azure",
    undefined,
    "malformed_response",
  );
}

/** Extract text content from Responses API output. */
function extractResponsesContent(json: unknown): string {
  if (typeof json !== "object" || json === null) {
    throw new ProviderError("Empty response from Azure.", "azure", undefined, "malformed_response");
  }
  const data = json as Record<string, unknown>;

  // Responses API returns { output: [ { type: "message", content: [ { type: "output_text", text: "..." } ] } ] }
  if (Array.isArray(data.output)) {
    for (const item of data.output as Record<string, unknown>[]) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const part of item.content as Record<string, unknown>[]) {
          if (part.type === "output_text" && typeof part.text === "string") {
            return part.text;
          }
        }
      }
    }
  }

  // Fallback: try chat completions format
  return extractContent(json);
}

export class AzureOpenAIProvider implements AIProvider {
  readonly type = "azure" as const;
  readonly capabilities: ProviderCapabilities = {
    maxConcurrency: 5,
    supportsJsonMode: true,
    displayName: "Azure OpenAI",
    qualityTier: "user-controlled",
  };

  private readonly apiKey: string;
  private readonly deployment: string;
  private readonly baseUrl: string;
  private readonly isFoundry: boolean;

  constructor(apiKey: string, endpoint: string, deployment: string) {
    if (!apiKey) {
      throw new ProviderError("No Azure OpenAI API key configured.", "azure", 400, "missing_api_key");
    }
    if (!endpoint) {
      throw new ProviderError("No Azure OpenAI endpoint configured.", "azure", 400, "missing_endpoint");
    }
    if (!deployment) {
      throw new ProviderError("No Azure OpenAI deployment configured.", "azure", 400, "missing_deployment");
    }

    validateAzureEndpoint(endpoint);
    validateDeploymentName(deployment);

    this.apiKey = apiKey;
    this.deployment = deployment;
    this.baseUrl = endpoint.replace(/\/+$/, "").replace(/\/openai\/.*$/, "");
    this.isFoundry = !new URL(endpoint).hostname.endsWith(".openai.azure.com");
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    // Foundry endpoints: try Responses API first, then fall back to Chat Completions
    if (this.isFoundry) {
      return this.generateViaResponses(options);
    }
    return this.generateViaChatCompletions(options);
  }

  /** Standard Azure OpenAI Chat Completions API */
  private async generateViaChatCompletions(options: GenerateOptions): Promise<GenerateResult> {
    const apiVersion = "2025-04-01-preview";
    const url = `${this.baseUrl}/openai/deployments/${encodeURIComponent(this.deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

    const body = {
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userContent },
      ],
      temperature: options.temperature ?? 0.3,
      max_completion_tokens: options.maxTokens ?? 2048,
      response_format: { type: "json_object" },
    };

    const json = await this.doFetch(url, body, options.signal);
    const raw = extractContent(json);
    const parsed = extractJson(raw);
    return { parsed, raw };
  }

  /** Azure AI Foundry Responses API */
  private async generateViaResponses(options: GenerateOptions): Promise<GenerateResult> {
    const apiVersion = "2025-04-01-preview";
    const url = `${this.baseUrl}/openai/responses?api-version=${encodeURIComponent(apiVersion)}`;

    const systemPrompt = options.systemPrompt +
      "\n\nCRITICAL: Return ONLY a single valid JSON object. No markdown fences, no text before or after the JSON.";

    const body: Record<string, unknown> = {
      model: this.deployment,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: options.userContent },
      ],
      max_output_tokens: options.maxTokens ?? 2048,
    };

    try {
      const json = await this.doFetch(url, body, options.signal);
      const raw = extractResponsesContent(json);
      const parsed = extractJson(raw);
      return { parsed, raw };
    } catch (err) {
      // If first attempt fails with unsupported param, it's already clean — re-throw
      throw err;
    }
  }

  /** Shared fetch + error handling */
  private async doFetch(url: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      throw new ProviderError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        "azure",
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
        /* ignore */
      }

      if (status === 401 || status === 403) {
        throw new ProviderError("Authentication failed.", "azure", status, "auth_error");
      }
      if (status === 429) {
        throw new ProviderError("Rate limit exceeded.", "azure", 429, "rate_limit");
      }
      throw new ProviderError(
        `Azure request failed (HTTP ${status}): ${errorBody}`,
        "azure",
        status,
        "api_error",
      );
    }

    try {
      return await response.json();
    } catch {
      throw new ProviderError("Failed to parse response as JSON.", "azure", undefined, "parse_error");
    }
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
