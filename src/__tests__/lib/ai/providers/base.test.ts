import { describe, it, expect, vi } from "vitest";
import {
  extractJson,
  withRetry,
  withConcurrencyLimit,
} from "@/lib/ai/providers/base";
import { ProviderError, type GenerateResult } from "@/lib/ai/providers/types";

// ── extractJson ─────────────────────────────────────────────────────────────

describe("extractJson", () => {
  it("parses raw JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("trims leading/trailing whitespace before parsing raw JSON", () => {
    expect(extractJson('   \n  {"a":1}  \n  ')).toEqual({ a: 1 });
  });

  it("strips ```json fenced blocks", () => {
    const fenced = '```json\n{"hello":"world"}\n```';
    expect(extractJson(fenced)).toEqual({ hello: "world" });
  });

  it("strips unlabeled ``` fenced blocks", () => {
    const fenced = '```\n{"hello":"world"}\n```';
    expect(extractJson(fenced)).toEqual({ hello: "world" });
  });

  it("handles fences with surrounding whitespace", () => {
    const fenced = '\n\n  ```json\n{"x":42}\n```  \n';
    expect(extractJson(fenced)).toEqual({ x: 42 });
  });

  it("parses arrays", () => {
    expect(extractJson("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("throws ProviderError(malformed_response) on empty string", () => {
    try {
      extractJson("");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).code).toBe("malformed_response");
    }
  });

  it("throws ProviderError(malformed_response) on non-JSON garbage", () => {
    expect(() => extractJson("not json at all {")).toThrow(ProviderError);
    try {
      extractJson("not json");
    } catch (err) {
      expect((err as ProviderError).code).toBe("malformed_response");
    }
  });

  it("throws on whitespace-only input", () => {
    expect(() => extractJson("   \n  ")).toThrow(ProviderError);
  });

  // Regression guard: nested fences are NOT a documented supported case;
  // pin current behavior so a future "fix" doesn't change semantics silently.
  it("documents current nested-fence behavior (lazy match → invalid JSON throws)", () => {
    const nested = '```json\n```\n{"x":1}\n```\n```';
    // Lazy `[\s\S]*?` matches the smallest content; what's left between the
    // fences is not valid JSON, so extractJson throws.
    expect(() => extractJson(nested)).toThrow(ProviderError);
  });
});

// ── withRetry ───────────────────────────────────────────────────────────────

const okResult = (raw = '{"ok":true}'): GenerateResult => ({
  parsed: { ok: true },
  raw,
});

describe("withRetry", () => {
  it("returns the first success without retrying", async () => {
    const fn = vi.fn<() => Promise<GenerateResult>>().mockResolvedValue(okResult());
    const r = await withRetry(fn, "drawlint", 1);
    expect(r.parsed).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed_response then succeeds", async () => {
    const fn = vi
      .fn<() => Promise<GenerateResult>>()
      .mockRejectedValueOnce(
        new ProviderError("bad json", "drawlint", undefined, "malformed_response"),
      )
      .mockResolvedValueOnce(okResult());
    const r = await withRetry(fn, "drawlint", 1);
    expect(r.parsed).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on auth-coded ProviderError (would burn BYO quota)", async () => {
    const authErr = new ProviderError("nope", "azure", 401, "auth");
    const fn = vi.fn<() => Promise<GenerateResult>>().mockRejectedValue(authErr);
    await expect(withRetry(fn, "azure", 3)).rejects.toBe(authErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on rate_limit ProviderError", async () => {
    const rl = new ProviderError("too many", "gemini", 429, "rate_limit");
    const fn = vi.fn<() => Promise<GenerateResult>>().mockRejectedValue(rl);
    await expect(withRetry(fn, "gemini", 3)).rejects.toBe(rl);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on network ProviderError", async () => {
    const net = new ProviderError("offline", "azure", undefined, "network");
    const fn = vi.fn<() => Promise<GenerateResult>>().mockRejectedValue(net);
    await expect(withRetry(fn, "azure", 5)).rejects.toBe(net);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("after maxRetries malformed_response failures, throws ProviderError(malformed_response)", async () => {
    const malformed = new ProviderError(
      "still bad",
      "drawlint",
      undefined,
      "malformed_response",
    );
    const fn = vi.fn<() => Promise<GenerateResult>>().mockRejectedValue(malformed);
    await expect(withRetry(fn, "drawlint", 1)).rejects.toMatchObject({
      name: "ProviderError",
      code: "malformed_response",
    });
    expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  it("respects custom maxRetries", async () => {
    const malformed = new ProviderError(
      "bad",
      "drawlint",
      undefined,
      "malformed_response",
    );
    const fn = vi.fn<() => Promise<GenerateResult>>().mockRejectedValue(malformed);
    await expect(withRetry(fn, "drawlint", 3)).rejects.toThrow(ProviderError);
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it("retries non-ProviderError thrown by fn (treated as transient) until maxRetries", async () => {
    const fn = vi
      .fn<() => Promise<GenerateResult>>()
      .mockRejectedValue(new Error("boom"));
    await expect(withRetry(fn, "azure", 1)).rejects.toThrow(ProviderError);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ── withConcurrencyLimit ────────────────────────────────────────────────────

describe("withConcurrencyLimit", () => {
  it("fast path: limit ≥ tasks runs all in parallel and preserves order", async () => {
    const order: number[] = [];
    const tasks = [10, 5, 1].map((delay, i) => async () => {
      await new Promise((r) => setTimeout(r, delay));
      order.push(i);
      return i * 2;
    });
    const results = await withConcurrencyLimit(tasks, 5);
    expect(results).toEqual([0, 2, 4]);
    // With unbounded parallelism, fastest finishes first → completion order ≠ input order
    expect(order).not.toEqual([0, 1, 2]);
  });

  it("limit < tasks: ordered results preserved (worker pool)", async () => {
    const tasks = Array.from({ length: 6 }, (_, i) => async () => {
      await new Promise((r) => setTimeout(r, (6 - i) * 5));
      return i;
    });
    const results = await withConcurrencyLimit(tasks, 2);
    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("respects the concurrency cap", async () => {
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 8 }, () => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return 1;
    });
    await withConcurrencyLimit(tasks, 3);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1); // proves it actually parallelized
  });

  it("propagates a task rejection", async () => {
    const tasks = [
      async () => 1,
      async () => {
        throw new Error("task 1 failed");
      },
      async () => 3,
    ];
    await expect(withConcurrencyLimit(tasks, 2)).rejects.toThrow("task 1 failed");
  });

  it("single-task path", async () => {
    const results = await withConcurrencyLimit([async () => 42], 4);
    expect(results).toEqual([42]);
  });

  it("empty task list returns []", async () => {
    const results = await withConcurrencyLimit<number>([], 4);
    expect(results).toEqual([]);
  });
});
