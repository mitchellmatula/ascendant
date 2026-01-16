import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/coaches
 * 
 * Fetches all coaches/managers/owners from gyms the current user is a member of.
 * Used for selecting a supervisor when submitting a manual entry.
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all gym IDs where the user is a member
    const userMemberships = await db.gymMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        gymId: true,
      },
    });

    if (userMemberships.length === 0) {
      return NextResponse.json({ coaches: [] });
    }

    const gymIds = userMemberships.map((m) => m.gymId);

    // Get all coaches, managers, and owners from those gyms (excluding current user)
    const gymStaff = await db.gymMember.findMany({
      where: {
        gymId: { in: gymIds },
        isActive: true,
        role: { in: ["COACH", "MANAGER", "OWNER"] },
        userId: { not: user.id }, // Exclude self
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            athlete: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Group by user and aggregate their gyms/roles
    const coachMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        gyms: { id: string; name: string; role: string }[];
      }
    >();

    for (const staff of gymStaff) {
      const existing = coachMap.get(staff.userId);
      const gymInfo = {
        id: staff.gym.id,
        name: staff.gym.name,
        role: staff.role,
      };

      // Get display name from athlete profile, fall back to email
      const displayName = staff.user.athlete?.displayName || staff.user.email;

      if (existing) {
        existing.gyms.push(gymInfo);
      } else {
        coachMap.set(staff.userId, {
          id: staff.user.id,
          name: displayName,
          email: staff.user.email,
          gyms: [gymInfo],
        });
      }
    }

    const coaches = Array.from(coachMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ coaches });
  } catch (error) {
    console.error("Error fetching coaches:", error);
    return NextResponse.json(
      { error: "Failed to fetch coaches" },
      { status: 500 }
    );
  }
}
