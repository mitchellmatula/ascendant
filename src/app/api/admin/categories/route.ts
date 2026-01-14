import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createCategorySchema } from "@/lib/validators/admin";

// GET /api/admin/categories - List all categories (optionally filtered by domain)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domain");

    const categories = await db.category.findMany({
      where: domainId ? { domainId } : undefined,
      orderBy: [{ domain: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        domain: {
          select: { id: true, name: true, icon: true, color: true },
        },
        _count: {
          select: { challenges: true }, // counts ChallengeCategory join records
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { domainId, name, description, icon, sortOrder, isActive } = parsed.data;

    // Verify domain exists
    const domain = await db.domain.findUnique({ where: { id: domainId } });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists in this domain
    const existing = await db.category.findUnique({
      where: { domainId_slug: { domainId, slug } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists in this domain" },
        { status: 409 }
      );
    }

    const category = await db.category.create({
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
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
