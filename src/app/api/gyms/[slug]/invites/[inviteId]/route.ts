import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/gyms/[slug]/invites/[inviteId] - Revoke an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; inviteId: string }> }
) {
  try {
    const { slug, inviteId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if user is owner or manager
    const isOwner = gym.ownerId === user.id;
    const membership = await db.gymMember.findUnique({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
    });
    const isManager = membership?.role === "MANAGER";

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if invite exists and belongs to this gym
    const invite = await db.gymInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.gymId !== gym.id) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Deactivate the invite (soft delete)
    await db.gymInvite.update({
      where: { id: inviteId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking invite:", error);
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}

// PATCH /api/gyms/[slug]/invites/[inviteId] - Reactivate or update an invite
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; inviteId: string }> }
) {
  try {
    const { slug, inviteId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if user is owner or manager
    const isOwner = gym.ownerId === user.id;
    const membership = await db.gymMember.findUnique({
      where: { gymId_userId: { gymId: gym.id, userId: user.id } },
    });
    const isManager = membership?.role === "MANAGER";

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if invite exists and belongs to this gym
    const invite = await db.gymInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.gymId !== gym.id) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const body = await request.json();
    const { isActive } = body;

    // If reactivating, extend the expiration
    const updates: { isActive?: boolean; expiresAt?: Date } = {};

    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
      
      // If reactivating an expired invite, extend expiration by 7 days
      if (isActive && invite.expiresAt < new Date()) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        updates.expiresAt = newExpiry;
      }
    }

    const updatedInvite = await db.gymInvite.update({
      where: { id: inviteId },
      data: updates,
    });

    return NextResponse.json({ invite: updatedInvite });
  } catch (error) {
    console.error("Error updating invite:", error);
    return NextResponse.json(
      { error: "Failed to update invite" },
      { status: 500 }
    );
  }
}
