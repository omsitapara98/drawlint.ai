import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "drawlint-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const userId = session.user.id;

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, email: 1, hashedPassword: 1, emailVerified: 1, createdAt: 1 } },
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get connected OAuth providers (userId may be string or ObjectId depending on auth adapter)
    const accounts = await db.collection("accounts").find(
      { $or: [{ userId }, { userId: new ObjectId(userId) }] },
      { projection: { provider: 1 } },
    ).toArray();

    const providers = accounts.map((a) => a.provider as string);
    // OAuth-only users (no password) are implicitly verified
    const emailVerified = !user.hashedPassword || !!user.emailVerified;

    return NextResponse.json({
      name: user.name,
      email: user.email,
      hasPassword: !!user.hashedPassword,
      emailVerified,
      providers,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get account error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const userId = session.user.id;
    const oid = new ObjectId(userId);

    // Delete all user data (accounts/sessions may use ObjectId or string userId)
    await Promise.all([
      db.collection("users").deleteOne({ _id: oid }),
      db.collection("accounts").deleteMany({ $or: [{ userId }, { userId: oid }] }),
      db.collection("sessions").deleteMany({ $or: [{ userId }, { userId: oid }] }),
      db.collection("reviews").deleteMany({ userId }),
      db.collection("responses").deleteMany({ userId }),
      db.collection("reeval_signals").deleteMany({ userId }),
      db.collection("passwordResetTokens").deleteMany({ userId: oid }),
    ]);

    return NextResponse.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
