import type { AIProvider, ProviderCredentials } from "./types";
import { ProviderError } from "./types";
import { AzureOpenAIProvider } from "./azure";
import { GeminiProvider } from "./gemini";
import { DrawLintProvider } from "./drawlint";

export type { AIProvider, ProviderCredentials, ProviderError } from "./types";
export type {
  AIProviderType,
  DrawLintCredentials,
  GeminiCredentials,
  AzureCredentials,
  GenerateOptions,
  GenerateResult,
  ProviderCapabilities,
  AnalysisProviderConfig,
} from "./types";
export { AzureOpenAIProvider } from "./azure";
export { GeminiProvider } from "./gemini";
export { DrawLintProvider } from "./drawlint";
export { withRetry, withConcurrencyLimit } from "./base";

/**
 * Factory: create the right AIProvider from credentials.
 */
export function createProvider(credentials: ProviderCredentials): AIProvider {
  switch (credentials.provider) {
    case "drawlint":
      return new DrawLintProvider();

    case "gemini":
      return new GeminiProvider(credentials.apiKey);

    case "azure":
      return new AzureOpenAIProvider(
        credentials.apiKey,
        credentials.endpoint,
        credentials.deployment,
      );

    default:
      throw new ProviderError(
        `Unknown provider: ${(credentials as { provider: string }).provider}`,
        "drawlint",
        400,
        "unknown_provider",
      );
  }
}
