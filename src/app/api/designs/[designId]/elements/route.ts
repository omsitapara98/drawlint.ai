import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDesignById } from "@/lib/db/designs";
import { downloadDesign } from "@/lib/blob/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ designId: string }> },
) {
  const { designId } = await params;

  let design;
  try {
    design = await getDesignById(designId);
  } catch {
    return NextResponse.json({ error: "Invalid design ID." }, { status: 400 });
  }

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  // Only drafts are owner-only; reviewed/submitted designs are publicly readable
  if (design.status === "draft") {
    const session = await auth();
    if (!session?.user?.id || design.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const elements = await downloadDesign(design.blobKey);
    return NextResponse.json({ elements });
  } catch (err) {
    console.error("Failed to download design elements:", err);
    return NextResponse.json(
      { error: "Failed to retrieve design elements." },
      { status: 500 },
    );
  }
}
