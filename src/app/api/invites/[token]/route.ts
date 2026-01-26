import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/invites/[token] - Get invite details (public, for preview)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await db.gymInvite.findUnique({
      where: { token },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if invite is valid
    const now = new Date();
    const isExpired = invite.expiresAt < now;
    const isMaxedOut = invite.maxUses !== null && invite.useCount >= invite.maxUses;
    const isValid = invite.isActive && !isExpired && !isMaxedOut;

    return NextResponse.json({
      invite: {
        id: invite.id,
        role: invite.role,
        gym: invite.gym,
        expiresAt: invite.expiresAt,
        isValid,
        isExpired,
        isMaxedOut,
        isActive: invite.isActive,
      },
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite" },
      { status: 500 }
    );
  }
}

// POST /api/invites/[token] - Redeem an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invite = await db.gymInvite.findUnique({
      where: { token },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if invite is valid
    const now = new Date();
    if (!invite.isActive) {
      return NextResponse.json({ error: "This invite has been revoked" }, { status: 400 });
    }
    if (invite.expiresAt < now) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
      return NextResponse.json({ error: "This invite has reached its usage limit" }, { status: 400 });
    }

    // Check if user already used this invite
    const existingUsage = await db.gymInviteUsage.findUnique({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: user.id,
        },
      },
    });

    if (existingUsage) {
      return NextResponse.json({ error: "You have already used this invite" }, { status: 400 });
    }

    // Check if user is already a member of this gym
    const existingMembership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: invite.gymId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      // If inactive, reactivate with the invited role
      if (!existingMembership.isActive) {
        await db.$transaction([
          db.gymMember.update({
            where: { id: existingMembership.id },
            data: {
              isActive: true,
              role: invite.role,
            },
          }),
          db.gymInviteUsage.create({
            data: {
              inviteId: invite.id,
              userId: user.id,
            },
          }),
          db.gymInvite.update({
            where: { id: invite.id },
            data: {
              useCount: { increment: 1 },
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          message: "Welcome back! Your membership has been reactivated.",
          gym: invite.gym,
          role: invite.role,
        });
      }

      // Already an active member - check if role is higher
      const roleHierarchy = { MEMBER: 1, COACH: 2, MANAGER: 3, OWNER: 4 };
      if (roleHierarchy[invite.role] > roleHierarchy[existingMembership.role]) {
        // Upgrade their role
        await db.$transaction([
          db.gymMember.update({
            where: { id: existingMembership.id },
            data: { role: invite.role },
          }),
          db.gymInviteUsage.create({
            data: {
              inviteId: invite.id,
              userId: user.id,
            },
          }),
          db.gymInvite.update({
            where: { id: invite.id },
            data: {
              useCount: { increment: 1 },
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          message: `Your role has been upgraded to ${invite.role.toLowerCase()}.`,
          gym: invite.gym,
          role: invite.role,
          upgraded: true,
        });
      }

      return NextResponse.json({
        error: "You are already a member of this gym",
        gym: invite.gym,
      }, { status: 400 });
    }

    // Create new membership
    await db.$transaction([
      db.gymMember.create({
        data: {
          gymId: invite.gymId,
          userId: user.id,
          role: invite.role,
        },
      }),
      db.gymInviteUsage.create({
        data: {
          inviteId: invite.id,
          userId: user.id,
        },
      }),
      db.gymInvite.update({
        where: { id: invite.id },
        data: {
          useCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Welcome! You are now a ${invite.role.toLowerCase()} at ${invite.gym.name}.`,
      gym: invite.gym,
      role: invite.role,
    });
  } catch (error) {
    console.error("Error redeeming invite:", error);
    return NextResponse.json(
      { error: "Failed to redeem invite" },
      { status: 500 }
    );
  }
}
