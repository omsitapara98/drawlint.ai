import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "@/lib/db/mongodb";
import { hashToken } from "@/lib/email/send";
import { sendPasswordResetEmail } from "@/lib/email/reset-password";

const DB_NAME = "drawlint-db";

const FORGOT_MAX_ATTEMPTS = 3;
const FORGOT_WINDOW_MS = 15 * 60 * 1000;
const forgotPasswordByIp = new Map<string, { count: number; windowStart: number }>();
const forgotPasswordByEmail = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of forgotPasswordByIp) {
    if (now - record.windowStart > FORGOT_WINDOW_MS) forgotPasswordByIp.delete(key);
  }
  for (const [key, record] of forgotPasswordByEmail) {
    if (now - record.windowStart > FORGOT_WINDOW_MS) forgotPasswordByEmail.delete(key);
  }
}, 30 * 60 * 1000).unref?.();

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({
    message: "If an account exists with this email, a reset link has been sent.",
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();

  const ipRecord = forgotPasswordByIp.get(ip);
  if (ipRecord && now - ipRecord.windowStart <= FORGOT_WINDOW_MS && ipRecord.count >= FORGOT_MAX_ATTEMPTS) {
    return successResponse;
  }

  const emailRecord = forgotPasswordByEmail.get(email);
  if (emailRecord && now - emailRecord.windowStart <= FORGOT_WINDOW_MS && emailRecord.count >= FORGOT_MAX_ATTEMPTS) {
    return successResponse;
  }

  if (!ipRecord || now - ipRecord.windowStart > FORGOT_WINDOW_MS) {
    forgotPasswordByIp.set(ip, { count: 1, windowStart: now });
  } else {
    ipRecord.count++;
  }

  if (!emailRecord || now - emailRecord.windowStart > FORGOT_WINDOW_MS) {
    forgotPasswordByEmail.set(email, { count: 1, windowStart: now });
  } else {
    emailRecord.count++;
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Only allow reset for email/password users
    const user = await db.collection("users").findOne(
      { email },
      { projection: { _id: 1, hashedPassword: 1 } },
    );

    if (!user || !user.hashedPassword) {
      // User doesn't exist or is OAuth-only — return success anyway
      return successResponse;
    }

    // Generate reset token (expires in 1 hour)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token (delete any existing ones first)
    await db.collection("passwordResetTokens").deleteMany({ userId: user._id });
    await db.collection("passwordResetTokens").insertOne({
      userId: user._id,
      token: hashed,
      expiresAt,
      createdAt: new Date(),
    });

    await sendPasswordResetEmail(email, rawToken);
  } catch (err) {
    console.error("Forgot password error:", err);
  }

  return successResponse;
}
