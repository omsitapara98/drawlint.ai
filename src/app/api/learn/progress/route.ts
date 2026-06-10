import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getCompletedLessons,
  setLessonCompleted,
} from "@/lib/db/learn-progress";
import { allLessonSlugs } from "@/app/learn/_content/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/learn/progress
 * Returns the signed-in user's completed lesson slugs.
 * Anonymous callers get an empty list with authenticated: false (no error),
 * so the public workbook can fall back to local storage.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, completed: [] });
  }
  const completed = await getCompletedLessons(session.user.id);
  return NextResponse.json({ authenticated: true, completed });
}

interface PostBody {
  slug?: string;
  completed?: boolean;
}

/**
 * POST /api/learn/progress
 * Body: { slug: string, completed: boolean }
 * Marks a lesson complete/incomplete for the signed-in user.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, completed } = body;
  if (typeof slug !== "string" || typeof completed !== "boolean") {
    return NextResponse.json(
      { error: "Expected { slug: string, completed: boolean }" },
      { status: 400 },
    );
  }
  if (!allLessonSlugs().includes(slug)) {
    return NextResponse.json({ error: "Unknown lesson slug" }, { status: 400 });
  }

  const updated = await setLessonCompleted(session.user.id, slug, completed);
  return NextResponse.json({ authenticated: true, completed: updated });
}
