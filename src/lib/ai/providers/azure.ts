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

export class AzureOpenAIProvider implements AIProvider {
  readonly type = "azure" as const;
  readonly capabilities: ProviderCapabilities = {
    maxConcurrency: 5,
    supportsJsonMode: true,
    displayName: "Azure OpenAI",
    qualityTier: "user-controlled",
  };

  private readonly apiKey: string;
  private readonly url: string;
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
    const apiVersion = "2025-04-01-preview";
    const baseUrl = endpoint.replace(/\/+$/, "").replace(/\/openai\/.*$/, "");
    this.url = `${baseUrl}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
    // Foundry endpoints may not support response_format or max_completion_tokens
    this.isFoundry = !new URL(endpoint).hostname.endsWith(".openai.azure.com");
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    // For Foundry endpoints without native JSON mode, add stricter JSON instructions
    const systemPrompt = this.isFoundry
      ? options.systemPrompt + "\n\nCRITICAL: Return ONLY a single valid JSON object. No markdown fences, no text before or after the JSON."
      : options.systemPrompt;

    const body: Record<string, unknown> = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: options.userContent },
      ],
      temperature: options.temperature ?? 0.3,
    };

    if (this.isFoundry) {
      // Foundry/AI Services: use max_tokens (widely supported)
      body.max_tokens = options.maxTokens ?? 2048;
    } else {
      // Azure OpenAI: use newer params + JSON mode
      body.max_completion_tokens = options.maxTokens ?? 2048;
      body.response_format = { type: "json_object" };
    }

    let response: Response;
    try {
      response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: options.signal,
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
        `Azure OpenAI request failed (HTTP ${status}): ${errorBody}`,
        "azure",
        status,
        "api_error",
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ProviderError("Failed to parse response as JSON.", "azure", undefined, "parse_error");
    }

    const raw = extractContent(json);
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
