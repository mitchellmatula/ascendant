import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role, SubmissionStatus } from "../../../../../../prisma/generated/prisma/client";
import { createNotification } from "@/lib/notifications";
import { calculateAchievedTier, awardXP, XP_PER_TIER } from "@/lib/xp";
import type { Rank } from "@/lib/levels";

// Helper to check if user is a coach of the class
async function isClassCoach(classId: string, userId: string): Promise<boolean> {
  const coach = await db.classCoach.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  return !!coach;
}

// POST /api/classes/[id]/grade - Quick grade endpoint for coaches
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

    // Only coaches can grade
    const isCoach = await isClassCoach(id, user.id);
    if (!isCoach && user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Only coaches can grade" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { benchmarkId, athleteId, value, passed, notes } = body;

    if (!benchmarkId || !athleteId) {
      return NextResponse.json(
        { error: "Benchmark ID and athlete ID are required" },
        { status: 400 }
      );
    }

    // Get the benchmark with challenge info including domains for XP
    const benchmark = await db.classBenchmark.findUnique({
      where: { id: benchmarkId },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            gradingType: true,
            grades: true,
            primaryDomainId: true,
            primaryXPPercent: true,
            secondaryDomainId: true,
            secondaryXPPercent: true,
            tertiaryDomainId: true,
            tertiaryXPPercent: true,
          },
        },
      },
    });

    if (!benchmark || benchmark.classId !== id) {
      return NextResponse.json(
        { error: "Benchmark not found" },
        { status: 404 }
      );
    }

    // Verify athlete is a member of this class
    const membership = await db.classMember.findUnique({
      where: { classId_athleteId: { classId: id, athleteId } },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Athlete is not a member of this class" },
        { status: 400 }
      );
    }

    // Get athlete info
    const athlete = await db.athlete.findUnique({
      where: { id: athleteId },
      select: { 
        id: true, 
        displayName: true, 
        dateOfBirth: true, 
        gender: true,
        userId: true,
      },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Calculate tier based on value and grading
    let tier: string | null = null;
    const gradingType = benchmark.challenge.gradingType;
    
    if (gradingType === "PASS_FAIL") {
      // For pass/fail, tier is based on whether they passed
      tier = passed ? (benchmark.challenge.grades[0]?.rank || "F") : null;
    } else if (value !== undefined && benchmark.challenge.grades.length > 0) {
      // For graded challenges, calculate tier from value
      const gradeTargets = benchmark.challenge.grades.map(g => ({
        rank: g.rank,
        targetValue: g.targetValue,
      }));
      tier = calculateAchievedTier(value, gradeTargets, gradingType);
    }

    // Find existing class grade for this benchmark/athlete (unique constraint)
    const existingGrade = await db.classGrade.findUnique({
      where: { benchmarkId_athleteId: { benchmarkId, athleteId } },
      include: { submission: { select: { id: true, claimedTiers: true } } },
    });

    // Get previously claimed tiers from any existing submission for this challenge
    let previouslyClaimedTiers: string[] = [];
    const existingChallengeSubmission = await db.challengeSubmission.findUnique({
      where: { 
        athleteId_challengeId: { athleteId, challengeId: benchmark.challenge.id } 
      },
      select: { id: true, claimedTiers: true },
    });
    if (existingChallengeSubmission && existingChallengeSubmission.claimedTiers) {
      previouslyClaimedTiers = existingChallengeSubmission.claimedTiers.split(",").filter(Boolean);
    }

    // Create or update submission
    let submission;
    if (existingGrade?.submission) {
      // Update existing submission
      submission = await db.challengeSubmission.update({
        where: { id: existingGrade.submission.id },
        data: {
          achievedValue: value !== undefined ? Math.round(value) : null,
          achievedRank: tier,
          status: SubmissionStatus.APPROVED,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          autoApproved: true,
          notes: notes || null,
        },
      });
    } else {
      // Check if there's already a submission for this challenge/athlete (unique constraint)
      const existingSubmission = await db.challengeSubmission.findUnique({
        where: { 
          athleteId_challengeId: { athleteId, challengeId: benchmark.challenge.id } 
        },
      });

      if (existingSubmission) {
        // Update the existing submission
        submission = await db.challengeSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            achievedValue: value !== undefined ? Math.round(value) : null,
            achievedRank: tier,
            status: SubmissionStatus.APPROVED,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            autoApproved: true,
            notes: notes || null,
            supervisorId: user.id,
          },
        });
      } else {
        // Create new submission
        submission = await db.challengeSubmission.create({
          data: {
            challengeId: benchmark.challenge.id,
            athleteId,
            submittedById: user.id,
            achievedValue: value !== undefined ? Math.round(value) : null,
            achievedRank: tier,
            status: SubmissionStatus.APPROVED,
            autoApproved: true,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            notes: notes || null,
            isPublic: false, // Class grades are private by default
            proofType: "MANUAL",
            supervisorId: user.id,
          },
        });
      }
    }

    // Create or update class grade
    let grade;
    if (existingGrade) {
      grade = await db.classGrade.update({
        where: { id: existingGrade.id },
        data: {
          achievedValue: value !== undefined ? value : null,
          passed: gradingType === "PASS_FAIL" ? passed : null,
          achievedTier: tier,
          notes: notes || null,
          gradedById: user.id,
          submissionId: submission.id,
        },
      });
    } else {
      grade = await db.classGrade.create({
        data: {
          benchmarkId,
          athleteId,
          gradedById: user.id,
          achievedValue: value !== undefined ? value : null,
          passed: gradingType === "PASS_FAIL" ? passed : null,
          achievedTier: tier,
          notes: notes || null,
          submissionId: submission.id,
        },
      });
    }

    // Award XP for achieved tier(s)
    let xpAwarded = 0;
    const newClaimedTiers: string[] = [];
    
    if (tier) {
      const TIER_ORDER: Rank[] = ["F", "E", "D", "C", "B", "A", "S"];
      const achievedIndex = TIER_ORDER.indexOf(tier as Rank);
      
      // Find all tiers up to and including achieved tier that haven't been claimed yet
      for (let i = 0; i <= achievedIndex; i++) {
        const tierToCheck = TIER_ORDER[i];
        if (!previouslyClaimedTiers.includes(tierToCheck)) {
          newClaimedTiers.push(tierToCheck);
        }
      }
      
      if (newClaimedTiers.length > 0) {
        // Calculate base XP for new tiers
        const baseXP = newClaimedTiers.reduce(
          (sum, t) => sum + XP_PER_TIER[t as Rank], 
          0
        );
        
        const challenge = benchmark.challenge;
        
        // Award XP to primary domain
        const primaryXP = Math.round(baseXP * (challenge.primaryXPPercent / 100));
        if (primaryXP > 0 && challenge.primaryDomainId) {
          await awardXP({
            athleteId,
            domainId: challenge.primaryDomainId,
            amount: primaryXP,
            source: "CHALLENGE",
            sourceId: submission.id,
            note: `Quick grade: ${newClaimedTiers.join(",")} tier(s) on "${challenge.name}"`,
          });
          xpAwarded += primaryXP;
        }
        
        // Award XP to secondary domain if applicable
        if (challenge.secondaryDomainId && challenge.secondaryXPPercent) {
          const secondaryXP = Math.round(baseXP * (challenge.secondaryXPPercent / 100));
          if (secondaryXP > 0) {
            await awardXP({
              athleteId,
              domainId: challenge.secondaryDomainId,
              amount: secondaryXP,
              source: "CHALLENGE",
              sourceId: submission.id,
              note: `Quick grade: ${newClaimedTiers.join(",")} tier(s) on "${challenge.name}"`,
            });
            xpAwarded += secondaryXP;
          }
        }
        
        // Award XP to tertiary domain if applicable
        if (challenge.tertiaryDomainId && challenge.tertiaryXPPercent) {
          const tertiaryXP = Math.round(baseXP * (challenge.tertiaryXPPercent / 100));
          if (tertiaryXP > 0) {
            await awardXP({
              athleteId,
              domainId: challenge.tertiaryDomainId,
              amount: tertiaryXP,
              source: "CHALLENGE",
              sourceId: submission.id,
              note: `Quick grade: ${newClaimedTiers.join(",")} tier(s) on "${challenge.name}"`,
            });
            xpAwarded += tertiaryXP;
          }
        }
        
        // Update submission with claimed tiers and XP awarded
        const allClaimedTiers = [...new Set([...previouslyClaimedTiers, ...newClaimedTiers])];
        await db.challengeSubmission.update({
          where: { id: submission.id },
          data: {
            claimedTiers: allClaimedTiers.join(","),
            xpAwarded: { increment: xpAwarded },
          },
        });
      }
    }

    // Notify athlete
    const tierDisplay = tier || (passed ? "Pass" : "Fail");
    await createNotification({
      athleteId,
      type: "CLASS_GRADE",
      title: "New grade recorded",
      body: `You achieved ${tierDisplay} on "${benchmark.challenge.name}"${xpAwarded > 0 ? ` (+${xpAwarded} XP)` : ""}`,
      linkUrl: `/classes/${id}`,
    });

    return NextResponse.json({
      success: true,
      grade: {
        id: grade.id,
        achievedValue: grade.achievedValue,
        achievedTier: grade.achievedTier,
        passed: grade.passed,
        submissionId: submission.id,
        xpAwarded,
        newTiers: newClaimedTiers,
      },
    });
  } catch (error) {
    console.error("Class grade POST error:", error);
    return NextResponse.json(
      { error: "Failed to record grade" },
      { status: 500 }
    );
  }
}
