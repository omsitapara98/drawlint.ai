import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserAiSettings,
  updateAiMode,
  isEmailVerified,
  MANAGED_LIMIT,
  type AiMode,
} from "@/lib/db/users";

function nextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserAiSettings(session.user.id);
  const emailVerified = await isEmailVerified(session.user.id);
  const isUnlimited = settings.role !== "free";
  return NextResponse.json({
    aiMode: settings.aiMode,
    role: settings.role,
    emailVerified,
    managedUsage: {
      ...settings.managedUsage,
      limit: isUnlimited ? null : MANAGED_LIMIT,
      resetsOn: nextResetDate(),
    },
  });
}

interface PatchBody {
  aiMode?: AiMode;
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = session.user.id;

  if (body.aiMode !== undefined) {
    if (body.aiMode !== "managed" && body.aiMode !== "byo") {
      return NextResponse.json({ error: "Invalid aiMode" }, { status: 400 });
    }
    await updateAiMode(userId, body.aiMode);
  }

  const settings = await getUserAiSettings(userId);
  const emailVerified = await isEmailVerified(userId);
  const isUnlimited = settings.role !== "free";
  return NextResponse.json({
    aiMode: settings.aiMode,
    role: settings.role,
    emailVerified,
    managedUsage: {
      ...settings.managedUsage,
      limit: isUnlimited ? null : MANAGED_LIMIT,
      resetsOn: nextResetDate(),
    },
  });
}
