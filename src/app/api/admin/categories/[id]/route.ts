import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateCategorySchema } from "@/lib/validators/admin";

// GET /api/admin/categories/[id] - Get a single category
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
    const category = await db.category.findUnique({
      where: { id },
      include: {
        domain: {
          select: { id: true, name: true, icon: true, color: true },
        },
        _count: {
          select: { challenges: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/categories/[id] - Update a category
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
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if category exists
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { domainId, name, description, icon, sortOrder, isActive } = parsed.data;

    // If domainId is changing, verify it exists
    if (domainId && domainId !== existing.domainId) {
      const domain = await db.domain.findUnique({ where: { id: domainId } });
      if (!domain) {
        return NextResponse.json({ error: "Domain not found" }, { status: 404 });
      }
    }

    // If name is changing, update the slug
    let slug = existing.slug;
    const targetDomainId = domainId ?? existing.domainId;
    
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists in target domain
      const slugExists = await db.category.findFirst({
        where: {
          domainId: targetDomainId,
          slug,
          id: { not: id },
        },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A category with this name already exists in this domain" },
          { status: 409 }
        );
      }
    }

    const category = await db.category.update({
      where: { id },
      data: {
        domainId,
        name,
        slug,
        description,
        icon,
        sortOrder,
        isActive,
      },
      include: {
        domain: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    revalidatePath("/admin/categories");
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id] - Delete a category
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

    // Check if category exists
    const existing = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challenges: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Warn if category has challenges
    if (existing._count.challenges > 0) {
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Category has challenges",
            details: { challenges: existing._count.challenges },
            message:
              "Add ?force=true to delete anyway. This will cascade delete all challenges.",
          },
          { status: 409 }
        );
      }
    }

    await db.category.delete({ where: { id } });

    revalidatePath("/admin/categories");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
