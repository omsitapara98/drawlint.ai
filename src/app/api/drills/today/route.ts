import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDailyDrill,
  saveDailyDrill,
  getUserAttemptForDay,
} from "@/lib/db/drills";
import { generateDailyDrillQuestions } from "@/lib/db/drills-generate";
import { DEFAULT_DRILL_CATEGORY, getDayId } from "@/types/drills";

export const dynamic = "force-dynamic";

/**
 * GET /api/drills/today
 * Returns today's drill questions WITHOUT answers. Generates and caches the
 * question set on first request of the day (race-safe via saveDailyDrill's
 * upsert). For signed-in users, also reports whether they've already played.
 */
export async function GET() {
  try {
    const category = DEFAULT_DRILL_CATEGORY;
    const dayId = getDayId();

    let drill = await getDailyDrill(dayId, category);
    if (!drill) {
      const questions = await generateDailyDrillQuestions(category, dayId);
      await saveDailyDrill(dayId, category, questions);
      // Re-read so concurrent first-requests converge on the canonical doc.
      drill = await getDailyDrill(dayId, category);
    }

    if (!drill) {
      return NextResponse.json(
        { error: "Failed to load today's drill." },
        { status: 500 },
      );
    }

    // Strip server-only answer data before sending to the client.
    const questions = drill.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
    }));

    let alreadyPlayed = false;
    let previousAttempt: { score: number; correctCount: number } | null = null;

    const session = await auth();
    if (session?.user?.id) {
      const prior = await getUserAttemptForDay(session.user.id, dayId, category);
      alreadyPlayed = !!prior;
      previousAttempt = prior
        ? { score: prior.score, correctCount: prior.correctCount }
        : null;
    }

    return NextResponse.json({
      dayId,
      category,
      questions,
      alreadyPlayed,
      previousAttempt,
    });
  } catch (err) {
    console.error("GET /api/drills/today failed:", err);
    return NextResponse.json({ error: "Failed to load today's drill." }, { status: 500 });
  }
}
