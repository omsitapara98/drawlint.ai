import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDailyDrill,
  recordAttempt,
  updateDrillStats,
  DuplicateDrillAttemptError,
} from "@/lib/db/drills";
import { DEFAULT_DRILL_CATEGORY, getDayId, computeScore } from "@/types/drills";

export const dynamic = "force-dynamic";

interface SubmitBody {
  answers?: unknown;
  durationMs?: unknown;
}

/**
 * POST /api/drills/submit
 * Grades today's drill server-side and (for signed-in users) records the attempt.
 * Anonymous users get graded feedback + a sign-in nudge; nothing is saved.
 *
 * Body: { answers: number[], durationMs: number }
 */
export async function POST(request: Request) {
  try {
    const category = DEFAULT_DRILL_CATEGORY;
    const dayId = getDayId();

    const drill = await getDailyDrill(dayId, category);
    if (!drill) {
      return NextResponse.json(
        { error: "No drill available for today. Load /api/drills/today first." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as SubmitBody;
    const questionCount = drill.questions.length;

    if (!Array.isArray(body.answers) || body.answers.length !== questionCount) {
      return NextResponse.json(
        { error: `answers must be an array of length ${questionCount}.` },
        { status: 400 },
      );
    }

    // Coerce/guard each answer to an integer in 0..3.
    const answers: number[] = body.answers.map((a) => {
      const n = Math.trunc(Number(a));
      return Number.isFinite(n) && n >= 0 && n <= 3 ? n : -1;
    });

    const durationMs = Math.max(0, Math.trunc(Number(body.durationMs)) || 0);

    // Grade server-side against the stored correct answers.
    let correctCount = 0;
    const results = drill.questions.map((q, i) => {
      const userAnswer = answers[i];
      const correct = userAnswer === q.correctIndex;
      if (correct) correctCount++;
      return {
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        userAnswer,
        correct,
      };
    });

    const score = computeScore(correctCount, durationMs);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        recorded: false,
        requiresSignIn: true,
        correctCount,
        score,
        results,
      });
    }

    const userId = session.user.id;

    try {
      await recordAttempt(userId, dayId, category, answers, correctCount, score, durationMs);
    } catch (err) {
      if (err instanceof DuplicateDrillAttemptError) {
        return NextResponse.json({
          recorded: false,
          alreadyPlayed: true,
          correctCount,
          score,
          results,
        });
      }
      throw err;
    }

    const stats = await updateDrillStats(userId, dayId, score);

    return NextResponse.json({
      recorded: true,
      correctCount,
      score,
      results,
      stats,
    });
  } catch (err) {
    console.error("POST /api/drills/submit failed:", err);
    return NextResponse.json({ error: "Failed to submit drill." }, { status: 500 });
  }
}
