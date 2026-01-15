import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/gyms/[slug]/membership - Join a gym
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    
    // Safely parse body - may be empty
    let isPublicMember = false;
    try {
      const body = await request.json();
      isPublicMember = body?.isPublicMember ?? false;
    } catch {
      // No body provided, use defaults
    }

    // Find the gym
    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMembership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: gym.id,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      // Reactivate if previously left
      if (!existingMembership.isActive) {
        const updated = await db.gymMember.update({
          where: { id: existingMembership.id },
          data: { isActive: true, isPublicMember },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Create membership
    const membership = await db.gymMember.create({
      data: {
        gymId: gym.id,
        userId: user.id,
        role: "MEMBER",
        isPublicMember,
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Error joining gym:", error);
    return NextResponse.json(
      { error: "Failed to join gym" },
      { status: 500 }
    );
  }
}

// DELETE /api/gyms/[slug]/membership - Leave a gym
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Find the gym
    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Find membership
    const membership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: gym.id,
          userId: user.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return NextResponse.json({ error: "Not a member" }, { status: 400 });
    }

    // Owners cannot leave their own gym
    if (membership.role === "OWNER") {
      return NextResponse.json(
        { error: "Owners cannot leave their gym. Transfer ownership first." },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive
    await db.gymMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving gym:", error);
    return NextResponse.json(
      { error: "Failed to leave gym" },
      { status: 500 }
    );
  }
}

// PATCH /api/gyms/[slug]/membership - Update membership settings (e.g., public visibility)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { isPublicMember } = body;

    // Find the gym
    const gym = await db.gym.findUnique({
      where: { slug, isActive: true },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Find membership
    const membership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: gym.id,
          userId: user.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return NextResponse.json({ error: "Not a member" }, { status: 400 });
    }

    // Update membership
    const updated = await db.gymMember.update({
      where: { id: membership.id },
      data: {
        ...(isPublicMember !== undefined && { isPublicMember }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating membership:", error);
    return NextResponse.json(
      { error: "Failed to update membership" },
      { status: 500 }
    );
  }
}
