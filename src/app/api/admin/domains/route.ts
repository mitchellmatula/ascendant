import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createDomainSchema } from "@/lib/validators/admin";

// GET /api/admin/domains - List all domains
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domains = await db.domain.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { categories: true },
        },
      },
    });

    return NextResponse.json(domains);
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

// POST /api/admin/domains - Create a new domain
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDomainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, icon, color, sortOrder, isActive } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existing = await db.domain.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A domain with this name already exists" },
        { status: 409 }
      );
    }

    const domain = await db.domain.create({
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
    return NextResponse.json(domain, { status: 201 });
  } catch (error) {
    console.error("Error creating domain:", error);
    return NextResponse.json(
      { error: "Failed to create domain" },
      { status: 500 }
    );
  }
}
