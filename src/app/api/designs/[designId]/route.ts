import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignById, deleteDesign } from "@/lib/db/designs";
import { getReviewByDesignId, deleteReviewByDesignId } from "@/lib/db/reviews";
import { decrementSubmissionCount } from "@/lib/db/topics";
import { deleteDesign as deleteBlob } from "@/lib/blob/storage";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import type { Topic } from "@/types/library";

const DB_NAME = "drawlint-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const { designId } = await params;

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const review = await getReviewByDesignId(designId);

  // Fetch author info
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const author = await db.collection("users").findOne(
    { _id: new ObjectId(design.userId) },
    { projection: { _id: 1, name: 1, image: 1 } },
  );

  // Fetch topic
  const topic = await db
    .collection<Topic>("topics")
    .findOne({ _id: new ObjectId(design.topicId) });

  return NextResponse.json({ design, review, author, topic });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await params;

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  // Must be the author
  if (design.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete blob
  try {
    await deleteBlob(design.blobKey);
  } catch (err) {
    console.error("Failed to delete blob:", err);
  }

  // Delete review
  await deleteReviewByDesignId(designId);

  // Delete design doc
  await deleteDesign(designId);

  // Decrement topic count
  await decrementSubmissionCount(design.topicId.toString());

  return new NextResponse(null, { status: 204 });
}
