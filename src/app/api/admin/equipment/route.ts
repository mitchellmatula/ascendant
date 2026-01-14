import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createEquipmentSchema } from "@/lib/validators/admin";

// GET /api/admin/equipment - List all equipment
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const equipment = await db.equipment.findMany({
      orderBy: { sortOrder: "asc" },
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

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

// POST /api/admin/equipment - Create new equipment
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    console.log("Creating equipment with data:", body);
    
    const parsed = createEquipmentSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Equipment validation failed:", parsed.error.flatten());
      
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

    const { name, description, icon, imageUrl, sortOrder, isActive, disciplineIds } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existing = await db.equipment.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Equipment with this name already exists" },
        { status: 409 }
      );
    }

    const equipment = await db.equipment.create({
      data: {
        name,
        slug,
        description,
        icon,
        imageUrl,
        sortOrder,
        isActive,
        disciplines: disciplineIds && disciplineIds.length > 0
          ? {
              create: disciplineIds.map((disciplineId) => ({
                disciplineId,
              })),
            }
          : undefined,
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
    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error("Error creating equipment:", error);
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
}
