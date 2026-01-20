import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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
      include: { 
        athlete: { select: { id: true } },
        managedAthletes: { select: { id: true } },
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Collect all athlete IDs (own + managed)
    const athleteIds: string[] = [];
    if (user.athlete) {
      athleteIds.push(user.athlete.id);
    }
    athleteIds.push(...user.managedAthletes.map(a => a.id));

    if (athleteIds.length === 0) {
      return NextResponse.json({ error: "No athlete profile found" }, { status: 404 });
    }
    
    // Mark as read if notification belongs to one of user's athletes
    await db.notification.updateMany({
      where: {
        id,
        athleteId: { in: athleteIds },
      },
      data: { isRead: true },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
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
      include: { 
        athlete: { select: { id: true } },
        managedAthletes: { select: { id: true } },
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Collect all athlete IDs (own + managed)
    const athleteIds: string[] = [];
    if (user.athlete) {
      athleteIds.push(user.athlete.id);
    }
    athleteIds.push(...user.managedAthletes.map(a => a.id));

    if (athleteIds.length === 0) {
      return NextResponse.json({ error: "No athlete profile found" }, { status: 404 });
    }
    
    // Verify notification belongs to one of user's athletes and delete
    await db.notification.deleteMany({
      where: {
        id,
        athleteId: { in: athleteIds },
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
