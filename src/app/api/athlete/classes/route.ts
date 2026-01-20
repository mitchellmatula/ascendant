import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getActiveAthleteId } from "@/lib/active-athlete";

// GET /api/athlete/classes - Get classes where current athlete is enrolled
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, athlete: { select: { id: true } } },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get active athlete (either user's own profile or from cookie for parent)
    const activeAthleteId = await getActiveAthleteId();
    const athleteId = activeAthleteId || user.athlete?.id;
    
    if (!athleteId) {
      return NextResponse.json({ error: "No athlete profile" }, { status: 404 });
    }

    const memberships = await db.classMember.findMany({
      where: { athleteId, status: "ACTIVE" },
      include: {
        class: {
          include: {
            gym: { select: { id: true, name: true, slug: true } },
            coaches: {
              include: {
                user: {
                  select: {
                    id: true,
                    athlete: { select: { displayName: true, avatarUrl: true } },
                  },
                },
              },
            },
            ...(includeStats
              ? {
                  _count: {
                    select: {
                      members: { where: { status: "ACTIVE" } },
                      benchmarks: { where: { isActive: true } },
                    },
                  },
                }
              : {}),
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    // Also get pending join requests
    const pendingRequests = await db.classJoinRequest.findMany({
      where: { athleteId, status: "PENDING" },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            gym: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return NextResponse.json({
      classes: memberships
        .filter((m) => m.class.isActive)
        .map((m) => ({
          id: m.class.id,
          name: m.class.name,
          description: m.class.description,
          schedule: m.class.schedule,
          joinedAt: m.joinedAt,
          gym: m.class.gym,
          coaches: m.class.coaches.map((c) => ({
            userId: c.user.id,
            role: c.role,
            displayName: c.user.athlete?.displayName || "Unknown",
            avatarUrl: c.user.athlete?.avatarUrl,
          })),
          ...(includeStats
            ? {
                memberCount: (m.class as typeof m.class & { _count: { members: number; benchmarks: number } })._count.members,
                benchmarkCount: (m.class as typeof m.class & { _count: { members: number; benchmarks: number } })._count.benchmarks,
              }
            : {}),
        })),
      pendingRequests: pendingRequests.map((r) => ({
        requestId: r.id,
        classId: r.class.id,
        className: r.class.name,
        classDescription: r.class.description,
        gym: r.class.gym,
        requestedAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Athlete classes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch athlete classes" },
      { status: 500 }
    );
  }
}
