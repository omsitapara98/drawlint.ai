import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/db/mongodb";
import { hashToken } from "@/lib/email/send";

const DB_NAME = "drawlint-db";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const hashed = hashToken(token);
    const resetRecord = await db.collection("passwordResetTokens").findOne({
      token: hashed,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 },
      );
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.collection("users").updateOne(
      { _id: resetRecord.userId },
      { $set: { hashedPassword, updatedAt: new Date() } },
    );

    // Delete all reset tokens for this user
    await db.collection("passwordResetTokens").deleteMany({ userId: resetRecord.userId });

    return NextResponse.json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
