import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role } from "../../../../../prisma/generated/prisma/client";

// Helper to check if user is a coach of the class
async function isClassCoach(classId: string, userId: string): Promise<boolean> {
  const coach = await db.classCoach.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  return !!coach;
}

// Helper to check if user is system admin
async function isSystemAdmin(clerkId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === Role.SYSTEM_ADMIN;
}

// GET /api/classes/[id] - Get class details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await auth();

    const classData = await db.class.findUnique({
      where: { id },
      include: {
        gym: { select: { id: true, name: true, slug: true } },
        coaches: {
          include: {
            user: {
              include: {
                athlete: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
              },
            },
          },
        },
        _count: {
          select: {
            members: { where: { status: "ACTIVE" } },
            benchmarks: { where: { isActive: true } },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if viewer is a coach (for showing additional info)
    let isCoach = false;
    let isMember = false;
    let currentUserId: string | null = null;

    if (clerkId) {
      const user = await db.user.findUnique({
        where: { clerkId },
        select: { id: true, role: true },
      });

      if (user) {
        currentUserId = user.id;
        isCoach = classData.coaches.some((c) => c.userId === user.id) || user.role === Role.SYSTEM_ADMIN;

        // Check if user's athlete is a member
        const athlete = await db.athlete.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });

        if (athlete) {
          const membership = await db.classMember.findUnique({
            where: {
              classId_athleteId: { classId: id, athleteId: athlete.id },
            },
          });
          isMember = membership?.status === "ACTIVE";
        }
      }
    }

    // Base response
    const response: any = {
      id: classData.id,
      name: classData.name,
      description: classData.description,
      schedule: classData.schedule,
      isActive: classData.isActive,
      isPublic: classData.isPublic,
      requiresApproval: classData.requiresApproval,
      gym: classData.gym,
      coaches: classData.coaches.map((c) => ({
        userId: c.userId,
        role: c.role,
        isHeadCoach: c.isHeadCoach,
        displayName: c.user.athlete?.displayName || "Coach",
        avatarUrl: c.user.athlete?.avatarUrl,
        username: c.user.athlete?.username,
      })),
      memberCount: classData._count.members,
      benchmarkCount: classData._count.benchmarks,
      isCoach,
      isMember,
      currentUserId,
    };

    // If coach, include full members and benchmarks for grading
    if (isCoach) {
      const [members, benchmarks] = await Promise.all([
        db.classMember.findMany({
          where: { classId: id, status: "ACTIVE" },
          include: {
            athlete: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { athlete: { displayName: "asc" } },
        }),
        db.classBenchmark.findMany({
          where: { classId: id, isActive: true },
          include: {
            challenge: {
              select: {
                id: true,
                name: true,
                gradingType: true,
                timeFormat: true,
                primaryDomain: { select: { name: true, icon: true, color: true } },
              },
            },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
      ]);

      response.members = members.map((m) => ({
        id: m.id,
        athleteId: m.athleteId,
        athlete: m.athlete,
      }));

      response.benchmarks = benchmarks.map((b) => ({
        id: b.id,
        challengeId: b.challengeId,
        challenge: b.challenge,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Class GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch class" },
      { status: 500 }
    );
  }
}

// PATCH /api/classes/[id] - Update class
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check coach or admin
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can update this class" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, schedule, isActive, isPublic, requiresApproval } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json(
          { error: "Class name must be at least 2 characters" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (schedule !== undefined) {
      updateData.schedule = schedule?.trim() || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    if (requiresApproval !== undefined) {
      updateData.requiresApproval = Boolean(requiresApproval);
    }

    const updated = await db.class.update({
      where: { id },
      data: updateData,
      include: {
        gym: { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json({
      class: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        schedule: updated.schedule,
        isActive: updated.isActive,
        isPublic: updated.isPublic,
        requiresApproval: updated.requiresApproval,
        gym: updated.gym,
      },
    });
  } catch (error) {
    console.error("Class PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    );
  }
}

// DELETE /api/classes/[id] - Archive/deactivate class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check coach or admin
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can archive this class" },
        { status: 403 }
      );
    }

    // Soft delete - just deactivate
    await db.class.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to archive class" },
      { status: 500 }
    );
  }
}
