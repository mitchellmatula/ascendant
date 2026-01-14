import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateEquipmentSchema } from "@/lib/validators/admin";

// GET /api/admin/equipment/[id] - Get single equipment
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
    const equipment = await db.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challenges: true },
        },
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/equipment/[id] - Update equipment
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
    const parsed = updateEquipmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if equipment exists
    const existing = await db.equipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const { name, description, icon, imageUrl, sortOrder, isActive, disciplineIds } = parsed.data;

    // If name is changing, update the slug
    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists
      const slugExists = await db.equipment.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "Equipment with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Handle discipline relationships if provided
    if (disciplineIds !== undefined) {
      // Delete existing discipline links
      await db.disciplineEquipment.deleteMany({
        where: { equipmentId: id },
      });

      // Create new discipline links
      if (disciplineIds.length > 0) {
        await db.disciplineEquipment.createMany({
          data: disciplineIds.map((disciplineId) => ({
            equipmentId: id,
            disciplineId,
          })),
        });
      }
    }

    const equipment = await db.equipment.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        icon,
        imageUrl,
        sortOrder,
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
      },
    });

    revalidatePath("/admin/equipment");
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error updating equipment:", error);
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/equipment/[id] - Delete equipment
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

    // Check if equipment exists
    const existing = await db.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challenges: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Warn if equipment has related challenges
    if (existing._count.challenges > 0) {
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Equipment has related data",
            details: {
              challenges: existing._count.challenges,
            },
            message:
              "Add ?force=true to delete anyway. This will remove the equipment from all linked challenges.",
          },
          { status: 409 }
        );
      }
    }

    await db.equipment.delete({ where: { id } });

    revalidatePath("/admin/equipment");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}
