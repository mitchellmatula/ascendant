import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateEquipmentPackageSchema } from "@/lib/validators/admin";

// GET /api/admin/equipment-packages/[id] - Get single package
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
    const pkg = await db.equipmentPackage.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(pkg);
  } catch (error) {
    console.error("Error fetching equipment package:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment package" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/equipment-packages/[id] - Update package
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
    const parsed = updateEquipmentPackageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if package exists
    const existing = await db.equipmentPackage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const { name, description, icon, sortOrder, isActive, items } = parsed.data;

    // If name is changing, update the slug
    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists
      const slugExists = await db.equipmentPackage.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A package with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Handle items if provided
    if (items !== undefined) {
      // Delete existing items
      await db.equipmentPackageItem.deleteMany({
        where: { packageId: id },
      });

      // Create new items
      if (items.length > 0) {
        await db.equipmentPackageItem.createMany({
          data: items.map((item) => ({
            packageId: id,
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        });
      }
    }

    const pkg = await db.equipmentPackage.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        icon,
        sortOrder,
        isActive,
      },
      include: {
        items: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    revalidatePath("/admin/equipment-packages");
    return NextResponse.json(pkg);
  } catch (error) {
    console.error("Error updating equipment package:", error);
    return NextResponse.json(
      { error: "Failed to update equipment package" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/equipment-packages/[id] - Delete package
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

    // Check if package exists
    const existing = await db.equipmentPackage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    await db.equipmentPackage.delete({ where: { id } });

    revalidatePath("/admin/equipment-packages");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment package:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment package" },
      { status: 500 }
    );
  }
}
