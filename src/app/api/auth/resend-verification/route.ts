import { NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { sendVerificationEmail, hashToken } from "@/lib/email/send";

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, emailVerified: 1, emailVerificationSentAt: 1 } },
  );

  if (!user || user.emailVerified) {
    // Generic response to prevent enumeration
    return NextResponse.json({ message: "If your email needs verification, a new link has been sent.", emailSent: true });
  }

  // Rate-limit: must wait 60s between sends
  if (user.emailVerificationSentAt) {
    const elapsed = Date.now() - (user.emailVerificationSentAt as Date).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSecs = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSecs} seconds before requesting another email.` },
        { status: 429 },
      );
    }
  }

  const rawToken = crypto.randomUUID();
  const tokenHash = hashToken(rawToken);
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const now = new Date();

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiry: tokenExpiry,
        emailVerificationSentAt: now,
        updatedAt: now,
      },
    },
  );

  let emailSent = true;
  try {
    await sendVerificationEmail(user.email as string, rawToken);
  } catch (err) {
    console.error("Resend verification email failed:", err);
    emailSent = false;
  }

  return NextResponse.json({ message: "Verification email sent.", emailSent });
}
