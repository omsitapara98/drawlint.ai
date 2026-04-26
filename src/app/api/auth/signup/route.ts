import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import clientPromise from "@/lib/db/mongodb";
import { sendVerificationEmail, hashToken } from "@/lib/email/send";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const { name, email, password } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if user already exists
    const existingUser = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // Return same shape as success to prevent account enumeration
      return NextResponse.json(
        { message: "Account created", emailSent: true },
        { status: 201 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token — store only the hash in DB
    const rawToken = crypto.randomUUID();
    const tokenHash = hashToken(rawToken);
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const now = new Date();

    // Create user — emailVerified is null until the link is clicked
    await db.collection("users").insertOne({
      name: name.trim(),
      email: email.toLowerCase(),
      hashedPassword,
      emailVerified: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiry: tokenExpiry,
      emailVerificationSentAt: now,
      image: null,
      createdAt: now,
    });

    // Send verification email (non-fatal — don't block account creation if mail fails)
    let emailSent = true;
    try {
      await sendVerificationEmail(email.toLowerCase(), rawToken);
    } catch (err) {
      console.error("Verification email failed to send:", err);
      emailSent = false;
    }

    // Send welcome email (non-fatal)
    try {
      const { sendWelcomeEmail } = await import("@/lib/email/welcome");
      await sendWelcomeEmail(email.toLowerCase(), name.trim());
    } catch (err) {
      console.error("Welcome email failed to send:", err);
    }

    return NextResponse.json(
      { message: "Account created", emailSent },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

