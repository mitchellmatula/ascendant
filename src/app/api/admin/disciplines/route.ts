import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createDisciplineSchema } from "@/lib/validators/admin";

// Simple similarity calculation (Sørensen–Dice coefficient)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length < 2 || str2.length < 2) return 0;

  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();

  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substring(i, i + 2));
  }
  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substring(i, i + 2));
  }

  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) intersection++;
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

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
    const skipSimilarityCheck = body.confirmOverride === true;

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

    // Check for similar names (case-insensitive, handles common variations)
    const normalizedName = name.toLowerCase().trim();
    const allDisciplines = await db.discipline.findMany({
      select: { id: true, name: true, slug: true },
    });

    const similarDiscipline = allDisciplines.find((d) => {
      const existingName = d.name.toLowerCase().trim();
      const existingSlug = d.slug.toLowerCase();
      
      // Exact match (case-insensitive)
      if (existingName === normalizedName) return true;
      
      // Slug match
      if (existingSlug === slug) return true;
      
      // Check if one contains the other (e.g., "Ninja" vs "Ninja Warrior")
      if (existingName.includes(normalizedName) || normalizedName.includes(existingName)) {
        // Only flag if they're very similar (within 5 chars difference)
        if (Math.abs(existingName.length - normalizedName.length) <= 5) return true;
      }
      
      // Levenshtein-like similarity check for typos
      const similarity = calculateSimilarity(existingName, normalizedName);
      if (similarity > 0.8) return true;
      
      return false;
    });

    if (similarDiscipline && !skipSimilarityCheck) {
      return NextResponse.json(
        { 
          error: `A similar discipline "${similarDiscipline.name}" already exists. Are you sure you want to create "${name}"?`,
          similarTo: similarDiscipline.name,
          canOverride: true,
        },
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
