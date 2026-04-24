import type { ProviderCredentials } from "@/lib/ai/providers/types";
import type { AiMode, UserAiSettings } from "@/lib/db/users";

/**
 * Request body fields that may carry BYO credentials.
 */
interface RequestCredentialFields {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  /** Optional explicit provider hint from new clients */
  aiProvider?: string;
}

export interface ResolvedProvider {
  credentials: ProviderCredentials;
  /** Whether managed quota should be tracked for this request */
  isManagedQuota: boolean;
}

/**
 * Resolve the AI provider from user settings + request body.
 *
 * Rules:
 * - Server-side `aiMode` is the source of truth
 * - Request body only carries credentials, not mode selection
 * - "managed" mode: uses env vars, charges quota
 * - "gemini" mode: requires apiKey from client
 * - "azure" mode: requires apiKey + endpoint + deployment from client
 */
export function resolveAnalysisProvider(
  userSettings: UserAiSettings,
  body: RequestCredentialFields,
): ResolvedProvider | { error: string; errorCode: string; status: number } {
  const mode: AiMode = userSettings.aiMode;

  switch (mode) {
    case "managed": {
      // Use platform env vars
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

      if (!apiKey || !endpoint || !deployment) {
        return {
          error: "Managed AI is not configured. Please set up your own AI key in Settings.",
          errorCode: "managed_not_configured",
          status: 503,
        };
      }

      return {
        credentials: { provider: "drawlint" },
        isManagedQuota: true,
      };
    }

    case "gemini": {
      if (!body.apiKey) {
        return {
          error: "Your AI mode is set to Free AI (Gemini) but no API key was provided. Please add your Gemini API key in Settings.",
          errorCode: "gemini_credentials_missing",
          status: 400,
        };
      }
      return {
        credentials: { provider: "gemini", apiKey: body.apiKey },
        isManagedQuota: false,
      };
    }

    case "azure": {
      if (!body.apiKey) {
        return {
          error: "Your AI mode is set to Azure OpenAI but no credentials were provided. Please add your Azure OpenAI credentials in Settings.",
          errorCode: "azure_credentials_missing",
          status: 400,
        };
      }
      return {
        credentials: {
          provider: "azure",
          apiKey: body.apiKey,
          endpoint: body.endpoint ?? "",
          deployment: body.deployment ?? "",
        },
        isManagedQuota: false,
      };
    }

    default:
      return {
        error: "Unknown AI mode. Please update your settings.",
        errorCode: "unknown_mode",
        status: 400,
      };
  }
}

/** Type guard to check if resolution was an error. */
export function isResolutionError(
  result: ResolvedProvider | { error: string; errorCode: string; status: number },
): result is { error: string; errorCode: string; status: number } {
  return "error" in result;
}
