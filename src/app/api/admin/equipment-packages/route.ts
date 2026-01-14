import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createEquipmentPackageSchema } from "@/lib/validators/admin";

// GET /api/admin/equipment-packages - List all equipment packages
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packages = await db.equipmentPackage.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error("Error fetching equipment packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment packages" },
      { status: 500 }
    );
  }
}

// POST /api/admin/equipment-packages - Create new equipment package
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createEquipmentPackageSchema.safeParse(body);

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

    const { name, description, icon, sortOrder, isActive, items } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existing = await db.equipmentPackage.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A package with this name already exists" },
        { status: 409 }
      );
    }

    const pkg = await db.equipmentPackage.create({
      data: {
        name,
        slug,
        description,
        icon,
        sortOrder,
        isActive,
        items:
          items && items.length > 0
            ? {
                create: items.map((item) => ({
                  equipmentId: item.equipmentId,
                  quantity: item.quantity,
                })),
              }
            : undefined,
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
    return NextResponse.json(pkg, { status: 201 });
  } catch (error) {
    console.error("Error creating equipment package:", error);
    return NextResponse.json(
      { error: "Failed to create equipment package" },
      { status: 500 }
    );
  }
}
