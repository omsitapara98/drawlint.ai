import { NextResponse } from "next/server";
import { getDailyLeaderboard, getAllTimeLeaderboard } from "@/lib/db/drills";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { DEFAULT_DRILL_CATEGORY, getDayId } from "@/types/drills";

export const dynamic = "force-dynamic";

/**
 * GET /api/drills/leaderboard?scope=daily|all-time
 * Returns ranked drill leaderboard entries with user display names/avatars.
 * Defaults to the daily scope for today.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "all-time" ? "all-time" : "daily";
  const category = DEFAULT_DRILL_CATEGORY;

  if (scope === "daily") {
    const rows = await getDailyLeaderboard(getDayId(), category, 50);
    if (rows.length === 0) {
      return NextResponse.json({ scope, entries: [] });
    }

    const userMap = await fetchUsers(rows.map((r) => r.userId.toString()));

    const entries = rows.map((r, i) => {
      const user = userMap.get(r.userId.toString());
      return {
        rank: i + 1,
        displayName: displayNameFor(user),
        avatarUrl: avatarFor(user),
        score: r.score,
        correctCount: r.correctCount,
        durationMs: r.durationMs,
        submittedAt: r.submittedAt,
      };
    });

    return NextResponse.json({ scope, entries });
  }

  const rows = await getAllTimeLeaderboard(50);
  if (rows.length === 0) {
    return NextResponse.json({ scope, entries: [] });
  }

  const userMap = await fetchUsers(rows.map((r) => r.userId.toString()));

  const entries = rows.map((r, i) => {
    const user = userMap.get(r.userId.toString());
    return {
      rank: i + 1,
      displayName: displayNameFor(user),
      avatarUrl: avatarFor(user),
      totalPoints: r.totalPoints,
      currentStreak: r.currentStreak,
      longestStreak: r.longestStreak,
      totalCompleted: r.totalCompleted,
    };
  });

  return NextResponse.json({ scope, entries });
}

type UserDoc = { _id: ObjectId; name?: string; image?: string | null; pseudonym?: string };

/** Batch-fetch users by their ObjectIds, mirroring the challenge leaderboard route. */
async function fetchUsers(ids: string[]): Promise<Map<string, UserDoc>> {
  const client = await clientPromise;
  const db = client.db("drawlint-db");
  const userIds = [...new Set(ids)];
  const users = await db
    .collection("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ _id: 1, name: 1, image: 1, pseudonym: 1 })
    .toArray();
  return new Map(users.map((u) => [u._id.toString(), u as UserDoc]));
}

function displayNameFor(user: UserDoc | undefined): string {
  return (user?.name as string) ?? (user?.pseudonym as string) ?? "Anonymous";
}

function avatarFor(user: UserDoc | undefined): string | null {
  return (user?.image as string | null) ?? null;
}
