import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

// Schema for creating an invite
const createInviteSchema = z.object({
  role: z.enum(["COACH", "MANAGER", "MEMBER"]).default("COACH"),
  expiresInDays: z.number().min(1).max(30).default(7),
  maxUses: z.number().min(1).max(100).nullable().optional(),
});

// GET /api/gyms/[slug]/invites - List active invites
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    const invites = await db.gymInvite.findMany({
      where: { gymId: gym.id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            athlete: { select: { displayName: true } },
          },
        },
        usages: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                athlete: { select: { displayName: true } },
              },
            },
          },
          orderBy: { usedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

// POST /api/gyms/[slug]/invites - Create a new invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    // Managers can only create MEMBER or COACH invites, not MANAGER
    const body = await request.json();
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role, expiresInDays, maxUses } = parsed.data;

    // Only owner can create MANAGER invites
    if (role === "MANAGER" && !isOwner) {
      return NextResponse.json(
        { error: "Only gym owner can create manager invites" },
        { status: 403 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await db.gymInvite.create({
      data: {
        gymId: gym.id,
        role,
        expiresAt,
        maxUses: maxUses ?? null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
