import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveAnalysisProvider,
  isResolutionError,
} from "@/lib/ai/resolve-provider";
import type { UserAiSettings, AiMode } from "@/lib/db/users";

const baseSettings = (aiMode: AiMode): UserAiSettings => ({
  aiMode,
  role: "free",
  managedUsage: { count: 0, month: 1, year: 2026 },
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveAnalysisProvider — managed mode", () => {
  beforeEach(() => {
    // Start each test with all three managed env vars unset.
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "");
  });

  it("returns drawlint credentials when all env vars are set", () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "k");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://e");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "d");

    const r = resolveAnalysisProvider(baseSettings("managed"), {});
    expect(isResolutionError(r)).toBe(false);
    if (isResolutionError(r)) return;
    expect(r.credentials).toEqual({ provider: "drawlint" });
    expect(r.isManagedQuota).toBe(true);
  });

  it.each([
    ["AZURE_OPENAI_API_KEY"],
    ["AZURE_OPENAI_ENDPOINT"],
    ["AZURE_OPENAI_DEPLOYMENT"],
  ] as const)("returns 503 managed_not_configured when %s is missing", (missing) => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "k");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://e");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "d");
    vi.stubEnv(missing, "");

    const r = resolveAnalysisProvider(baseSettings("managed"), {});
    expect(isResolutionError(r)).toBe(true);
    if (!isResolutionError(r)) return;
    expect(r.errorCode).toBe("managed_not_configured");
    expect(r.status).toBe(503);
  });

  it("ignores body credentials in managed mode (env vars are the source of truth)", () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "k");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://e");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "d");

    const r = resolveAnalysisProvider(baseSettings("managed"), {
      apiKey: "USER_KEY_SHOULD_BE_IGNORED",
      endpoint: "https://attacker",
      deployment: "x",
    });
    if (isResolutionError(r)) throw new Error("unexpected error");
    expect(r.credentials).toEqual({ provider: "drawlint" });
  });
});

describe("resolveAnalysisProvider — gemini mode", () => {
  it("returns gemini credentials when body.apiKey is provided", () => {
    const r = resolveAnalysisProvider(baseSettings("gemini"), {
      apiKey: "gem-123",
    });
    if (isResolutionError(r)) throw new Error("unexpected error");
    expect(r.credentials).toEqual({ provider: "gemini", apiKey: "gem-123" });
    expect(r.isManagedQuota).toBe(false);
  });

  it("returns 400 gemini_credentials_missing when apiKey is absent", () => {
    const r = resolveAnalysisProvider(baseSettings("gemini"), {});
    expect(isResolutionError(r)).toBe(true);
    if (!isResolutionError(r)) return;
    expect(r.errorCode).toBe("gemini_credentials_missing");
    expect(r.status).toBe(400);
  });

  it("ignores managed env vars in gemini mode", () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "should-be-ignored");
    const r = resolveAnalysisProvider(baseSettings("gemini"), { apiKey: "gem" });
    if (isResolutionError(r)) throw new Error("unexpected error");
    expect(r.credentials.provider).toBe("gemini");
  });
});

describe("resolveAnalysisProvider — azure mode", () => {
  it("returns azure credentials with all fields when body provides them", () => {
    const r = resolveAnalysisProvider(baseSettings("azure"), {
      apiKey: "az-key",
      endpoint: "https://az",
      deployment: "gpt-4o",
    });
    if (isResolutionError(r)) throw new Error("unexpected error");
    expect(r.credentials).toEqual({
      provider: "azure",
      apiKey: "az-key",
      endpoint: "https://az",
      deployment: "gpt-4o",
    });
    expect(r.isManagedQuota).toBe(false);
  });

  it("returns 400 azure_credentials_missing when apiKey is absent", () => {
    const r = resolveAnalysisProvider(baseSettings("azure"), {
      endpoint: "https://az",
      deployment: "x",
    });
    expect(isResolutionError(r)).toBe(true);
    if (!isResolutionError(r)) return;
    expect(r.errorCode).toBe("azure_credentials_missing");
    expect(r.status).toBe(400);
  });

  it("defaults endpoint and deployment to empty string if absent (apiKey present)", () => {
    // Documents current behavior — provider adapter is expected to reject empty endpoint.
    const r = resolveAnalysisProvider(baseSettings("azure"), { apiKey: "az" });
    if (isResolutionError(r)) throw new Error("unexpected error");
    expect(r.credentials).toEqual({
      provider: "azure",
      apiKey: "az",
      endpoint: "",
      deployment: "",
    });
  });
});

describe("resolveAnalysisProvider — unknown / missing mode", () => {
  it("returns 400 unknown_mode for an unrecognized aiMode value", () => {
    const settings = { ...baseSettings("managed"), aiMode: "bogus" as AiMode };
    const r = resolveAnalysisProvider(settings, {});
    expect(isResolutionError(r)).toBe(true);
    if (!isResolutionError(r)) return;
    expect(r.errorCode).toBe("unknown_mode");
    expect(r.status).toBe(400);
  });
});

describe("resolveAnalysisProvider — security: BYO credentials never leak across modes", () => {
  it("body apiKey from a 'gemini' user is not surfaced when mode is 'managed'", () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "k");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://e");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "d");
    const r = resolveAnalysisProvider(baseSettings("managed"), {
      apiKey: "leaked-byo-key",
    });
    if (isResolutionError(r)) throw new Error("unexpected error");
    expect(JSON.stringify(r.credentials)).not.toContain("leaked-byo-key");
  });
});
