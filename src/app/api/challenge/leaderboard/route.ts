import { NextResponse } from "next/server";
import { getChallengeLeaderboard, getChallengeByWeek } from "@/lib/db/challenges";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { getWeekId } from "@/types/challenge";

export const dynamic = "force-dynamic";

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire",
  hire: "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

/**
 * GET /api/challenge/leaderboard?weekId=2026-W18
 * Returns ranked submissions for a challenge week.
 * Defaults to current week if no weekId provided.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId") ?? getWeekId();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);

  const challenge = await getChallengeByWeek(weekId);
  if (!challenge) {
    return NextResponse.json({ leaderboard: [], weekId });
  }

  const submissions = await getChallengeLeaderboard(challenge._id.toString(), limit);

  if (submissions.length === 0) {
    return NextResponse.json({ leaderboard: [], weekId });
  }

  // Batch-fetch user display names
  const client = await clientPromise;
  const db = client.db("drawlint-db");
  const userIds = [...new Set(submissions.map((s) => s.userId.toString()))];
  const users = await db
    .collection("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ _id: 1, name: 1, image: 1, pseudonym: 1 })
    .toArray();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Check if submissions used anonymous names
  const designIds = submissions.map((s) => s.designId.toString());
  const designs = await db
    .collection("designs")
    .find({ _id: { $in: designIds.map((id) => new ObjectId(id)) } })
    .project({ _id: 1, anonymousName: 1 })
    .toArray();
  const designMap = new Map(designs.map((d) => [d._id.toString(), d]));

  const leaderboard = submissions.map((s, i) => {
    const user = userMap.get(s.userId.toString());
    const design = designMap.get(s.designId.toString());
    const isAnonymous = !!design?.anonymousName;

    return {
      rank: i + 1,
      displayName: isAnonymous
        ? (design?.anonymousName as string)
        : (user?.name as string) ?? "Unknown",
      avatarUrl: isAnonymous ? null : (user?.image as string | null) ?? null,
      score: s.score,
      signal: s.signal,
      signalLabel: SIGNAL_LABELS[s.signal] ?? s.signal,
      designId: s.designId.toString(),
      submittedAt: s.submittedAt,
    };
  });

  return NextResponse.json({ leaderboard, weekId });
}
