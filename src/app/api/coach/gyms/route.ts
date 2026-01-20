import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/coach/gyms - Get gyms where user can create classes (coach, manager, or owner)
export async function GET() {
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

  // Get gyms where user is owner, manager, or coach
  const gymMemberships = await db.gymMember.findMany({
    where: {
      userId: user.id,
      isActive: true,
      role: { in: ["OWNER", "MANAGER", "COACH"] },
    },
    include: {
      gym: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
  });

  // Also include gyms the user owns directly (in case they're not in gymMember table)
  const ownedGyms = await db.gym.findMany({
    where: {
      ownerId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  });

  // Combine and deduplicate
  const gymMap = new Map<string, { id: string; name: string; slug: string; logoUrl: string | null }>();
  
  for (const membership of gymMemberships) {
    gymMap.set(membership.gym.id, membership.gym);
  }
  
  for (const gym of ownedGyms) {
    gymMap.set(gym.id, gym);
  }

  const gyms = Array.from(gymMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ gyms });
}
