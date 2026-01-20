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

// GET /api/classes/[id]/grades - Get grades for class benchmarks
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
    const { searchParams } = new URL(request.url);
    const benchmarkId = searchParams.get("benchmarkId");
    const athleteId = searchParams.get("athleteId");
    const includeSubmissions = searchParams.get("includeSubmissions") === "true";

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true, athlete: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is coach or member
    const isCoach = await isClassCoach(id, user.id);

    // Athletes can only see their own grades
    const isSelfQuery = user.athlete?.id === athleteId;
    
    if (!isCoach && !isSelfQuery && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "You can only view your own grades or be a coach" },
        { status: 403 }
      );
    }

    // Build query
    type WhereType = {
      benchmark: { classId: string };
      benchmarkId?: string;
      athleteId?: string;
    };

    const where: WhereType = {
      benchmark: { classId: id },
    };

    if (benchmarkId) {
      where.benchmarkId = benchmarkId;
    }

    if (athleteId) {
      where.athleteId = athleteId;
    }

    const grades = await db.classGrade.findMany({
      where,
      include: {
        benchmark: {
          select: {
            id: true,
            challengeId: true,
            challenge: {
              select: {
                id: true,
                name: true,
                slug: true,
                gradingType: true,
              },
            },
          },
        },
        athlete: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
        gradedBy: {
          select: {
            athlete: { select: { displayName: true } },
          },
        },
      },
      orderBy: [{ gradedAt: "desc" }],
    });

    // If includeSubmissions is true and we have a specific benchmark, fetch submission history
    let submissionsByAthlete: Record<string, Array<{
      id: string;
      achievedValue: number | null;
      achievedRank: string | null;
      status: string;
      submittedAt: Date;
      notes: string | null;
    }>> = {};

    if (includeSubmissions && benchmarkId) {
      // Get the challenge ID for this benchmark
      const benchmark = await db.classBenchmark.findUnique({
        where: { id: benchmarkId },
        select: { challengeId: true },
      });

      if (benchmark) {
        // Get all class member athlete IDs
        const members = await db.classMember.findMany({
          where: { classId: id, status: "ACTIVE" },
          select: { athleteId: true },
        });
        const athleteIds = members.map(m => m.athleteId);

        // Fetch submissions for these athletes on this challenge
        const submissions = await db.challengeSubmission.findMany({
          where: {
            challengeId: benchmark.challengeId,
            athleteId: { in: athleteIds },
          },
          select: {
            id: true,
            athleteId: true,
            achievedValue: true,
            achievedRank: true,
            status: true,
            submittedAt: true,
            notes: true,
          },
          orderBy: { submittedAt: "desc" },
          take: 100, // Limit to prevent huge responses
        });

        // Group by athlete
        submissionsByAthlete = submissions.reduce((acc, sub) => {
          if (!acc[sub.athleteId]) {
            acc[sub.athleteId] = [];
          }
          acc[sub.athleteId].push({
            id: sub.id,
            achievedValue: sub.achievedValue,
            achievedRank: sub.achievedRank,
            status: sub.status,
            submittedAt: sub.submittedAt,
            notes: sub.notes,
          });
          return acc;
        }, {} as typeof submissionsByAthlete);
      }
    }

    return NextResponse.json({
      grades: grades.map((g) => ({
        id: g.id,
        benchmarkId: g.benchmark.id,
        challengeId: g.benchmark.challenge.id,
        challengeName: g.benchmark.challenge.name,
        challengeSlug: g.benchmark.challenge.slug,
        gradingType: g.benchmark.challenge.gradingType,
        athleteId: g.athlete.id,
        athleteName: g.athlete.displayName,
        athleteUsername: g.athlete.username,
        athleteAvatar: g.athlete.avatarUrl,
        achievedValue: g.achievedValue,
        passed: g.passed,
        achievedTier: g.achievedTier,
        notes: g.notes,
        gradedAt: g.gradedAt,
        gradedBy: g.gradedBy.athlete?.displayName || "Coach",
      })),
      submissions: submissionsByAthlete,
    });
  } catch (error) {
    console.error("Class grades GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 }
    );
  }
}
