import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * PATCH /api/settings/child-activity
 * Update parent's consent for sharing child activity in feed
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { shareChildActivity } = body;

    if (typeof shareChildActivity !== "boolean") {
      return NextResponse.json(
        { error: "shareChildActivity must be a boolean" },
        { status: 400 }
      );
    }

    // Update user setting
    await db.user.update({
      where: { id: user.id },
      data: { shareChildActivity },
    });

    return NextResponse.json({ success: true, shareChildActivity });
  } catch (error) {
    console.error("Failed to update child activity setting:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
