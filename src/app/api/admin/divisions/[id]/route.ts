import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateDivisionSchema } from "@/lib/validators/admin";

// GET /api/admin/divisions/[id] - Get a single division
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
    const division = await db.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rankRequirements: true, rankThresholds: true },
        },
      },
    });

    if (!division) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    return NextResponse.json(division);
  } catch (error) {
    console.error("Error fetching division:", error);
    return NextResponse.json(
      { error: "Failed to fetch division" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/divisions/[id] - Update a division
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
    const parsed = updateDivisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if division exists
    const existing = await db.division.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    const { name, gender, ageMin, ageMax, sortOrder, isActive } = parsed.data;

    // If name is changing, update the slug
    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists
      const slugExists = await db.division.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A division with this name already exists" },
          { status: 409 }
        );
      }
    }

    const division = await db.division.update({
      where: { id },
      data: {
        name,
        slug,
        gender,
        ageMin,
        ageMax,
        sortOrder,
        isActive,
      },
    });

    revalidatePath("/admin/divisions");
    return NextResponse.json(division);
  } catch (error) {
    console.error("Error updating division:", error);
    return NextResponse.json(
      { error: "Failed to update division" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/divisions/[id] - Delete a division
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

    // Check if division exists
    const existing = await db.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rankRequirements: true, rankThresholds: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    // Warn if division has related data
    const totalRelated = existing._count.rankRequirements + existing._count.rankThresholds;
    if (totalRelated > 0) {
      // Check for force delete flag
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Division has related data",
            details: {
              rankRequirements: existing._count.rankRequirements,
              rankThresholds: existing._count.rankThresholds,
            },
            message:
              "Add ?force=true to delete anyway. This will cascade delete all related data.",
          },
          { status: 409 }
        );
      }
    }

    await db.division.delete({ where: { id } });

    revalidatePath("/admin/divisions");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting division:", error);
    return NextResponse.json(
      { error: "Failed to delete division" },
      { status: 500 }
    );
  }
}
