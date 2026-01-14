import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateDisciplineSchema } from "@/lib/validators/admin";

// GET /api/admin/disciplines/[id] - Get a single discipline
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
    const discipline = await db.discipline.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challenges: true },
        },
      },
    });

    if (!discipline) {
      return NextResponse.json({ error: "Discipline not found" }, { status: 404 });
    }

    return NextResponse.json(discipline);
  } catch (error) {
    console.error("Error fetching discipline:", error);
    return NextResponse.json(
      { error: "Failed to fetch discipline" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/disciplines/[id] - Update a discipline
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
    const parsed = updateDisciplineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if discipline exists
    const existing = await db.discipline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Discipline not found" }, { status: 404 });
    }

    const { name, description, icon, color, sortOrder, isActive } = parsed.data;

    // If name is changing, update the slug
    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists
      const slugExists = await db.discipline.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A discipline with this name already exists" },
          { status: 409 }
        );
      }
    }

    const discipline = await db.discipline.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        icon,
        color,
        sortOrder,
        isActive,
      },
    });

    revalidatePath("/admin/disciplines");
    return NextResponse.json(discipline);
  } catch (error) {
    console.error("Error updating discipline:", error);
    return NextResponse.json(
      { error: "Failed to update discipline" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/disciplines/[id] - Delete a discipline
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

    // Check if discipline exists
    const existing = await db.discipline.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challenges: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Discipline not found" }, { status: 404 });
    }

    // Warn if discipline has related challenges
    if (existing._count.challenges > 0) {
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Discipline has related data",
            details: {
              challenges: existing._count.challenges,
            },
            message:
              "Add ?force=true to delete anyway. This will remove the discipline from all linked challenges.",
          },
          { status: 409 }
        );
      }
    }

    await db.discipline.delete({ where: { id } });

    revalidatePath("/admin/disciplines");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discipline:", error);
    return NextResponse.json(
      { error: "Failed to delete discipline" },
      { status: 500 }
    );
  }
}
