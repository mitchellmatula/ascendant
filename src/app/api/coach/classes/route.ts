import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/coach/classes - Get classes where current user is a coach
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
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const coachRoles = await db.classCoach.findMany({
      where: { userId: user.id },
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
                      joinRequests: { where: { status: "PENDING" } },
                    },
                  },
                }
              : {}),
          },
        },
      },
      orderBy: { class: { createdAt: "desc" } },
    });

    return NextResponse.json({
      classes: coachRoles
        .filter((cr) => cr.class.isActive)
        .map((cr) => ({
          id: cr.class.id,
          name: cr.class.name,
          description: cr.class.description,
          schedule: cr.class.schedule,
          myRole: cr.role,
          gym: cr.class.gym,
          coaches: cr.class.coaches.map((c) => ({
            userId: c.user.id,
            role: c.role,
            displayName: c.user.athlete?.displayName || "Unknown",
            avatarUrl: c.user.athlete?.avatarUrl,
          })),
          createdAt: cr.class.createdAt,
          ...(includeStats
            ? {
                memberCount: (cr.class as typeof cr.class & { _count: { members: number; benchmarks: number; joinRequests: number } })._count.members,
                benchmarkCount: (cr.class as typeof cr.class & { _count: { members: number; benchmarks: number; joinRequests: number } })._count.benchmarks,
                pendingRequests: (cr.class as typeof cr.class & { _count: { members: number; benchmarks: number; joinRequests: number } })._count.joinRequests,
              }
            : {}),
        })),
    });
  } catch (error) {
    console.error("Coach classes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coach classes" },
      { status: 500 }
    );
  }
}
