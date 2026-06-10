import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserDrillStats, getUserAttemptForDay } from "@/lib/db/drills";
import { DEFAULT_DRILL_CATEGORY, getDayId } from "@/types/drills";

export const dynamic = "force-dynamic";

/**
 * GET /api/drills/stats
 * Returns the current user's drill stats plus whether they've already played today.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const category = DEFAULT_DRILL_CATEGORY;
  const dayId = getDayId();

  const stats = await getUserDrillStats(userId);
  const attempt = await getUserAttemptForDay(userId, dayId, category);

  return NextResponse.json({
    stats: stats
      ? {
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          lastCompletedDay: stats.lastCompletedDay,
          totalCompleted: stats.totalCompleted,
          totalPoints: stats.totalPoints,
        }
      : {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedDay: null,
          totalCompleted: 0,
          totalPoints: 0,
        },
    alreadyPlayedToday: !!attempt,
  });
}
