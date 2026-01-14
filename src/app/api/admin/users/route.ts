import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";

// GET /api/admin/users - List all users
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isSystemAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        athlete: {
          include: {
            disciplines: {
              include: {
                discipline: {
                  select: { id: true, name: true, icon: true },
                },
              },
            },
          },
        },
        managedAthletes: {
          include: {
            disciplines: {
              include: {
                discipline: {
                  select: { id: true, name: true, icon: true },
                },
              },
            },
          },
        },
        gymMemberships: {
          include: {
            gym: {
              select: { id: true, name: true },
            },
          },
        },
        ownedGyms: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
