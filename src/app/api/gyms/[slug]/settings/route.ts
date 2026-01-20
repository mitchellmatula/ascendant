import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PATCH - Update gym settings (visibility)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  
  const gym = await db.gym.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });

  if (!gym) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  // Only owner can update settings
  if (gym.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid isActive value" }, { status: 400 });
  }

  const updated = await db.gym.update({
    where: { id: gym.id },
    data: { isActive },
  });

  return NextResponse.json({ success: true, isActive: updated.isActive });
}
