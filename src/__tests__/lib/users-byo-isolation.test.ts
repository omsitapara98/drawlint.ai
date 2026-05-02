/**
 * T5 — Directive #8 lock-in test.
 *
 * Asserts that BYO API credentials (apiKey/endpoint/deployment) are NEVER
 * persisted to the MongoDB users document by the server-side users module.
 *
 * The only mutation entry point exposed by `@/lib/db/users` for AI settings
 * is `updateAiMode(userId, mode)` whose signature accepts ONLY the mode
 * (no credential fields). This test makes that contract executable so a
 * future change cannot quietly add credential persistence without breaking
 * a test.
 *
 * Investigation notes for reviewer:
 * - Searched `src/lib/db` for `apiKey|endpoint|deployment` → zero matches.
 * - Searched `src/app/api/user` → only `test-connection/route.ts` accepts
 *   credentials, and it never writes them to the DB (transit-only test call).
 * - The settings PATCH route (`src/app/api/user/settings/route.ts`) only
 *   forwards `body.aiMode` to `updateAiMode`.
 *
 * If a future change introduces a function like `updateAiCredentials` that
 * persists BYO keys, this file should be updated to assert the new boundary
 * (or the change should be rejected).
 */
import { ObjectId } from "mongodb";
import { vi, describe, it, expect } from "vitest";
import { mongoMock, useMongoFixture } from "../_helpers/mongo";

vi.mock("@/lib/db/mongodb", () => ({ default: mongoMock.deferred }));

import {
  updateAiMode,
  getUserAiSettings,
  type AiMode,
} from "@/lib/db/users";

const fixture = useMongoFixture({ collections: ["users"] });

const FORBIDDEN_FIELDS = ["apiKey", "endpoint", "deployment"] as const;
const SECRET_VALUES = {
  apiKey: "sk-secret-byo-apikey-DO-NOT-PERSIST",
  endpoint: "https://attacker.example.com/openai",
  deployment: "evil-deployment",
} as const;

async function seedUser(): Promise<string> {
  const oid = new ObjectId();
  await fixture.getDb().collection("users").insertOne({
    _id: oid,
    email: "test@example.com",
    role: "free",
  });
  return oid.toString();
}

async function readUserDoc(userId: string) {
  return fixture
    .getDb()
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });
}

describe("BYO key isolation (directive #8) — db/users", () => {
  it("updateAiMode persists ONLY aiMode + updatedAt (no credential fields)", async () => {
    const userId = await seedUser();
    await updateAiMode(userId, "azure");

    const doc = await readUserDoc(userId);
    expect(doc).not.toBeNull();
    expect(doc?.aiMode).toBe("azure");
    expect(doc?.updatedAt).toBeInstanceOf(Date);

    for (const field of FORBIDDEN_FIELDS) {
      expect(doc).not.toHaveProperty(field);
    }
  });

  it.each(["managed", "gemini", "azure"] as const)(
    "updateAiMode(%s) never writes credential fields",
    async (mode: AiMode) => {
      const userId = await seedUser();
      await updateAiMode(userId, mode);

      const doc = await readUserDoc(userId);
      for (const field of FORBIDDEN_FIELDS) {
        expect(doc).not.toHaveProperty(field);
      }
    },
  );

  it("updateAiMode signature does not accept credential params (compile-time guard, runtime smoke)", async () => {
    const userId = await seedUser();
    // updateAiMode is typed as (userId: string, mode: AiMode) — TypeScript blocks
    // a third arg. Use Function.length as a runtime echo of that contract.
    expect(updateAiMode.length).toBe(2);
    await updateAiMode(userId, "gemini");
    const doc = await readUserDoc(userId);
    expect(doc?.aiMode).toBe("gemini");
  });

  it("if a forged document somehow contains BYO credentials, getUserAiSettings does NOT surface them", async () => {
    // Defense-in-depth: even if a bug or migration leaked credentials into the
    // doc, the read path's projection should not return them.
    const userId = await seedUser();
    await fixture
      .getDb()
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            aiMode: "azure",
            apiKey: SECRET_VALUES.apiKey,
            endpoint: SECRET_VALUES.endpoint,
            deployment: SECRET_VALUES.deployment,
          },
        },
      );

    const settings = await getUserAiSettings(userId);

    // The returned shape must not contain the forbidden fields.
    const json = JSON.stringify(settings);
    for (const v of Object.values(SECRET_VALUES)) {
      expect(json).not.toContain(v);
    }
    for (const field of FORBIDDEN_FIELDS) {
      expect(settings as unknown as Record<string, unknown>).not.toHaveProperty(field);
    }

    // And the legit field is still resolved.
    expect(settings.aiMode).toBe("azure");
  });
});
