import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role } from "../../../../../../../prisma/generated/prisma/client";

// Helper to check if user is a coach of the class
async function isClassCoach(classId: string, userId: string): Promise<boolean> {
  const coach = await db.classCoach.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  return !!coach;
}

// DELETE /api/classes/[id]/members/[memberId] - Remove member from class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, memberId } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true, athlete: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the membership
    const membership = await db.classMember.findUnique({
      where: { id: memberId },
      include: { athlete: true },
    });

    if (!membership || membership.classId !== id) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      );
    }

    // Coaches can remove anyone, athletes can remove themselves
    const isCoach = await isClassCoach(id, user.id);
    const isSelf = user.athlete?.id === membership.athleteId;

    if (!isCoach && !isSelf && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "You don't have permission to remove this member" },
        { status: 403 }
      );
    }

    // Soft remove - set status to LEFT
    await db.classMember.update({
      where: { id: memberId },
      data: { status: "LEFT", leftAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class member DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
