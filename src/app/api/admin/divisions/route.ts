import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createDivisionSchema } from "@/lib/validators/admin";

// GET /api/admin/divisions - List all divisions
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const divisions = await db.division.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { rankRequirements: true },
        },
      },
    });

    return NextResponse.json(divisions);
  } catch (error) {
    console.error("Error fetching divisions:", error);
    return NextResponse.json(
      { error: "Failed to fetch divisions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/divisions - Create a new division
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    // Log incoming data for debugging
    console.log("Creating division with data:", JSON.stringify(body, null, 2));
    
    const parsed = createDivisionSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Division validation failed:", parsed.error.flatten());
      
      // Get a user-friendly error message
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formErrors = parsed.error.flatten().formErrors;
      
      let errorMessage = "Validation failed";
      
      if (formErrors.length > 0) {
        errorMessage = formErrors[0];
      } else if (Object.keys(fieldErrors).length > 0) {
        const firstError = Object.entries(fieldErrors)[0];
        errorMessage = `${firstError[0]}: ${(firstError[1] as string[])[0]}`;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, gender, ageMin, ageMax, sortOrder, isActive } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from the name" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db.division.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A division with this name already exists" },
        { status: 409 }
      );
    }

    console.log("Creating division in database:", { name, slug, gender, ageMin, ageMax, sortOrder, isActive });

    const division = await db.division.create({
      data: {
        name,
        slug,
        gender: gender ?? null,
        ageMin: ageMin ?? null,
        ageMax: ageMax ?? null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    console.log("Division created successfully:", division.id);

    // Revalidate the divisions page cache
    revalidatePath("/admin/divisions");

    return NextResponse.json(division, { status: 201 });
  } catch (error) {
    console.error("Error creating division:", error);
    
    // Check for Prisma unique constraint errors
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A division with this name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create division. Please try again." },
      { status: 500 }
    );
  }
}
