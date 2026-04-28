import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTopics, createTopic, getTopicBySlug } from "@/lib/db/topics";
import type { CreateTopicInput } from "@/types/library";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort =
    searchParams.get("sort") === "recent" ? "recent" : "popular";
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10) || 200, 1), 200)
    : undefined;

  const topics = await getTopics(sort, limit);
  return NextResponse.json({ topics });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateTopicInput;
  try {
    body = (await request.json()) as CreateTopicInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "Topic name is required." },
      { status: 400 },
    );
  }

  const name = body.name.trim();

  // Check for duplicate slug
  const slugify = (await import("slugify")).default;
  const slug = slugify(name, { lower: true, strict: true });
  const existing = await getTopicBySlug(slug);
  if (existing) {
    return NextResponse.json(
      { error: "A topic with this name already exists.", slug },
      { status: 409 },
    );
  }

  const topic = await createTopic(name, session.user.id);
  return NextResponse.json({ topic }, { status: 201 });
}
