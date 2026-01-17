import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
} from "@/lib/notifications";

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get athlete for current user
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!user?.athlete) {
      return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const countOnly = searchParams.get("countOnly") === "true";
    
    // If only count is needed (for badge)
    if (countOnly) {
      const count = await getUnreadCount(user.athlete.id);
      return NextResponse.json({ unreadCount: count });
    }
    
    // Get full notifications
    const result = await getNotifications(user.athlete.id, {
      limit,
      cursor,
      unreadOnly,
    });
    
    // Also include unread count
    const unreadCount = await getUnreadCount(user.athlete.id);
    
    return NextResponse.json({
      ...result,
      unreadCount,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Mark all as read
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!user?.athlete) {
      return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (action === "markAllRead") {
      await markAllAsRead(user.athlete.id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
