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

  // Batch fetch topics, users, and reviews
  const designIds = designs.map((d) => d._id);
  const topicIds = [...new Set(designs.map((d) => d.topicId.toString()))];
  const userIds = [...new Set(designs.map((d) => d.userId.toString()))];

  const [topics, users, reviews] = await Promise.all([
    db
      .collection("topics")
      .find({ _id: { $in: topicIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, slug: 1 })
      .toArray(),
    db
      .collection("users")
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1, name: 1, image: 1, role: 1 })
      .toArray(),
    db
      .collection("reviews")
      .find({ designId: { $in: designIds } })
      .project({ _id: 1, designId: 1, level: 1, reviewedBy: 1, leadReviewer: 1 })
      .toArray(),
  ]);

  // Batch-fetch re-evaluated signals (latest hire call overrides original)
  const reviewIds = reviews.map((r) => r._id);
  const reevals = reviewIds.length
    ? await db
        .collection("reeval_signals")
        .find({ reviewId: { $in: reviewIds } })
        .project({ reviewId: 1, updatedSignal: 1 })
        .toArray()
    : [];

  const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const reviewMap = new Map(reviews.map((r) => [r.designId.toString(), r]));
  const reevalByReviewId = new Map(reevals.map((e) => [e.reviewId.toString(), e]));

  const enriched = designs.map((d) => {
    const topic = topicMap.get(d.topicId.toString());
    const user = userMap.get(d.userId.toString());
    const review = reviewMap.get(d._id.toString());
    const reeval = review ? reevalByReviewId.get(review._id.toString()) : null;
    const isAnonymous = !!d.anonymousName;

    return {
      _id: d._id.toString(),
      topicName: topic?.name ?? "Unknown Topic",
      topicSlug: topic?.slug ?? "unknown",
      displayName: isAnonymous
        ? d.anonymousName
        : (user?.name ?? "Anonymous"),
      avatarUrl: isAnonymous ? null : (user?.image ?? null),
      signal: reeval?.updatedSignal ?? review?.leadReviewer?.signal ?? null,
      reviewLevel: review?.level ?? d.reviewLevel ?? "mid",
      reviewedBy: review?.reviewedBy ?? null,
      submissionType: d.submissionType ?? "regular",
      isPremium: (d.isPremium ?? false) || user?.role === "premium" || user?.role === "admin",
      createdAt: d.createdAt,
    };
  });

  return NextResponse.json({
    designs: enriched,
    hasMore: designs.length === limit,
  });
}
