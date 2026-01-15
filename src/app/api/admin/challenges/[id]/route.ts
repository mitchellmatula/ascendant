import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateChallengeSchema } from "@/lib/validators/admin";

// GET /api/admin/challenges/[id] - Get a single challenge
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
    const challenge = await db.challenge.findUnique({
      where: { id },
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
          orderBy: { sortOrder: "asc" },
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
        allowedDivisions: {
          include: {
            division: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { submissions: true, rankRequirements: true },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenge" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/challenges/[id] - Update a challenge
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
    const parsed = updateChallengeSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Challenge update validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if challenge exists
    const existing = await db.challenge.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
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
      allowedDivisionIds,
    } = parsed.data;

    // If name is changing, update the slug
    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug already exists
      const slugExists = await db.challenge.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A challenge with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update in a transaction
    const challenge = await db.$transaction(async (tx) => {
      // Update the challenge
      await tx.challenge.update({
        where: { id },
        data: {
          ...(name && { name, slug }),
          ...(description !== undefined && { description }),
          ...(instructions !== undefined && { instructions }),
          ...(demoVideoUrl !== undefined && { demoVideoUrl }),
          ...(demoImageUrl !== undefined && { demoImageUrl }),
          ...(isActive !== undefined && { isActive }),
          ...(primaryDomainId && { primaryDomainId }),
          ...(primaryXPPercent !== undefined && { primaryXPPercent }),
          ...(secondaryDomainId !== undefined && { secondaryDomainId }),
          ...(secondaryXPPercent !== undefined && { secondaryXPPercent }),
          ...(tertiaryDomainId !== undefined && { tertiaryDomainId }),
          ...(tertiaryXPPercent !== undefined && { tertiaryXPPercent }),
          ...(gradingType !== undefined && { gradingType }),
          ...(gradingUnit !== undefined && { gradingUnit }),
          ...(timeFormat !== undefined && { timeFormat }),
          ...(minRank !== undefined && { minRank }),
          ...(maxRank !== undefined && { maxRank }),
          ...(gymId !== undefined && { gymId }),
        },
      });

      // Update category relations if provided
      if (categoryIds !== undefined) {
        // Delete existing
        await tx.challengeCategory.deleteMany({
          where: { challengeId: id },
        });
        // Create new
        if (categoryIds.length > 0) {
          await tx.challengeCategory.createMany({
            data: categoryIds.map((categoryId, index) => ({
              challengeId: id,
              categoryId,
              sortOrder: index,
            })),
          });
        }
      }

      // Update discipline relations if provided
      if (disciplineIds !== undefined) {
        // Delete existing
        await tx.challengeDiscipline.deleteMany({
          where: { challengeId: id },
        });
        // Create new
        if (disciplineIds.length > 0) {
          await tx.challengeDiscipline.createMany({
            data: disciplineIds.map((disciplineId) => ({
              challengeId: id,
              disciplineId,
            })),
          });
        }
      }

      // Update equipment relations if provided
      if (equipmentIds !== undefined) {
        // Delete existing
        await tx.challengeEquipment.deleteMany({
          where: { challengeId: id },
        });
        // Create new
        if (equipmentIds.length > 0) {
          await tx.challengeEquipment.createMany({
            data: equipmentIds.map((equipmentId) => ({
              challengeId: id,
              equipmentId,
            })),
          });
        }
      }

      // Update grade requirements if provided
      if (grades !== undefined) {
        // Delete existing grades
        await tx.challengeGrade.deleteMany({
          where: { challengeId: id },
        });
        // Create new grades
        if (grades.length > 0) {
          await tx.challengeGrade.createMany({
            data: grades.map((grade) => ({
              challengeId: id,
              divisionId: grade.divisionId,
              rank: grade.rank,
              targetValue: grade.targetValue,
              description: grade.description,
              bonusXP: grade.bonusXP ?? 0,
            })),
          });
        }
      }

      // Update allowed division restrictions if provided
      if (allowedDivisionIds !== undefined) {
        // Delete existing
        await tx.challengeDivision.deleteMany({
          where: { challengeId: id },
        });
        // Create new
        if (allowedDivisionIds.length > 0) {
          await tx.challengeDivision.createMany({
            data: allowedDivisionIds.map((divisionId) => ({
              challengeId: id,
              divisionId,
            })),
          });
        }
      }

      // Return with relations
      return tx.challenge.findUnique({
        where: { id },
        include: {
          primaryDomain: { select: { id: true, name: true } },
          categories: { include: { category: true } },
          disciplines: { include: { discipline: true } },
          equipment: { include: { equipment: true } },
          grades: { include: { division: { select: { id: true, name: true } } } },
          allowedDivisions: { include: { division: { select: { id: true, name: true } } } },
        },
      });
    });

    revalidatePath("/admin/challenges");
    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json(
      { error: "Failed to update challenge" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/challenges/[id] - Delete a challenge
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

    // Check if challenge exists
    const existing = await db.challenge.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true, rankRequirements: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Warn if challenge has related data
    const totalRelated = existing._count.submissions + existing._count.rankRequirements;
    if (totalRelated > 0) {
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Challenge has related data",
            details: {
              submissions: existing._count.submissions,
              rankRequirements: existing._count.rankRequirements,
            },
            message:
              "Add ?force=true to delete anyway. This will cascade delete all related data.",
          },
          { status: 409 }
        );
      }
    }

    await db.challenge.delete({ where: { id } });

    revalidatePath("/admin/challenges");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return NextResponse.json(
      { error: "Failed to delete challenge" },
      { status: 500 }
    );
  }
}
