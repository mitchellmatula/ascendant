import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createDisciplineSchema } from "@/lib/validators/admin";

// GET /api/admin/disciplines - List all disciplines
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const disciplines = await db.discipline.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { challenges: true },
        },
      },
    });

    return NextResponse.json(disciplines);
  } catch (error) {
    console.error("Error fetching disciplines:", error);
    return NextResponse.json(
      { error: "Failed to fetch disciplines" },
      { status: 500 }
    );
  }
}

// POST /api/admin/disciplines - Create a new discipline
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    console.log("Creating discipline with data:", body);
    
    const parsed = createDisciplineSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Discipline validation failed:", parsed.error.flatten());
      
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

    const { name, description, icon, color, sortOrder, isActive } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existing = await db.discipline.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A discipline with this name already exists" },
        { status: 409 }
      );
    }

    const discipline = await db.discipline.create({
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
    return NextResponse.json(discipline, { status: 201 });
  } catch (error) {
    console.error("Error creating discipline:", error);
    return NextResponse.json(
      { error: "Failed to create discipline" },
      { status: 500 }
    );
  }
}
