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

// GET /api/classes/[id]/requests - List pending join requests (coach only)
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

    // Only coaches can see join requests
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can view join requests" },
        { status: 403 }
      );
    }

    const requests = await db.classJoinRequest.findMany({
      where: { classId: id, status: "PENDING" },
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
        requestedBy: {
          select: {
            id: true,
            athlete: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        athleteId: r.athlete.id,
        displayName: r.athlete.displayName,
        username: r.athlete.username,
        avatarUrl: r.athlete.avatarUrl,
        dateOfBirth: r.athlete.dateOfBirth,
        gender: r.athlete.gender,
        note: r.note,
        requestedAt: r.createdAt,
        requestedBy: r.requestedBy.athlete?.displayName || "Unknown",
      })),
    });
  } catch (error) {
    console.error("Class requests GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST /api/classes/[id]/requests - Approve or deny a join request
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

    // Only coaches can approve/deny requests
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can manage join requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: "Request ID and action (approve/deny) required" },
        { status: 400 }
      );
    }

    // Get the request
    const joinRequest = await db.classJoinRequest.findUnique({
      where: { id: requestId },
      include: { 
        athlete: { select: { id: true, displayName: true } },
        class: { select: { name: true } },
      },
    });

    if (!joinRequest || joinRequest.classId !== id) {
      return NextResponse.json(
        { error: "Join request not found" },
        { status: 404 }
      );
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Update request status
      await db.classJoinRequest.update({
        where: { id: requestId },
        data: { 
          status: "APPROVED", 
          reviewedAt: new Date(),
          reviewedById: user.id,
        },
      });

      // Create membership
      const membership = await db.classMember.upsert({
        where: { 
          classId_athleteId: { classId: id, athleteId: joinRequest.athleteId } 
        },
        update: { status: "ACTIVE", joinedAt: new Date(), leftAt: null },
        create: {
          classId: id,
          athleteId: joinRequest.athleteId,
          addedById: user.id,
          status: "ACTIVE",
        },
        include: {
          athlete: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Notify athlete
      await createNotification({
        athleteId: joinRequest.athleteId,
        type: "CLASS_REQUEST_APPROVED",
        title: "Class request approved!",
        body: `You've been added to "${joinRequest.class.name}"`,
        linkUrl: `/classes/${id}`,
      });

      return NextResponse.json({ 
        success: true,
        action,
        member: {
          id: membership.id,
          athleteId: membership.athleteId,
          athlete: membership.athlete,
          joinedAt: membership.joinedAt?.toISOString() ?? new Date().toISOString(),
          status: membership.status,
        },
      });
    } else {
      // Deny request
      await db.classJoinRequest.update({
        where: { id: requestId },
        data: { 
          status: "DENIED", 
          reviewedAt: new Date(),
          reviewedById: user.id,
        },
      });

      // Notify athlete
      await createNotification({
        athleteId: joinRequest.athleteId,
        type: "CLASS_REQUEST_DENIED",
        title: "Class request denied",
        body: `Your request to join "${joinRequest.class.name}" was not approved`,
        linkUrl: `/classes`,
      });
    }

    return NextResponse.json({ 
      success: true,
      action,
    });
  } catch (error) {
    console.error("Class requests POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
