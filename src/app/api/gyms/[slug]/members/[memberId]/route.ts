import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateMemberSchema = z.object({
  role: z.enum(["MEMBER", "COACH", "MANAGER"]),
});

// PATCH /api/gyms/[slug]/members/[memberId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, memberId } = await params;

    // Find the gym
    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if current user has permission (owner or manager)
    const userMembership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: gym.id,
          userId: user.id,
        },
      },
    });

    const isOwner = gym.ownerId === user.id;
    const isManager = userMembership?.role === "MANAGER";
    const canManage = isOwner || isManager;

    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to manage members" },
        { status: 403 }
      );
    }

    // Find the target member
    const targetMember = await db.gymMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.gymId !== gym.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't modify the owner
    if (targetMember.userId === gym.ownerId) {
      return NextResponse.json(
        { error: "Cannot modify gym owner" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid role", details: result.error.issues },
        { status: 400 }
      );
    }

    const { role } = result.data;

    // Managers can't promote others to Manager
    if (!isOwner && role === "MANAGER") {
      return NextResponse.json(
        { error: "Only owners can assign manager role" },
        { status: 403 }
      );
    }

    // Update the member
    const updated = await db.gymMember.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE /api/gyms/[slug]/members/[memberId] - Remove member from gym
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, memberId } = await params;

    // Find the gym
    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if current user has permission (owner or manager)
    const userMembership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: gym.id,
          userId: user.id,
        },
      },
    });

    const isOwner = gym.ownerId === user.id;
    const isManager = userMembership?.role === "MANAGER";
    const canManage = isOwner || isManager;

    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to remove members" },
        { status: 403 }
      );
    }

    // Find the target member
    const targetMember = await db.gymMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.gymId !== gym.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove the owner
    if (targetMember.userId === gym.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove gym owner" },
        { status: 400 }
      );
    }

    // Managers can't remove other managers (only owner can)
    if (!isOwner && targetMember.role === "MANAGER") {
      return NextResponse.json(
        { error: "Only owners can remove managers" },
        { status: 403 }
      );
    }

    // Soft-delete by setting isActive to false
    const removed = await db.gymMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
