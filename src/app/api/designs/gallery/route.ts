import { NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const limit = 30;
  const skip = (page - 1) * limit;

  const client = await clientPromise;
  const db = client.db("drawlint-db");

  // Fetch reviewed/submitted designs, newest first
  const designs = await db
    .collection("designs")
    .find({ status: { $in: ["reviewed", "submitted"] } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  if (designs.length === 0) {
    return NextResponse.json({ designs: [], hasMore: false });
  }

  // Batch fetch topics and users
  const topicIds = [...new Set(designs.map((d) => d.topicId.toString()))];
  const userIds = [...new Set(designs.map((d) => d.userId.toString()))];

  const [topics, users] = await Promise.all([
    db
      .collection("topics")
      .find({ _id: { $in: topicIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, slug: 1 })
      .toArray(),
    db
      .collection("users")
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, image: 1 })
      .toArray(),
  ]);

  const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const enriched = designs.map((d) => {
    const topic = topicMap.get(d.topicId.toString());
    const user = userMap.get(d.userId.toString());
    const isAnonymous = !!d.anonymousName;

    return {
      _id: d._id.toString(),
      topicName: topic?.name ?? "Unknown Topic",
      topicSlug: topic?.slug ?? "unknown",
      displayName: isAnonymous
        ? d.anonymousName
        : (user?.name ?? "Anonymous"),
      avatarUrl: isAnonymous ? null : (user?.image ?? null),
      signal: d.review?.hireSignal ?? null,
      reviewLevel: d.review?.level ?? "mid",
      reviewedBy: d.review?.reviewedBy ?? null,
      submissionType: d.submissionType ?? "regular",
      isPremium: d.isPremium ?? false,
      createdAt: d.createdAt,
    };
  });

  return NextResponse.json({
    designs: enriched,
    hasMore: designs.length === limit,
  });
}
