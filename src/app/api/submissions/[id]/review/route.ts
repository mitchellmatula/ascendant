import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { reviewSubmissionSchema } from "@/lib/validators/submission";
import { canReviewSubmission } from "@/lib/submissions";
import { awardXP, XP_PER_TIER } from "@/lib/xp";
import type { Rank } from "@/lib/levels";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/submissions/[id]/review
 * Review a submission (approve, reject, request revision)
 * 
 * Reviewers must be:
 * - SYSTEM_ADMIN, GYM_ADMIN, or COACH (always allowed)
 * - OR an athlete who is at least 1 tier higher in the primary domain
 * - OR S-rank reviewing S-rank (same tier exception at max)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can review this submission
    const reviewPermission = await canReviewSubmission({
      reviewerUserId: user.id,
      reviewerRole: user.role,
      submissionId: id,
    });

    if (!reviewPermission.canReview) {
      return NextResponse.json(
        { error: reviewPermission.reason || "Not authorized to review this submission" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = reviewSubmissionSchema.parse(body);

    // Get the submission
    const submission = await db.challengeSubmission.findUnique({
      where: { id },
      include: {
        challenge: {
          include: {
            grades: true,
            primaryDomain: true,
            secondaryDomain: true,
            tertiaryDomain: true,
          },
        },
        athlete: {
          select: {
            id: true,
            displayName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "This submission has already been reviewed" },
        { status: 400 }
      );
    }

    // If reviewer provides a new achievedValue, recalculate the rank
    let achievedRank = submission.achievedRank;
    let achievedValue = submission.achievedValue;
    
    if (data.achievedValue !== undefined && data.achievedValue !== null) {
      achievedValue = data.achievedValue;
      
      // Get athlete's division
      const age = calculateAge(submission.athlete.dateOfBirth);
      const division = await db.division.findFirst({
        where: {
          isActive: true,
          gender: submission.athlete.gender ?? undefined,
          ageMin: { lte: age },
          ageMax: { gte: age },
        },
      });

      if (division) {
        const grades = submission.challenge.grades.filter(g => g.divisionId === division.id);
        achievedRank = calculateAchievedRankFromGrades(
          achievedValue,
          grades,
          submission.challenge.gradingType
        );
      }
    }

    // Update the submission
    const updatedSubmission = await db.challengeSubmission.update({
      where: { id },
      data: {
        status: data.status,
        reviewNotes: data.reviewNotes || null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        achievedValue,
        achievedRank,
      },
      include: {
        athlete: { select: { id: true, displayName: true } },
        challenge: { select: { id: true, name: true, slug: true } },
      },
    });

    // If approved, award XP
    if (data.status === "APPROVED" && achievedRank) {
      await processXPAward(
        {
          id: updatedSubmission.id,
          achievedRank,
          claimedTiers: submission.claimedTiers,
          athleteId: submission.athlete.id,
        },
        submission.challenge
      );
    }

    return NextResponse.json({
      submission: updatedSubmission,
      message: getReviewMessage(data.status),
    });
  } catch (error) {
    console.error("Error reviewing submission:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid review data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to review submission" },
      { status: 500 }
    );
  }
}

function getReviewMessage(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Submission approved! XP has been awarded.";
    case "REJECTED":
      return "Submission rejected.";
    case "NEEDS_REVISION":
      return "Revision requested. The athlete will be notified.";
    default:
      return "Review recorded.";
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

function calculateAchievedRankFromGrades(
  achievedValue: number,
  grades: Array<{ rank: string; targetValue: number }>,
  gradingType: string
): string | null {
  if (!grades.length) return null;

  const isLowerBetter = gradingType === "TIME";
  const sortedGrades = [...grades].sort((a, b) =>
    isLowerBetter ? b.targetValue - a.targetValue : a.targetValue - b.targetValue
  );

  let achievedRank: string | null = null;
  for (const grade of sortedGrades) {
    const meetsTarget = isLowerBetter
      ? achievedValue <= grade.targetValue
      : achievedValue >= grade.targetValue;
    if (meetsTarget) {
      achievedRank = grade.rank;
    }
  }

  return achievedRank;
}

async function processXPAward(
  submission: { id: string; achievedRank: string; claimedTiers: string; athleteId: string },
  challenge: {
    minRank: string;
    primaryDomainId: string;
    primaryXPPercent: number;
    secondaryDomainId: string | null;
    secondaryXPPercent: number | null;
    tertiaryDomainId: string | null;
    tertiaryXPPercent: number | null;
  }
) {
  const achievedRank = submission.achievedRank as Rank;
  const minRank = challenge.minRank as Rank;

  const alreadyClaimed = new Set(submission.claimedTiers.split(",").filter(Boolean));
  const ranks: Rank[] = ["F", "E", "D", "C", "B", "A", "S"];
  const minIndex = ranks.indexOf(minRank);
  const achievedIndex = ranks.indexOf(achievedRank);
  
  const newTiers: Rank[] = [];
  for (let i = minIndex; i <= achievedIndex; i++) {
    if (!alreadyClaimed.has(ranks[i])) {
      newTiers.push(ranks[i]);
    }
  }

  if (newTiers.length === 0) return;

  const baseXP = newTiers.reduce((sum, tier) => sum + XP_PER_TIER[tier], 0);

  const xpDistribution: Array<{ domainId: string; amount: number }> = [];

  const primaryXP = Math.round(baseXP * (challenge.primaryXPPercent / 100));
  xpDistribution.push({ domainId: challenge.primaryDomainId, amount: primaryXP });

  if (challenge.secondaryDomainId && challenge.secondaryXPPercent) {
    const secondaryXP = Math.round(baseXP * (challenge.secondaryXPPercent / 100));
    xpDistribution.push({ domainId: challenge.secondaryDomainId, amount: secondaryXP });
  }

  if (challenge.tertiaryDomainId && challenge.tertiaryXPPercent) {
    const tertiaryXP = Math.round(baseXP * (challenge.tertiaryXPPercent / 100));
    xpDistribution.push({ domainId: challenge.tertiaryDomainId, amount: tertiaryXP });
  }

  for (const { domainId, amount } of xpDistribution) {
    await awardXP({
      athleteId: submission.athleteId,
      domainId,
      amount,
      source: "CHALLENGE",
      sourceId: submission.id,
      note: `Completed ${newTiers.join(",")} tier(s)`,
    });
  }

  const updatedClaimed = [...alreadyClaimed, ...newTiers];
  await db.challengeSubmission.update({
    where: { id: submission.id },
    data: {
      claimedTiers: ranks.filter(r => updatedClaimed.includes(r)).join(","),
      xpAwarded: { increment: baseXP },
    },
  });
}
