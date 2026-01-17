import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { markAsRead } from "@/lib/notifications";

// PATCH /api/notifications/[id] - Mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!user?.athlete) {
      return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });
    }
    
    await markAsRead(id, user.athlete.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
