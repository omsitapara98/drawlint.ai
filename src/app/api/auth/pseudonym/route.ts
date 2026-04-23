import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "drawlint-db";

const ADJECTIVES = [
  "Swift", "Brave", "Curious", "Clever", "Bold", "Calm", "Keen", "Wise",
  "Noble", "Bright", "Agile", "Steady", "Quick", "Sharp", "Silent", "Fierce",
  "Gentle", "Witty", "Daring", "Nimble",
];

const ANIMALS = [
  "Panda", "Eagle", "Fox", "Wolf", "Owl", "Bear", "Hawk", "Lion", "Tiger",
  "Falcon", "Lynx", "Raven", "Cobra", "Otter", "Shark", "Phoenix", "Dragon",
  "Panther", "Jaguar", "Viper",
];

function generatePseudonym(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${adj} ${animal} ${num}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const users = db.collection("users");

  const user = await users.findOne(
    { _id: new ObjectId(session.user.id) },
    { projection: { pseudonym: 1 } },
  );

  if (user?.pseudonym) {
    return NextResponse.json({ pseudonym: user.pseudonym as string });
  }

  // Generate + persist
  const pseudonym = generatePseudonym();
  await users.updateOne(
    { _id: new ObjectId(session.user.id) },
    { $set: { pseudonym } },
  );

  return NextResponse.json({ pseudonym });
}
