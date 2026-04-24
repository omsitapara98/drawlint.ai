/**
 * Centralized client-side AI configuration management.
 * Handles localStorage for all provider credentials with versioned schema.
 */

const STORAGE_KEY = "drawlint:ai-config:v2";
const LEGACY_KEY = "drawlint:byo-key";

export type ClientAiProvider = "managed" | "gemini" | "azure";

export interface GeminiConfig {
  apiKey: string;
}

export interface AzureConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
}

export interface AIConfigV2 {
  version: 2;
  gemini?: GeminiConfig;
  azure?: AzureConfig;
}

/** Read the current AI config from localStorage. */
export function getAIConfig(): AIConfigV2 {
  try {
    // Try new versioned config first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AIConfigV2;
      if (parsed.version === 2) return parsed;
    }

    // Migrate from legacy key
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as { apiKey?: string; endpoint?: string; deployment?: string };
      const migrated: AIConfigV2 = {
        version: 2,
        azure: old.apiKey
          ? { apiKey: old.apiKey, endpoint: old.endpoint ?? "", deployment: old.deployment ?? "" }
          : undefined,
      };
      // Save migrated config and clean up legacy key
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch {
    // Storage unavailable or corrupt
  }

  return { version: 2 };
}

/** Save AI config to localStorage. */
export function saveAIConfig(config: AIConfigV2): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage full
  }
}

/** Check if credentials are configured for a specific provider. */
export function hasCredentials(provider: ClientAiProvider): boolean {
  if (provider === "managed") return true;
  const config = getAIConfig();
  if (provider === "gemini") return !!config.gemini?.apiKey;
  if (provider === "azure") return !!config.azure?.apiKey;
  return false;
}

/** Check if any BYO credentials are configured (for backward compat). */
export function hasAnyCredentials(): boolean {
  const config = getAIConfig();
  return !!config.gemini?.apiKey || !!config.azure?.apiKey;
}

/**
 * Get credentials to send in API request body based on the user's selected provider.
 * Returns the fields needed by the server's resolveAnalysisProvider().
 */
export function getCredentialsForRequest(
  provider: ClientAiProvider,
): { apiKey?: string; endpoint?: string; deployment?: string } {
  if (provider === "managed") return {};

  const config = getAIConfig();

  if (provider === "gemini" && config.gemini?.apiKey) {
    return { apiKey: config.gemini.apiKey };
  }

  if (provider === "azure" && config.azure?.apiKey) {
    return {
      apiKey: config.azure.apiKey,
      endpoint: config.azure.endpoint,
      deployment: config.azure.deployment,
    };
  }

  return {};
}

/** Clear credentials for a specific provider. */
export function clearCredentials(provider: ClientAiProvider): void {
  const config = getAIConfig();
  if (provider === "gemini") {
    delete config.gemini;
  } else if (provider === "azure") {
    delete config.azure;
  }
  saveAIConfig(config);
}

/** Clear all credentials. */
export function clearAllCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // noop
  }
}
