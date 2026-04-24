import { NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { hashToken } from "@/lib/email/send";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const client = await clientPromise;
    const db = client.db();

    // Atomic: find by token hash + not expired + not yet verified, then verify
    const result = await db.collection("users").findOneAndUpdate(
      {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiry: { $gt: new Date() },
        emailVerified: null,
      },
      {
        $set: { emailVerified: new Date(), updatedAt: new Date() },
        $unset: {
          emailVerificationTokenHash: "",
          emailVerificationExpiry: "",
          emailVerificationSentAt: "",
        },
      },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json(
        { error: "This link is invalid or has expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Email verified successfully." });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
