import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserStreak } from "@/lib/db/challenges";

export const dynamic = "force-dynamic";

/**
 * GET /api/challenge/streak
 * Returns the current user's streak data.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ streak: null });
  }

  const streak = await getUserStreak(session.user.id);

  return NextResponse.json({
    streak: streak
      ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          totalCompleted: streak.totalCompleted,
          lastCompletedWeek: streak.lastCompletedWeek,
        }
      : {
          currentStreak: 0,
          longestStreak: 0,
          totalCompleted: 0,
          lastCompletedWeek: null,
        },
  });
}
