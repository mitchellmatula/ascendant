import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { GymRole, Role } from "../../../../prisma/generated/prisma/client";

// GET /api/classes - List classes with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gymId = searchParams.get("gymId");
    const coachId = searchParams.get("coachId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (gymId) {
      where.gymId = gymId;
    }

    if (coachId) {
      where.coaches = {
        some: { userId: coachId },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [classes, total] = await Promise.all([
      db.class.findMany({
        where,
        include: {
          gym: {
            select: { name: true, slug: true },
          },
          coaches: {
            include: {
              user: {
                include: {
                  athlete: { select: { displayName: true, avatarUrl: true } },
                },
              },
            },
          },
          _count: {
            select: { members: { where: { status: "ACTIVE" } } },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      db.class.count({ where }),
    ]);

    return NextResponse.json({
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        schedule: c.schedule,
        gym: c.gym,
        coaches: c.coaches.map((coach) => ({
          userId: coach.userId,
          role: coach.role,
          displayName: coach.user.athlete?.displayName || "Coach",
          avatarUrl: coach.user.athlete?.avatarUrl,
        })),
        memberCount: c._count.members,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Classes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

// POST /api/classes - Create a new class
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        gymMemberships: {
          where: { isActive: true },
          select: { gymId: true, role: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, schedule, gymId, isPublic, requiresApproval, coachUserIds } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Class name is required (at least 2 characters)" },
        { status: 400 }
      );
    }

    // Check permissions
    // System admin can create any class
    // Gym owner/manager/coach can create for their gym
    if (user.role !== Role.SYSTEM_ADMIN) {
      if (!gymId) {
        return NextResponse.json(
          { error: "Gym ID is required for non-admin users" },
          { status: 400 }
        );
      }

      const membership = user.gymMemberships.find((m) => m.gymId === gymId);
      const allowedRoles: GymRole[] = ["OWNER", "MANAGER", "COACH"];

      if (!membership || !allowedRoles.includes(membership.role)) {
        return NextResponse.json(
          { error: "You must be a coach, manager, or owner of the gym to create a class" },
          { status: 403 }
        );
      }
    }

    // Determine coaches to assign
    // If coachUserIds provided, use those; otherwise, assign the creator
    const coachesToCreate = coachUserIds && Array.isArray(coachUserIds) && coachUserIds.length > 0
      ? coachUserIds.map((coachUserId: string, index: number) => ({
          userId: coachUserId,
          role: "COACH" as const,
          isHeadCoach: index === 0, // First coach is head coach
        }))
      : [{
          userId: user.id,
          role: "COACH" as const,
          isHeadCoach: true,
        }];

    // Create the class with assigned coaches
    const newClass = await db.class.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        schedule: schedule?.trim() || null,
        gymId: gymId || null,
        isPublic: isPublic ?? true,
        requiresApproval: requiresApproval ?? true,
        coaches: {
          create: coachesToCreate,
        },
      },
      include: {
        gym: { select: { name: true, slug: true } },
        coaches: {
          include: {
            user: {
              include: {
                athlete: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      class: {
        id: newClass.id,
        name: newClass.name,
        description: newClass.description,
        schedule: newClass.schedule,
        gym: newClass.gym,
        coaches: newClass.coaches.map((c) => ({
          userId: c.userId,
          role: c.role,
          displayName: c.user.athlete?.displayName || "Coach",
          avatarUrl: c.user.athlete?.avatarUrl,
        })),
      },
    });
  } catch (error) {
    console.error("Classes POST error:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}
