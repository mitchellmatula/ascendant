import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// POST /api/classes/[id]/join - Request to join a class (athlete/parent initiated)
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
      select: { 
        id: true, 
        athlete: { select: { id: true, displayName: true } },
        managedAthletes: { select: { id: true, displayName: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse request body
    let body: { athleteId?: string; message?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is okay
    }
    const { athleteId: requestedAthleteId, message } = body;

    // Determine which athlete to enroll
    let targetAthlete: { id: string; displayName: string } | null = null;

    if (requestedAthleteId) {
      // Verify the user has permission to act for this athlete
      if (user.athlete?.id === requestedAthleteId) {
        targetAthlete = user.athlete;
      } else {
        const managedAthlete = user.managedAthletes.find(a => a.id === requestedAthleteId);
        if (managedAthlete) {
          targetAthlete = managedAthlete;
        }
      }
      
      if (!targetAthlete) {
        return NextResponse.json(
          { error: "You don't have permission to enroll this athlete" },
          { status: 403 }
        );
      }
    } else {
      // No athleteId provided - use own athlete or first managed athlete
      if (user.athlete) {
        targetAthlete = user.athlete;
      } else if (user.managedAthletes.length === 1) {
        targetAthlete = user.managedAthletes[0];
      } else if (user.managedAthletes.length > 1) {
        return NextResponse.json(
          { error: "Please select which athlete to enroll", requiresSelection: true },
          { status: 400 }
        );
      }
    }

    if (!targetAthlete) {
      return NextResponse.json(
        { error: "You need an athlete profile to join classes" },
        { status: 400 }
      );
    }

    // Get the class and verify it exists
    const classData = await db.class.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        isActive: true,
        coaches: { select: { userId: true, role: true } },
      },
    });

    if (!classData || !classData.isActive) {
      return NextResponse.json(
        { error: "Class not found or inactive" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await db.classMember.findUnique({
      where: { 
        classId_athleteId: { classId: id, athleteId: targetAthlete.id } 
      },
    });

    if (existingMember?.status === "ACTIVE") {
      return NextResponse.json(
        { error: `${targetAthlete.displayName} is already a member of this class` },
        { status: 400 }
      );
    }

    // Check for pending request
    const existingRequest = await db.classJoinRequest.findFirst({
      where: {
        classId: id,
        athleteId: targetAthlete.id,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: `${targetAthlete.displayName} already has a pending request for this class` },
        { status: 400 }
      );
    }

    // Create join request (note field in schema)
    const joinRequest = await db.classJoinRequest.create({
      data: {
        classId: id,
        athleteId: targetAthlete.id,
        requestedById: user.id,
        note: message || null,
        status: "PENDING",
      },
    });

    // Notify all coaches (schema uses COACH role, not HEAD)
    const coaches = classData.coaches;
    for (const coach of coaches) {
      // Get the coach's athlete profile for notification
      const coachUser = await db.user.findUnique({
        where: { id: coach.userId },
        select: { athlete: { select: { id: true } } },
      });

      if (coachUser?.athlete) {
        await createNotification({
          athleteId: coachUser.athlete.id,
          type: "CLASS_JOIN_REQUEST",
          title: "Class join request",
          body: `${targetAthlete.displayName} wants to join "${classData.name}"`,
          linkUrl: `/coach/classes/${id}/requests`,
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      requestId: joinRequest.id,
      athleteName: targetAthlete.displayName,
      message: `${targetAthlete.displayName}'s join request has been submitted` 
    });
  } catch (error) {
    console.error("Class join POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit join request" },
      { status: 500 }
    );
  }
}

// GET /api/classes/[id]/join - Check if user can join this class
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
      select: { id: true, athlete: { select: { id: true } } },
    });

    if (!user || !user.athlete) {
      return NextResponse.json({ 
        canJoin: false, 
        reason: "No athlete profile" 
      });
    }

    // Check if already a member
    const membership = await db.classMember.findUnique({
      where: { 
        classId_athleteId: { classId: id, athleteId: user.athlete.id } 
      },
    });

    if (membership?.status === "ACTIVE") {
      return NextResponse.json({ 
        canJoin: false, 
        reason: "Already a member",
        isMember: true,
      });
    }

    // Check for pending request
    const pendingRequest = await db.classJoinRequest.findFirst({
      where: {
        classId: id,
        athleteId: user.athlete.id,
        status: "PENDING",
      },
    });

    if (pendingRequest) {
      return NextResponse.json({ 
        canJoin: false, 
        reason: "Request pending",
        hasPendingRequest: true,
      });
    }

    return NextResponse.json({ canJoin: true });
  } catch (error) {
    console.error("Class join GET error:", error);
    return NextResponse.json(
      { error: "Failed to check join status" },
      { status: 500 }
    );
  }
}
