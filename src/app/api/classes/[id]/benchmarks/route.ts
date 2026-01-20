import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role } from "../../../../../../prisma/generated/prisma/client";

// Helper to check if user is a coach of the class
async function isClassCoach(classId: string, userId: string): Promise<boolean> {
  const coach = await db.classCoach.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  return !!coach;
}

// GET /api/classes/[id]/benchmarks - List class benchmarks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true, athlete: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is coach or member
    const isCoach = await isClassCoach(id, user.id);
    
    let isMember = false;
    if (user.athlete) {
      const membership = await db.classMember.findUnique({
        where: { 
          classId_athleteId: { classId: id, athleteId: user.athlete.id } 
        },
      });
      isMember = membership?.status === "ACTIVE";
    }

    if (!isCoach && !isMember && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "You must be a coach or member to view benchmarks" },
        { status: 403 }
      );
    }

    const benchmarks = await db.classBenchmark.findMany({
      where: { classId: id, isActive: true },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            slug: true,
            gradingType: true,
            demoImageUrl: true,
            primaryDomain: {
              select: { name: true, icon: true, color: true },
            },
          },
        },
        _count: {
          select: { grades: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    // Get class info for the response
    const classInfo = await db.class.findUnique({
      where: { id },
      select: { 
        name: true,
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    });

    return NextResponse.json({
      className: classInfo?.name || "Class",
      memberCount: classInfo?._count.members || 0,
      benchmarks: benchmarks.map((b) => ({
        id: b.id,
        challengeId: b.challenge.id,
        challenge: {
          id: b.challenge.id,
          name: b.challenge.name,
          slug: b.challenge.slug,
          gradingType: b.challenge.gradingType,
          demoImageUrl: b.challenge.demoImageUrl,
          primaryDomain: b.challenge.primaryDomain,
        },
        sortOrder: b.sortOrder,
        createdAt: b.createdAt,
        _count: { grades: b._count.grades },
      })),
    });
  } catch (error) {
    console.error("Class benchmarks GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch benchmarks" },
      { status: 500 }
    );
  }
}

// POST /api/classes/[id]/benchmarks - Add benchmark to class
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only coaches can add benchmarks
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can add benchmarks" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { challengeId, sortOrder } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required" },
        { status: 400 }
      );
    }

    // Verify challenge exists and is CLASS or GLOBAL scope
    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, scope: true, createdByClassId: true },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check scope - CLASS challenges must belong to this class
    if (challenge.scope === "CLASS" && challenge.createdByClassId !== id) {
      return NextResponse.json(
        { error: "This class challenge belongs to a different class" },
        { status: 400 }
      );
    }

    // Check if already a benchmark
    const existingBenchmark = await db.classBenchmark.findUnique({
      where: { classId_challengeId: { classId: id, challengeId } },
    });

    if (existingBenchmark) {
      if (existingBenchmark.isActive) {
        return NextResponse.json(
          { error: "Challenge is already a benchmark for this class" },
          { status: 400 }
        );
      }

      // Reactivate
      await db.classBenchmark.update({
        where: { id: existingBenchmark.id },
        data: { isActive: true, sortOrder: sortOrder || 0 },
      });

      return NextResponse.json({ success: true, benchmarkId: existingBenchmark.id });
    }

    // Get max sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const lastBenchmark = await db.classBenchmark.findFirst({
        where: { classId: id, isActive: true },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      finalSortOrder = (lastBenchmark?.sortOrder || 0) + 1;
    }

    const benchmark = await db.classBenchmark.create({
      data: {
        classId: id,
        challengeId,
        sortOrder: finalSortOrder,
      },
    });

    return NextResponse.json({ success: true, benchmarkId: benchmark.id });
  } catch (error) {
    console.error("Class benchmarks POST error:", error);
    return NextResponse.json(
      { error: "Failed to add benchmark" },
      { status: 500 }
    );
  }
}

// DELETE /api/classes/[id]/benchmarks - Remove benchmark from class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only coaches can remove benchmarks
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can remove benchmarks" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { benchmarkId } = body;

    if (!benchmarkId) {
      return NextResponse.json(
        { error: "Benchmark ID is required" },
        { status: 400 }
      );
    }

    // Soft delete
    await db.classBenchmark.update({
      where: { id: benchmarkId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class benchmarks DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove benchmark" },
      { status: 500 }
    );
  }
}
