import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "drawlint-db";
const MANAGED_LIMIT = 10;

export type AiMode = "managed" | "byo";

export interface ManagedUsage {
  count: number;
  month: number;
  year: number;
}

export interface ByoCredentials {
  apiKey: string;
  endpoint: string;
  deployment: string;
}

export interface UserAiSettings {
  aiMode: AiMode;
  managedUsage: ManagedUsage;
  hasByoCredentials: boolean;
  maskedKeyLast4?: string;
  endpoint?: string;
  deployment?: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  reason?: "quota_exceeded";
}

export async function getUserAiSettings(userId: string): Promise<UserAiSettings> {
  const client = await clientPromise;
  const user = await client.db(DB_NAME).collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { aiMode: 1, managedUsage: 1, byoCredentials: 1 } },
  );

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const aiMode = (user?.aiMode as AiMode) ?? "managed";
  const storedUsage = user?.managedUsage as ManagedUsage | undefined;
  const managedUsage: ManagedUsage =
    storedUsage?.month === month && storedUsage?.year === year
      ? storedUsage
      : { count: 0, month, year };

  const byo = user?.byoCredentials as ByoCredentials | undefined;
  const hasByoCredentials = !!(byo?.apiKey && byo?.endpoint && byo?.deployment);

  return {
    aiMode,
    managedUsage,
    hasByoCredentials,
    maskedKeyLast4: hasByoCredentials ? byo!.apiKey.slice(-4) : undefined,
    endpoint: byo?.endpoint,
    deployment: byo?.deployment,
  };
}

export async function updateAiMode(userId: string, mode: AiMode): Promise<void> {
  const client = await clientPromise;
  await client.db(DB_NAME).collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { aiMode: mode, updatedAt: new Date() } },
  );
}

export async function saveByoCredentials(
  userId: string,
  credentials: ByoCredentials,
): Promise<void> {
  const client = await clientPromise;
  await client.db(DB_NAME).collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { byoCredentials: credentials, updatedAt: new Date() } },
  );
}

export async function clearByoCredentials(userId: string): Promise<void> {
  const client = await clientPromise;
  await client.db(DB_NAME).collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $unset: { byoCredentials: "" }, $set: { updatedAt: new Date() } },
  );
}

export async function getByoCredentials(userId: string): Promise<ByoCredentials | null> {
  const client = await clientPromise;
  const user = await client.db(DB_NAME).collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { byoCredentials: 1 } },
  );
  const creds = user?.byoCredentials as ByoCredentials | undefined;
  if (!creds?.apiKey || !creds.endpoint || !creds.deployment) return null;
  return creds;
}

/**
 * Atomically checks and increments managed quota for the current month.
 * Uses two findOneAndUpdate passes to handle month resets safely.
 */
export async function checkAndIncrementManagedQuota(
  userId: string,
): Promise<QuotaCheckResult> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection("users");
  const oid = new ObjectId(userId);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Pass 1: same month/year AND under limit → increment
  const pass1 = await col.findOneAndUpdate(
    {
      _id: oid,
      "managedUsage.month": month,
      "managedUsage.year": year,
      "managedUsage.count": { $lt: MANAGED_LIMIT },
    },
    { $inc: { "managedUsage.count": 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (pass1) {
    const usage = pass1.managedUsage as ManagedUsage;
    return { allowed: true, used: usage.count, limit: MANAGED_LIMIT };
  }

  // Pass 2: new month or no usage yet → reset to 1
  const pass2 = await col.findOneAndUpdate(
    {
      _id: oid,
      $or: [
        { managedUsage: { $exists: false } },
        { "managedUsage.month": { $ne: month } },
        { "managedUsage.year": { $ne: year } },
      ],
    },
    {
      $set: { managedUsage: { count: 1, month, year }, updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );

  if (pass2) {
    return { allowed: true, used: 1, limit: MANAGED_LIMIT };
  }

  // Both passes failed → quota exceeded
  const user = await col.findOne({ _id: oid }, { projection: { managedUsage: 1 } });
  const existing = user?.managedUsage as ManagedUsage | undefined;

  return {
    allowed: false,
    used: existing?.count ?? MANAGED_LIMIT,
    limit: MANAGED_LIMIT,
    reason: "quota_exceeded",
  };
}
