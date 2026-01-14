import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateGymSchema } from "@/lib/validators/admin";

// GET /api/admin/gyms/[id] - Get single gym
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const gym = await db.gym.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true, color: true },
            },
          },
        },
        equipment: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
        _count: {
          select: { challenges: true },
        },
      },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    return NextResponse.json(gym);
  } catch (error) {
    console.error("Error fetching gym:", error);
    return NextResponse.json(
      { error: "Failed to fetch gym" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/gyms/[id] - Update gym
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateGymSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if gym exists
    const existing = await db.gym.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    const { 
      name, description, logoUrl, bannerUrl, website, googlePlaceId,
      address, city, state, country, zipCode, phone, email,
      isActive, disciplineIds, equipmentIds 
    } = parsed.data;

    // If name is changing, update the slug
    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists
      const slugExists = await db.gym.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A gym with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Handle discipline relationships if provided
    if (disciplineIds !== undefined) {
      await db.gymDiscipline.deleteMany({
        where: { gymId: id },
      });

      if (disciplineIds.length > 0) {
        await db.gymDiscipline.createMany({
          data: disciplineIds.map((disciplineId, index) => ({
            gymId: id,
            disciplineId,
            isPrimary: index === 0,
          })),
        });
      }
    }

    // Handle equipment relationships if provided
    if (equipmentIds !== undefined) {
      await db.gymEquipment.deleteMany({
        where: { gymId: id },
      });

      if (equipmentIds.length > 0) {
        await db.gymEquipment.createMany({
          data: equipmentIds.map((equipmentId) => ({
            gymId: id,
            equipmentId,
          })),
        });
      }
    }

    const gym = await db.gym.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        logoUrl,
        bannerUrl,
        website,
        googlePlaceId,
        address,
        city,
        state,
        country,
        zipCode,
        phone,
        email,
        isActive,
      },
      include: {
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
        equipment: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    revalidatePath("/admin/gyms");
    return NextResponse.json(gym);
  } catch (error) {
    console.error("Error updating gym:", error);
    return NextResponse.json(
      { error: "Failed to update gym" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/gyms/[id] - Delete gym
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if gym exists
    const existing = await db.gym.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challenges: true, members: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Warn if gym has related data
    if (existing._count.challenges > 0) {
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Gym has related data",
            details: {
              challenges: existing._count.challenges,
              members: existing._count.members,
            },
            message:
              "Add ?force=true to delete anyway. This will remove all gym-specific challenges.",
          },
          { status: 409 }
        );
      }
    }

    await db.gym.delete({ where: { id } });

    revalidatePath("/admin/gyms");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gym:", error);
    return NextResponse.json(
      { error: "Failed to delete gym" },
      { status: 500 }
    );
  }
}
