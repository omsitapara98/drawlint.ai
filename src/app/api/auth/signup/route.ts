import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/db/mongodb";

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
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (auto-verified for alpha)
    const result = await db.collection("users").insertOne({
      name: name.trim(),
      email: email.toLowerCase(),
      hashedPassword,
      emailVerified: new Date(),
      image: null,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "Account created", userId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
