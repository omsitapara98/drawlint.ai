import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "drawlint-db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { hashedPassword: 1 } },
    );

    if (!user?.hashedPassword) {
      return NextResponse.json(
        { error: "Your account uses OAuth sign-in. Password change is not available." },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { hashedPassword, updatedAt: new Date() } },
    );

    return NextResponse.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
