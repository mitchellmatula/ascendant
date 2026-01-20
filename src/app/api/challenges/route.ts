import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/challenges - Search challenges for adding to benchmarks, etc.
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const excludeIds = searchParams.get("excludeIds")?.split(",").filter(Boolean) || [];
    const disciplineId = searchParams.get("disciplineId");
    const gymId = searchParams.get("gymId");

    const where: any = {
      isActive: true,
    };

    // Exclude specific challenge IDs
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    // Search by name
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Filter by discipline
    if (disciplineId) {
      where.disciplines = {
        some: { disciplineId },
      };
    }

    // Filter by gym (include global challenges + gym-specific)
    if (gymId) {
      where.OR = [
        { gymId: null }, // Global challenges
        { gymId }, // Gym-specific challenges
      ];
    }

    const challenges = await db.challenge.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        gradingType: true,
        primaryDomain: {
          select: { name: true, color: true },
        },
        disciplines: {
          select: {
            discipline: { select: { name: true } },
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({
      challenges: challenges.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        gradingType: c.gradingType,
        primaryDomain: c.primaryDomain,
        discipline: c.disciplines[0]?.discipline?.name || null,
      })),
    });
  } catch (error) {
    console.error("Challenges search error:", error);
    return NextResponse.json(
      { error: "Failed to search challenges" },
      { status: 500 }
    );
  }
}
