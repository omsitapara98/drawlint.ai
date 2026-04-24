import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "drawlint-db";
export const MANAGED_LIMIT = 10;

export type AiMode = "managed" | "byo";
export type UserRole = "free" | "premium" | "admin";

export interface ManagedUsage {
  count: number;
  month: number;
  year: number;
}

export interface UserAiSettings {
  aiMode: AiMode;
  role: UserRole;
  managedUsage: ManagedUsage;
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
    { projection: { aiMode: 1, managedUsage: 1, role: 1 } },
  );

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const aiMode = (user?.aiMode as AiMode) ?? "managed";
  const role = (user?.role as UserRole) ?? "free";
  const storedUsage = user?.managedUsage as ManagedUsage | undefined;
  const managedUsage: ManagedUsage =
    storedUsage?.month === month && storedUsage?.year === year
      ? storedUsage
      : { count: 0, month, year };

  return { aiMode, role, managedUsage };
}

export async function updateAiMode(userId: string, mode: AiMode): Promise<void> {
  const client = await clientPromise;
  await client.db(DB_NAME).collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { aiMode: mode, updatedAt: new Date() } },
  );
}

/**
 * Read-only quota check — does NOT increment.
 * Use this upfront to block users who've exceeded the limit before starting the AI call.
 */
export async function checkManagedQuota(userId: string): Promise<QuotaCheckResult> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection("users");
  const oid = new ObjectId(userId);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const user = await col.findOne({ _id: oid }, { projection: { managedUsage: 1, role: 1 } });

  // Premium and admin users have unlimited access — skip quota
  const role = (user?.role as UserRole) ?? "free";
  if (role !== "free") {
    return { allowed: true, used: 0, limit: MANAGED_LIMIT };
  }

  const existing = user?.managedUsage as ManagedUsage | undefined;

  if (!existing || existing.month !== month || existing.year !== year) {
    return { allowed: true, used: 0, limit: MANAGED_LIMIT };
  }

  if (existing.count < MANAGED_LIMIT) {
    return { allowed: true, used: existing.count, limit: MANAGED_LIMIT };
  }

  return { allowed: false, used: existing.count, limit: MANAGED_LIMIT, reason: "quota_exceeded" };
}

/**
 * Increments the managed quota for the current month.
 * Call this ONLY after a successful AI review completion.
 */
export async function incrementManagedQuota(userId: string): Promise<void> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection("users");
  const oid = new ObjectId(userId);

  // Don't count usage for premium/admin users
  const user = await col.findOne({ _id: oid }, { projection: { role: 1 } });
  const role = (user?.role as UserRole) ?? "free";
  if (role !== "free") return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await col.updateOne(
    { _id: oid, "managedUsage.month": month, "managedUsage.year": year },
    { $inc: { "managedUsage.count": 1 }, $set: { updatedAt: new Date() } },
  );

  if (result.matchedCount === 0) {
    // New month or no usage record yet — reset to 1
    await col.updateOne(
      { _id: oid },
      { $set: { managedUsage: { count: 1, month, year }, updatedAt: new Date() } },
    );
  }
}

/**
 * Returns true if the user's email is verified.
 * OAuth users (no hashedPassword) are always treated as verified.
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const client = await clientPromise;
  const user = await client.db(DB_NAME).collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { emailVerified: 1, hashedPassword: 1 } },
  );
  if (!user) return false;
  // OAuth-only users have no password — they're implicitly verified
  if (!user.hashedPassword) return true;
  return user.emailVerified != null;
}
