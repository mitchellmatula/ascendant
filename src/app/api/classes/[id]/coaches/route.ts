import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ClassCoachRole, Role, GymRole } from "../../../../../../prisma/generated/prisma/client";

// Helper to check if user is a main coach of the class (COACH role has full access)
async function isMainCoach(classId: string, userId: string): Promise<boolean> {
  const coach = await db.classCoach.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  return coach?.role === ClassCoachRole.COACH;
}

// GET /api/classes/[id]/coaches - List class coaches
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const coaches = await db.classCoach.findMany({
      where: { classId: id },
      include: {
        user: {
          select: {
            id: true,
            athlete: {
              select: {
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      coaches: coaches.map((c) => ({
        id: c.id,
        userId: c.user.id,
        role: c.role,
        displayName: c.user.athlete?.displayName || "Unknown",
        username: c.user.athlete?.username,
        avatarUrl: c.user.athlete?.avatarUrl,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Class coaches GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coaches" },
      { status: 500 }
    );
  }
}

// POST /api/classes/[id]/coaches - Add a coach to the class
export async function POST(
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

    // Only main coaches can add other coaches
    const isCoach = await isMainCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can add other coaches" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId: newCoachUserId, role = ClassCoachRole.ASSISTANT } = body;

    if (!newCoachUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Cannot add yourself
    if (newCoachUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot add yourself as a coach" },
        { status: 400 }
      );
    }

    // Verify user exists
    const coachUser = await db.user.findUnique({
      where: { id: newCoachUserId },
      select: { id: true },
    });

    if (!coachUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already a coach
    const existing = await db.classCoach.findUnique({
      where: { classId_userId: { classId: id, userId: newCoachUserId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User is already a coach of this class" },
        { status: 400 }
      );
    }

    // Get the class to check if it has a gym
    const classData = await db.class.findUnique({
      where: { id },
      select: { gymId: true },
    });

    // If class has a gym, ensure the new coach is a gym member (add as COACH if not)
    if (classData?.gymId) {
      const gymMembership = await db.gymMember.findUnique({
        where: { gymId_userId: { gymId: classData.gymId, userId: newCoachUserId } },
      });

      if (!gymMembership) {
        // Auto-add as gym COACH
        await db.gymMember.create({
          data: {
            gymId: classData.gymId,
            userId: newCoachUserId,
            role: GymRole.COACH,
            isActive: true,
            isPublicMember: true,
          },
        });
      } else if (gymMembership.role === GymRole.MEMBER) {
        // Upgrade to COACH role if currently just a member
        await db.gymMember.update({
          where: { id: gymMembership.id },
          data: { role: GymRole.COACH },
        });
      }
    }

    // Create coach entry - new coaches are assistants by default
    const coach = await db.classCoach.create({
      data: {
        classId: id,
        userId: newCoachUserId,
        role: role === ClassCoachRole.COACH ? ClassCoachRole.ASSISTANT : role,
      },
    });

    return NextResponse.json({ success: true, coachId: coach.id });
  } catch (error) {
    console.error("Class coaches POST error:", error);
    return NextResponse.json(
      { error: "Failed to add coach" },
      { status: 500 }
    );
  }
}

// DELETE /api/classes/[id]/coaches - Remove a coach from the class
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

    const body = await request.json();
    const { coachId } = body;

    if (!coachId) {
      return NextResponse.json(
        { error: "Coach ID is required" },
        { status: 400 }
      );
    }

    // Get the coach entry
    const coach = await db.classCoach.findUnique({
      where: { id: coachId },
    });

    if (!coach || coach.classId !== id) {
      return NextResponse.json(
        { error: "Coach not found" },
        { status: 404 }
      );
    }

    // Main coaches (COACH role) cannot be removed (only archived)
    if (coach.role === ClassCoachRole.COACH) {
      return NextResponse.json(
        { error: "Cannot remove main coach. Archive the class instead." },
        { status: 400 }
      );
    }

    // Only main coaches can remove other coaches
    const isCoach = await isMainCoach(id, user.id);
    const isSelf = coach.userId === user.id;

    if (!isCoach && !isSelf && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only main coaches can remove other coaches" },
        { status: 403 }
      );
    }

    await db.classCoach.delete({
      where: { id: coachId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class coaches DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove coach" },
      { status: 500 }
    );
  }
}
