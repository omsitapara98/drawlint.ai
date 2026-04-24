import { ProviderError, type AIProviderType, type GenerateResult } from "./types";

/**
 * Extract JSON from model response text.
 * Handles markdown code fences and raw JSON.
 */
export function extractJson(raw: string): unknown {
  let text = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError(
      "Model returned invalid JSON.",
      "drawlint", // overridden by caller
      undefined,
      "malformed_response",
    );
  }
}

/**
 * Retry a generate call up to maxRetries times on malformed JSON.
 * Only retries on parse errors, not auth/network errors.
 */
export async function withRetry(
  fn: () => Promise<GenerateResult>,
  provider: AIProviderType,
  maxRetries = 1,
): Promise<GenerateResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on malformed response, not on auth/network/rate-limit errors
      if (err instanceof ProviderError) {
        if (err.code !== "malformed_response") {
          throw err;
        }
      }

      if (attempt === maxRetries) {
        throw new ProviderError(
          `Failed after ${maxRetries + 1} attempts: ${lastError.message}`,
          provider,
          undefined,
          "malformed_response",
        );
      }
    }
  }

  // Unreachable, but TypeScript needs it
  throw lastError;
}

/**
 * Run promises with capped concurrency.
 */
export async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  if (limit >= tasks.length) {
    return Promise.all(tasks.map((t) => t()));
  }

  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    runNext(),
  );
  await Promise.all(workers);
  return results;
}
