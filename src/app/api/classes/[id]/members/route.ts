import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role } from "../../../../../../prisma/generated/prisma/client";
import { createNotification } from "@/lib/notifications";

// Helper to check if user is a coach of the class
async function isClassCoach(classId: string, userId: string): Promise<boolean> {
  const coach = await db.classCoach.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  return !!coach;
}

// GET /api/classes/[id]/members - List class members (coach only)
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

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only coaches can see full member list (COPPA)
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can view class roster" },
        { status: 403 }
      );
    }

    const members = await db.classMember.findMany({
      where: { classId: id, status: "ACTIVE" },
      include: {
        athlete: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        addedBy: {
          select: {
            id: true,
            athlete: { select: { displayName: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    // Get class info
    const classInfo = await db.class.findUnique({
      where: { id },
      select: { name: true },
    });

    return NextResponse.json({
      className: classInfo?.name || "Class",
      members: members.map((m) => ({
        id: m.id,
        athleteId: m.athlete.id,
        athlete: {
          id: m.athlete.id,
          displayName: m.athlete.displayName,
          username: m.athlete.username,
          avatarUrl: m.athlete.avatarUrl,
          dateOfBirth: m.athlete.dateOfBirth,
          gender: m.athlete.gender,
        },
        joinedAt: m.joinedAt,
        status: m.status,
        addedBy: m.addedBy.athlete?.displayName || "Coach",
      })),
    });
  } catch (error) {
    console.error("Class members GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST /api/classes/[id]/members - Add member to class (coach adds directly)
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

    // Only coaches can add members directly
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can add members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { athleteId } = body;

    if (!athleteId) {
      return NextResponse.json(
        { error: "Athlete ID is required" },
        { status: 400 }
      );
    }

    // Verify athlete exists
    const athlete = await db.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true, displayName: true },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await db.classMember.findUnique({
      where: { classId_athleteId: { classId: id, athleteId } },
    });

    if (existingMember) {
      if (existingMember.status === "ACTIVE") {
        return NextResponse.json(
          { error: "Athlete is already a member of this class" },
          { status: 400 }
        );
      }

      // Reactivate if previously left/removed
      await db.classMember.update({
        where: { id: existingMember.id },
        data: { status: "ACTIVE", joinedAt: new Date(), leftAt: null },
      });
    } else {
      await db.classMember.create({
        data: {
          classId: id,
          athleteId,
          addedById: user.id,
          status: "ACTIVE",
        },
      });
    }

    // Get class name for notification
    const classData = await db.class.findUnique({
      where: { id },
      select: { name: true },
    });

    // Notify athlete
    await createNotification({
      athleteId,
      type: "CLASS_ADDED",
      title: "Added to class!",
      body: `You've been added to "${classData?.name}"`,
      linkUrl: `/classes/${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class members POST error:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
