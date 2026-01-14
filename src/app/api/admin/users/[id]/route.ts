import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validators/admin";

// GET /api/admin/users/[id] - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSystemAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const targetUser = await db.user.findUnique({
      where: { id },
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
              select: { id: true, name: true, slug: true },
            },
          },
        },
        ownedGyms: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSystemAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      const errorMessage = firstError
        ? `${firstError[0]}: ${(firstError[1] as string[])[0]}`
        : "Validation failed";

      return NextResponse.json(
        { error: errorMessage, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role, accountType, athlete, managedAthletes } = parsed.data;

    // Prevent user from demoting themselves
    if (id === currentUser.id && role && role !== currentUser.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      include: {
        athlete: true,
        managedAthletes: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user base fields
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(accountType && { accountType }),
      },
    });

    // Update athlete profile if provided
    if (athlete && existingUser.athlete) {
      await db.athlete.update({
        where: { id: existingUser.athlete.id },
        data: {
          displayName: athlete.displayName,
          dateOfBirth: athlete.dateOfBirth ? new Date(athlete.dateOfBirth) : undefined,
          gender: athlete.gender,
          avatarUrl: athlete.avatarUrl,
          // Update disciplines
          ...(athlete.disciplineIds !== undefined && {
            disciplines: {
              deleteMany: {},
              create: athlete.disciplineIds.map((disciplineId: string) => ({
                disciplineId,
              })),
            },
          }),
        },
      });
    } else if (athlete && !existingUser.athlete) {
      // Create athlete profile if doesn't exist
      await db.athlete.create({
        data: {
          userId: id,
          displayName: athlete.displayName || existingUser.email,
          dateOfBirth: athlete.dateOfBirth ? new Date(athlete.dateOfBirth) : new Date(),
          gender: athlete.gender || "prefer-not-to-say",
          avatarUrl: athlete.avatarUrl,
          ...(athlete.disciplineIds?.length && {
            disciplines: {
              create: athlete.disciplineIds.map((disciplineId: string) => ({
                disciplineId,
              })),
            },
          }),
        },
      });
    }

    // Update managed athletes if provided (for parent accounts)
    if (managedAthletes && Array.isArray(managedAthletes)) {
      // Get current managed athlete IDs
      const currentManagedIds = existingUser.managedAthletes.map((a) => a.id);
      const submittedManagedIds = managedAthletes
        .filter((a) => a.id)
        .map((a) => a.id as string);

      // Find athletes to remove (no longer managed by this parent)
      const athletesToRemove = currentManagedIds.filter(
        (id) => !submittedManagedIds.includes(id)
      );

      // Remove parent management from removed athletes
      for (const athleteId of athletesToRemove) {
        await db.athlete.update({
          where: { id: athleteId },
          data: { parentId: null },
        });
      }

      // Update existing and create new managed athletes
      for (const managedAthlete of managedAthletes) {
        if (managedAthlete.id) {
          // Update existing managed athlete
          await db.athlete.update({
            where: { id: managedAthlete.id },
            data: {
              displayName: managedAthlete.displayName,
              dateOfBirth: managedAthlete.dateOfBirth
                ? new Date(managedAthlete.dateOfBirth)
                : undefined,
              gender: managedAthlete.gender,
              avatarUrl: managedAthlete.avatarUrl,
              ...(managedAthlete.disciplineIds !== undefined && {
                disciplines: {
                  deleteMany: {},
                  create: managedAthlete.disciplineIds.map((disciplineId: string) => ({
                    disciplineId,
                  })),
                },
              }),
            },
          });
        } else if (managedAthlete.displayName && managedAthlete.dateOfBirth && managedAthlete.gender) {
          // Create new managed athlete
          await db.athlete.create({
            data: {
              parentId: id,
              displayName: managedAthlete.displayName,
              dateOfBirth: new Date(managedAthlete.dateOfBirth),
              gender: managedAthlete.gender,
              avatarUrl: managedAthlete.avatarUrl,
              isMinor: true, // Managed athletes are minors
              ...(managedAthlete.disciplineIds?.length && {
                disciplines: {
                  create: managedAthlete.disciplineIds.map((disciplineId: string) => ({
                    disciplineId,
                  })),
                },
              }),
            },
          });
        }
      }
    }

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete a user (soft delete athletes, hard delete user)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSystemAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      include: {
        athlete: true,
        managedAthletes: true,
        ownedGyms: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user owns any gyms
    if (existingUser.ownedGyms.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete user who owns ${existingUser.ownedGyms.length} gym(s). Transfer ownership first.`,
        },
        { status: 400 }
      );
    }

    // Delete the user (cascade will handle related records)
    await db.user.delete({
      where: { id },
    });

    revalidatePath("/admin/users");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
