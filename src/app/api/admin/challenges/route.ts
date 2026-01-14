import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createChallengeSchema } from "@/lib/validators/admin";

// GET /api/admin/challenges - List all challenges
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const domainId = url.searchParams.get("domain");
    const categoryId = url.searchParams.get("category");
    const disciplineId = url.searchParams.get("discipline");

    const challenges = await db.challenge.findMany({
      where: {
        ...(domainId && { primaryDomainId: domainId }),
        ...(categoryId && {
          categories: { some: { categoryId } },
        }),
        ...(disciplineId && {
          disciplines: { some: { disciplineId } },
        }),
      },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      include: {
        primaryDomain: { select: { id: true, name: true, color: true, icon: true } },
        secondaryDomain: { select: { id: true, name: true, color: true } },
        tertiaryDomain: { select: { id: true, name: true, color: true } },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, domainId: true },
            },
          },
        },
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true, color: true },
            },
          },
        },
        equipment: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
        grades: {
          include: {
            division: { select: { id: true, name: true } },
          },
          orderBy: [{ divisionId: "asc" }, { rank: "asc" }],
        },
        _count: {
          select: { submissions: true, rankRequirements: true },
        },
      },
    });

    return NextResponse.json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

// POST /api/admin/challenges - Create a new challenge
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    console.log("Creating challenge with data:", body);
    
    const parsed = createChallengeSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Challenge validation failed:", parsed.error.flatten());
      
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formErrors = parsed.error.flatten().formErrors;
      
      // Get first field error or form error
      const firstFieldError = Object.entries(fieldErrors)[0];
      const errorMessage = firstFieldError 
        ? `${firstFieldError[0]}: ${(firstFieldError[1] as string[])[0]}`
        : formErrors[0] || "Validation failed";
      
      return NextResponse.json(
        { error: errorMessage, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      instructions,
      demoVideoUrl,
      demoImageUrl,
      isActive,
      gradingType,
      gradingUnit,
      timeFormat,
      minRank,
      maxRank,
      primaryDomainId,
      primaryXPPercent,
      secondaryDomainId,
      secondaryXPPercent,
      tertiaryDomainId,
      tertiaryXPPercent,
      categoryIds,
      disciplineIds,
      equipmentIds,
      grades,
      gymId,
    } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existing = await db.challenge.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A challenge with this name already exists" },
        { status: 409 }
      );
    }

    // Create challenge with relations in a transaction
    const challenge = await db.$transaction(async (tx) => {
      // Create the challenge
      const newChallenge = await tx.challenge.create({
        data: {
          name,
          slug,
          description,
          instructions,
          demoVideoUrl,
          demoImageUrl,
          isActive,
          gradingType,
          gradingUnit,
          timeFormat,
          minRank,
          maxRank,
          primaryDomainId,
          primaryXPPercent,
          secondaryDomainId,
          secondaryXPPercent,
          tertiaryDomainId,
          tertiaryXPPercent,
          gymId,
        },
      });

      // Create category relations
      if (categoryIds && categoryIds.length > 0) {
        await tx.challengeCategory.createMany({
          data: categoryIds.map((categoryId, index) => ({
            challengeId: newChallenge.id,
            categoryId,
            sortOrder: index,
          })),
        });
      }

      // Create discipline relations
      if (disciplineIds && disciplineIds.length > 0) {
        await tx.challengeDiscipline.createMany({
          data: disciplineIds.map((disciplineId) => ({
            challengeId: newChallenge.id,
            disciplineId,
          })),
        });
      }

      // Create equipment relations
      if (equipmentIds && equipmentIds.length > 0) {
        await tx.challengeEquipment.createMany({
          data: equipmentIds.map((equipmentId) => ({
            challengeId: newChallenge.id,
            equipmentId,
          })),
        });
      }

      // Create grade requirements (per division/rank)
      if (grades && grades.length > 0) {
        await tx.challengeGrade.createMany({
          data: grades.map((grade) => ({
            challengeId: newChallenge.id,
            divisionId: grade.divisionId,
            rank: grade.rank,
            targetValue: grade.targetValue,
            description: grade.description,
            bonusXP: grade.bonusXP ?? 0,
          })),
        });
      }

      // Return with relations
      return tx.challenge.findUnique({
        where: { id: newChallenge.id },
        include: {
          primaryDomain: { select: { id: true, name: true } },
          categories: { include: { category: true } },
          disciplines: { include: { discipline: true } },
          equipment: { include: { equipment: true } },
          grades: { include: { division: { select: { id: true, name: true } } } },
        },
      });
    });

    revalidatePath("/admin/challenges");
    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
