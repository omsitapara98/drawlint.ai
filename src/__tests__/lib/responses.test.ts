import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

const { deferred, resolveClient } = vi.hoisted(() => {
  let resolveClient!: (c: MongoClient) => void;
  const deferred: Promise<MongoClient> = new Promise((r) => {
    resolveClient = r;
  });
  return { deferred, resolveClient };
});

vi.mock("@/lib/db/mongodb", () => ({ default: deferred }));

import {
  upsertResponse,
  getResponsesByReviewId,
  upsertReEvalSignal,
  getReEvalSignal,
} from "@/lib/db/responses";

let mongod: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  resolveClient(client);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

afterEach(async () => {
  const db = client.db("drawlint-db");
  const cols = await db.listCollections().toArray();
  await Promise.all(cols.map((c) => db.collection(c.name).deleteMany({})));
});

function makeIds() {
  return {
    userId: new ObjectId().toString(),
    designId: new ObjectId().toString(),
    reviewId: new ObjectId().toString(),
  };
}

const sampleIssue = {
  severity: "critical" as const,
  title: "Missing contrast",
  description: "Text is too low contrast",
};

// ── upsertResponse ────────────────────────────────────────────────────────────

describe("upsertResponse", () => {
  it("creates a new response with correct fields", async () => {
    const { userId, designId, reviewId } = makeIds();
    const result = await upsertResponse({
      designId,
      reviewId,
      userId,
      section: "visual",
      issueIndex: 0,
      originalIssue: sampleIssue,
      userResponse: "I updated the contrast ratio to 4.5:1",
      verdict: "addressed",
      explanation: "Contrast now meets WCAG AA",
    });

    expect(result._id).toBeDefined();
    expect(result.designId.toString()).toBe(designId);
    expect(result.reviewId.toString()).toBe(reviewId);
    expect(result.verdict).toBe("addressed");
    expect(result.section).toBe("visual");
    expect(result.issueIndex).toBe(0);
  });

  it("replaces an existing response for the same issue (delete + insert)", async () => {
    const { userId, designId, reviewId } = makeIds();
    const base = { designId, reviewId, userId, section: "visual" as const, issueIndex: 0, originalIssue: sampleIssue };

    await upsertResponse({ ...base, userResponse: "first attempt", verdict: "partial", explanation: "partial fix" });
    await upsertResponse({ ...base, userResponse: "second attempt", verdict: "addressed", explanation: "fully fixed" });

    const responses = await getResponsesByReviewId(reviewId);
    // Only one response for this issue should exist
    const forIssue = responses.filter((r) => r.section === "visual" && r.issueIndex === 0);
    expect(forIssue).toHaveLength(1);
    expect(forIssue[0].verdict).toBe("addressed");
    expect(forIssue[0].userResponse).toBe("second attempt");
  });

  it("keeps responses for different issues separate", async () => {
    const { userId, designId, reviewId } = makeIds();
    const base = { designId, reviewId, userId, section: "visual" as const, originalIssue: sampleIssue };

    await upsertResponse({ ...base, issueIndex: 0, userResponse: "fix 0", verdict: "addressed", explanation: "" });
    await upsertResponse({ ...base, issueIndex: 1, userResponse: "fix 1", verdict: "partial", explanation: "" });

    const responses = await getResponsesByReviewId(reviewId);
    expect(responses).toHaveLength(2);
  });
});

// ── getResponsesByReviewId ────────────────────────────────────────────────────

describe("getResponsesByReviewId", () => {
  it("returns empty array when no responses exist", async () => {
    const { reviewId } = makeIds();
    const result = await getResponsesByReviewId(reviewId);
    expect(result).toEqual([]);
  });

  it("only returns responses for the given reviewId", async () => {
    const { userId, designId, reviewId } = makeIds();
    const otherReviewId = new ObjectId().toString();
    const base = { userId, designId, section: "visual" as const, issueIndex: 0, originalIssue: sampleIssue };

    await upsertResponse({ ...base, reviewId, userResponse: "for review", verdict: "addressed", explanation: "" });
    await upsertResponse({ ...base, reviewId: otherReviewId, userResponse: "other review", verdict: "partial", explanation: "" });

    const results = await getResponsesByReviewId(reviewId);
    expect(results).toHaveLength(1);
    expect(results[0].reviewId.toString()).toBe(reviewId);
  });
});

// ── upsertReEvalSignal / getReEvalSignal ──────────────────────────────────────

describe("upsertReEvalSignal / getReEvalSignal", () => {
  it("returns null when no signal exists", async () => {
    const { reviewId } = makeIds();
    const result = await getReEvalSignal(reviewId);
    expect(result).toBeNull();
  });

  it("persists and retrieves a re-eval signal", async () => {
    const { designId, reviewId } = makeIds();
    await upsertReEvalSignal({
      designId,
      reviewId,
      originalSignal: "no-hire",
      updatedSignal: "lean-hire",
      updatedSignalReason: "3 of 4 issues resolved",
      resolvedCount: 3,
      partialCount: 1,
      totalResponses: 4,
    });

    const result = await getReEvalSignal(reviewId);
    expect(result).not.toBeNull();
    expect(result!.updatedSignal).toBe("lean-hire");
    expect(result!.originalSignal).toBe("no-hire");
    expect(result!.resolvedCount).toBe(3);
    expect(result!.totalResponses).toBe(4);
  });

  it("updates an existing signal (upsert behavior)", async () => {
    const { designId, reviewId } = makeIds();
    const base = { designId, reviewId, originalSignal: "no-hire", resolvedCount: 0, partialCount: 0, totalResponses: 0 };

    await upsertReEvalSignal({ ...base, updatedSignal: "lean-hire", updatedSignalReason: "some resolved" });
    // Update with better signal
    await upsertReEvalSignal({ ...base, updatedSignal: "hire", updatedSignalReason: "all resolved", resolvedCount: 4, totalResponses: 4 });

    const result = await getReEvalSignal(reviewId);
    expect(result!.updatedSignal).toBe("hire");
    expect(result!.resolvedCount).toBe(4);

    // Confirm only one document exists (upsert, not duplicate)
    const count = await client
      .db("drawlint-db")
      .collection("reeval_signals")
      .countDocuments({ reviewId: new ObjectId(reviewId) });
    expect(count).toBe(1);
  });

  it("gallery signal resolution: reeval takes precedence over original", () => {
    // Pure logic — no DB needed
    const original = "no-hire";
    const reeval = { updatedSignal: "hire" };

    const resolved = reeval?.updatedSignal ?? original;
    expect(resolved).toBe("hire");
  });

  it("gallery signal resolution: falls back to original when no reeval", () => {
    const original = "lean-hire";
    const reeval = null;

    const resolved = reeval?.updatedSignal ?? original;
    expect(resolved).toBe("lean-hire");
  });
});
