import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user with their athlete and managed athletes
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

    // Collect all athlete IDs this user has access to
    const athleteIds: string[] = [];
    if (user.athlete) {
      athleteIds.push(user.athlete.id);
    }
    athleteIds.push(...user.managedAthletes.map(a => a.id));

    if (athleteIds.length === 0) {
      return NextResponse.json({ error: "No athlete profile found" }, { status: 404 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const countOnly = searchParams.get("countOnly") === "true";
    
    // If only count is needed (for badge)
    if (countOnly) {
      const count = await db.notification.count({
        where: {
          athleteId: { in: athleteIds },
          isRead: false,
        },
      });
      return NextResponse.json({ unreadCount: count });
    }
    
    // Get full notifications for all athlete IDs
    const notifications = await db.notification.findMany({
      where: {
        athleteId: { in: athleteIds },
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        athlete: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notifications.length > limit;
    const rawItems = hasMore ? notifications.slice(0, -1) : notifications;

    // Transform to match frontend expectations
    // For parent accounts, prefix with child's name
    const isParent = user.managedAthletes.length > 0;
    const items = rawItems.map((n) => ({
      id: n.id,
      type: n.type,
      title: isParent && n.athlete ? `${n.athlete.displayName}: ${n.title}` : n.title,
      message: n.body ?? "",
      url: n.linkUrl,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      actorId: n.actorId,
      actorUsername: n.actorUsername,
      actorAvatar: n.actorAvatar,
    }));
    
    // Also include unread count for all athletes
    const unreadCount = await db.notification.count({
      where: {
        athleteId: { in: athleteIds },
        isRead: false,
      },
    });
    
    return NextResponse.json({
      items,
      nextCursor: hasMore ? rawItems[rawItems.length - 1]?.id : undefined,
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
      include: { 
        athlete: { select: { id: true } },
        managedAthletes: { select: { id: true } },
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Collect all athlete IDs
    const athleteIds: string[] = [];
    if (user.athlete) {
      athleteIds.push(user.athlete.id);
    }
    athleteIds.push(...user.managedAthletes.map(a => a.id));

    if (athleteIds.length === 0) {
      return NextResponse.json({ error: "No athlete profile found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (action === "markAllRead") {
      // Mark all notifications for all managed athletes as read
      await db.notification.updateMany({
        where: {
          athleteId: { in: athleteIds },
          isRead: false,
        },
        data: { isRead: true },
      });
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
