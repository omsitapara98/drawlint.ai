import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { beforeAll, afterAll, afterEach } from "vitest";

const DB_NAME = "drawlint-db";

/**
 * Module-level deferred promise that the `vi.mock("@/lib/db/mongodb")` factory
 * in each test file resolves. Wire it up with one line at the top of the test:
 *
 *   vi.mock("@/lib/db/mongodb", () => ({ default: mongoMock.deferred }));
 *
 * Why this works without `vi.hoisted`:
 * - vitest auto-hoists `vi.mock` above the imports, but the factory function
 *   itself is invoked LAZILY (only when the mocked module is first imported,
 *   e.g. via `import { ... } from "@/lib/db/challenges"` later in the file).
 * - By the time the factory runs, all `import` statements in the test file
 *   have been evaluated, including this helper, so `mongoMock.deferred` is
 *   defined.
 * - We do NOT export a `vi.hoisted(...)` value because vitest forbids that
 *   ("Cannot export hoisted variable") — the deferred is a regular const.
 */
let resolveFn!: (c: MongoClient) => void;
const deferredClient: Promise<MongoClient> = new Promise((r) => {
  resolveFn = r;
});

export const mongoMock = {
  deferred: deferredClient,
  resolveClient: (c: MongoClient) => resolveFn(c),
};

export interface MongoFixtureOptions {
  /** Collections to wipe (deleteMany) between tests. */
  collections: readonly string[];
  /** Index-creation callbacks run once in `beforeAll`. */
  indexes?: ReadonlyArray<(db: Db) => Promise<void>>;
}

export interface MongoFixture {
  getClient: () => MongoClient;
  getDb: () => Db;
}

/**
 * Sets up an in-memory MongoDB for the current test file.
 *
 * MUST be called at the top level of a test file (not inside a `describe`),
 * because it registers `beforeAll`/`afterAll`/`afterEach` hooks. The caller
 * must also place
 *   `vi.mock("@/lib/db/mongodb", () => ({ default: mongoMock.deferred }))`
 * BEFORE the import of any module that touches `@/lib/db/mongodb`.
 */
export function useMongoFixture(options: MongoFixtureOptions): MongoFixture {
  let mongod: MongoMemoryServer;
  let client: MongoClient;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    mongoMock.resolveClient(client);

    if (options.indexes && options.indexes.length > 0) {
      const db = client.db(DB_NAME);
      for (const fn of options.indexes) {
        await fn(db);
      }
    }
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  afterEach(async () => {
    const db = client.db(DB_NAME);
    await Promise.all(
      options.collections.map((c) => db.collection(c).deleteMany({})),
    );
  });

  return {
    getClient: () => client,
    getDb: () => client.db(DB_NAME),
  };
}

