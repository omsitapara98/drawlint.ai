import {
  type AIProvider,
  type GenerateOptions,
  type GenerateResult,
  type ProviderCapabilities,
  type AIProviderType,
} from "./types";
import { AzureOpenAIProvider } from "./azure";

/**
 * DrawLint managed provider — wraps Azure OpenAI using platform env vars.
 * This is the recommended/default provider.
 */
export class DrawLintProvider implements AIProvider {
  readonly type: AIProviderType = "drawlint";
  readonly capabilities: ProviderCapabilities = {
    maxConcurrency: 5,
    supportsJsonMode: true,
    displayName: "DrawLint AI",
    qualityTier: "high",
  };

  private readonly inner: AzureOpenAIProvider;

  constructor() {
    const apiKey = process.env.AZURE_OPENAI_API_KEY ?? "";
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? "";
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "";

    this.inner = new AzureOpenAIProvider(apiKey, endpoint, deployment);
  }

  generate(options: GenerateOptions): Promise<GenerateResult> {
    return this.inner.generate(options);
  }

  testConnection(signal?: AbortSignal): Promise<boolean> {
    return this.inner.testConnection(signal);
  }
}
