import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ gymId: string }>;
}

// GET /api/coach/gyms/[gymId]/staff - Get staff who can be assigned as coaches
export async function GET(request: Request, { params }: RouteParams) {
  const { gymId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify user has permission to view this gym's staff
  const userMembership = await db.gymMember.findUnique({
    where: {
      gymId_userId: {
        gymId,
        userId: user.id,
      },
    },
  });

  const gym = await db.gym.findUnique({
    where: { id: gymId },
    select: { ownerId: true },
  });

  const isOwner = gym?.ownerId === user.id;
  const canViewStaff = isOwner || ["OWNER", "MANAGER", "COACH"].includes(userMembership?.role || "");

  if (!canViewStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all staff members (owners, managers, coaches)
  const staffMembers = await db.gymMember.findMany({
    where: {
      gymId,
      isActive: true,
      role: { in: ["OWNER", "MANAGER", "COACH"] },
    },
    include: {
      user: {
        include: {
          athlete: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      },
    },
    orderBy: [
      { role: "asc" }, // OWNER first, then MANAGER, then COACH
      { joinedAt: "asc" },
    ],
  });

  const staff = staffMembers.map((member) => ({
    userId: member.userId,
    displayName: member.user.athlete?.displayName || member.user.email || "Unknown",
    avatarUrl: member.user.athlete?.avatarUrl || null,
    role: member.role,
  }));

  return NextResponse.json({ staff });
}
