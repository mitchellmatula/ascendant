import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/videos - Get user's video library
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId");
    const search = searchParams.get("search");

    // Get the athlete - either specified or user's own
    let targetAthleteId = athleteId;
    if (!targetAthleteId) {
      targetAthleteId = user.athlete?.id || null;
    }

    if (!targetAthleteId) {
      return NextResponse.json({ videos: [] });
    }

    // Verify user has access to this athlete
    const athlete = await db.athlete.findUnique({
      where: { id: targetAthleteId },
      select: { userId: true, parentId: true },
    });

    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }

    // Check access: user owns the athlete or is parent
    const hasAccess = athlete.userId === user.id || athlete.parentId === user.id;
    if (!hasAccess && user.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch videos
    const videos = await db.video.findMany({
      where: {
        athleteId: targetAthleteId,
        ...(search ? {
          title: {
            contains: search,
            mode: "insensitive",
          },
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
