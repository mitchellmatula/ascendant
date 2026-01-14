import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateDomainSchema } from "@/lib/validators/admin";

// GET /api/admin/domains/[id] - Get a single domain
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
    const domain = await db.domain.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { categories: true },
        },
      },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error("Error fetching domain:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/domains/[id] - Update a domain
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
    const parsed = updateDomainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if domain exists
    const existing = await db.domain.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
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
      const slugExists = await db.domain.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A domain with this name already exists" },
          { status: 409 }
        );
      }
    }

    const domain = await db.domain.update({
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

    revalidatePath("/admin/domains");
    return NextResponse.json(domain);
  } catch (error) {
    console.error("Error updating domain:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/domains/[id] - Delete a domain
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

    // Check if domain exists
    const existing = await db.domain.findUnique({
      where: { id },
      include: {
        _count: {
          select: { categories: true, levels: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Warn if domain has related data
    if (existing._count.categories > 0 || existing._count.levels > 0) {
      // Check for force delete flag
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Domain has related data",
            details: {
              categories: existing._count.categories,
              athleteLevels: existing._count.levels,
            },
            message:
              "Add ?force=true to delete anyway. This will cascade delete all related data.",
          },
          { status: 409 }
        );
      }
    }

    await db.domain.delete({ where: { id } });

    revalidatePath("/admin/domains");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}
