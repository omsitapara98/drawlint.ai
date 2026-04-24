import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignsByUser } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const designs = await getDesignsByUser(session.user.id);

  const client = await clientPromise;
  const db = client.db("drawlint-db");

  const enriched = await Promise.all(
    designs.map(async (d) => {
      const topic = await db.collection("topics").findOne(
        { _id: new ObjectId(d.topicId) },
        { projection: { name: 1, slug: 1 } },
      );
      const review = await getReviewByDesignId(d._id.toString());
      return {
        _id: d._id,
        topicId: d.topicId,
        topicName: topic?.name ?? "Unknown",
        topicSlug: topic?.slug ?? "unknown",
        version: d.version,
        status: d.status,
        reviewLevel: d.reviewLevel,
        hasReview: !!review,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    }),
  );

  return NextResponse.json({ designs: enriched });
}
