import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canAutoApprove } from "@/lib/auth";
import { createSubmissionSchema, submissionQuerySchema } from "@/lib/validators/submission";
import { calculateSubmissionXP, awardXP, XP_PER_TIER } from "@/lib/xp";
import type { Rank } from "@/lib/levels";

/**
 * GET /api/submissions
 * Get submissions - can filter by athlete, challenge, status
 * Anyone can view approved submissions (public feed)
 * Athletes can see their own submissions in any status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    
    const query = submissionQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      athleteId: searchParams.get("athleteId") || undefined,
      challengeId: searchParams.get("challengeId") || undefined,
      domainId: searchParams.get("domainId") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    const { status, athleteId, challengeId, domainId, page, limit } = query;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // If requesting a specific athlete's submissions
    if (athleteId) {
      where.athleteId = athleteId;
      
      // Check if the current user owns this athlete or is admin
      const isOwnAthlete = user?.athlete?.id === athleteId || 
        user?.managedAthletes.some(a => a.id === athleteId);
      const isAdminOrCoach = user && ["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(user.role);
      
      // If not own athlete and not admin, only show approved
      if (!isOwnAthlete && !isAdminOrCoach) {
        where.status = "APPROVED";
        where.isPublic = true; // Respect privacy for non-owners
      } else if (status && status !== "ALL") {
        where.status = status;
      }
    } else {
      // Public feed - only approved and public submissions
      where.status = "APPROVED";
      where.isPublic = true;
    }

    if (challengeId) {
      where.challengeId = challengeId;
    }

    if (domainId) {
      where.challenge = {
        primaryDomainId: domainId,
      };
    }

    const [submissions, total] = await Promise.all([
      db.challengeSubmission.findMany({
        where,
        include: {
          athlete: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          challenge: {
            select: {
              id: true,
              name: true,
              slug: true,
              gradingType: true,
              gradingUnit: true,
              demoImageUrl: true,
              primaryDomain: {
                select: { id: true, name: true, icon: true, color: true },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.challengeSubmission.count({ where }),
    ]);

    // Determine if we need to apply privacy transformations
    // (when viewing someone else's submissions)
    const isOwnData = athleteId && (
      user?.athlete?.id === athleteId ||
      user?.managedAthletes.some(a => a.id === athleteId)
    );
    const isAdminOrCoach = user && ["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(user.role);
    const canSeePrivateData = isOwnData || isAdminOrCoach;

    // Transform submissions to hide achievedValue if hideExactValue is true
    const transformedSubmissions = submissions.map(submission => {
      if (canSeePrivateData || !submission.hideExactValue) {
        return submission;
      }
      // Hide the exact value but keep the rank
      return {
        ...submission,
        achievedValue: null,
        activityTime: null,
        activityDistance: null,
      };
    });

    return NextResponse.json({
      submissions: transformedSubmissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/submissions
 * Create a new submission for a challenge
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createSubmissionSchema.parse(body);

    // If athleteId not provided, use user's own athlete or first managed athlete
    let athleteId = data.athleteId;
    if (!athleteId) {
      athleteId = user.athlete?.id || user.managedAthletes[0]?.id;
      if (!athleteId) {
        return NextResponse.json(
          { error: "No athlete profile found" },
          { status: 400 }
        );
      }
    }

    // Verify the athlete belongs to this user (or is managed by them)
    const athlete = await db.athlete.findFirst({
      where: {
        id: athleteId,
        OR: [
          { userId: user.id },
          { parentId: user.id },
        ],
      },
      include: {
        domainLevels: true,
      },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "You can only submit for yourself or your managed athletes" },
        { status: 403 }
      );
    }

    // Get the challenge with grades
    const challenge = await db.challenge.findUnique({
      where: { id: data.challengeId },
      include: {
        grades: true,
        primaryDomain: true,
        secondaryDomain: true,
        tertiaryDomain: true,
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (!challenge.isActive) {
      return NextResponse.json({ error: "This challenge is no longer active" }, { status: 400 });
    }

    // Validate that the proof type is allowed for this challenge
    if (!challenge.proofTypes.includes(data.proofType)) {
      return NextResponse.json(
        { error: `Proof type ${data.proofType} is not allowed for this challenge` },
        { status: 400 }
      );
    }

    // Check if athlete already has a submission for this challenge
    const existingSubmission = await db.challengeSubmission.findUnique({
      where: {
        athleteId_challengeId: {
          athleteId: athlete.id,
          challengeId: data.challengeId,
        },
      },
      include: { history: true },
    });

    // Determine if auto-approved (coaches/admins)
    const autoApproved = canAutoApprove(user.role);

    // Calculate achieved rank if achievedValue is provided
    let achievedRank: string | null = null;
    if (data.achievedValue && challenge.grades.length > 0) {
      // Get athlete's division
      const division = await db.division.findFirst({
        where: {
          isActive: true,
          gender: athlete.gender ?? undefined,
          ageMin: { lte: calculateAge(athlete.dateOfBirth) },
          ageMax: { gte: calculateAge(athlete.dateOfBirth) },
        },
      });

      if (division) {
        const divisionGrades = challenge.grades.filter(g => g.divisionId === division.id);
        achievedRank = calculateAchievedRankFromGrades(
          data.achievedValue,
          divisionGrades,
          challenge.gradingType
        );
      }
    }

    // Build the submission data object
    const submissionData = {
      videoUrl: data.videoUrl || null,
      imageUrl: data.imageUrl || null,
      notes: data.notes || null,
      achievedValue: data.achievedValue || null,
      achievedRank,
      proofType: data.proofType as "VIDEO" | "IMAGE" | "STRAVA" | "GARMIN" | "RACE_RESULT" | "MANUAL",
      // Strava activity data
      stravaActivityId: data.stravaActivityId || null,
      stravaActivityUrl: data.stravaActivityUrl || null,
      // Garmin activity data
      garminActivityId: data.garminActivityId || null,
      garminActivityUrl: data.garminActivityUrl || null,
      // Cached activity metrics
      activityDistance: data.activityDistance || null,
      activityTime: data.activityTime || null,
      activityElevation: data.activityElevation || null,
      activityDate: data.activityDate ? new Date(data.activityDate) : null,
      activityType: data.activityType || null,
      activityAvgHR: data.activityAvgHR || null,
      activityMaxHR: data.activityMaxHR || null,
      // Privacy settings
      isPublic: data.isPublic ?? true,
      hideExactValue: data.hideExactValue ?? false,
      status: autoApproved ? "APPROVED" as const : "PENDING" as const,
      autoApproved,
    };

    if (existingSubmission) {
      // Archive old submission to history
      await db.submissionHistory.create({
        data: {
          submissionId: existingSubmission.id,
          videoUrl: existingSubmission.videoUrl,
          imageUrl: existingSubmission.imageUrl,
          notes: existingSubmission.notes,
          status: existingSubmission.status,
          reviewedBy: existingSubmission.reviewedBy,
          reviewNotes: existingSubmission.reviewNotes,
          submittedAt: existingSubmission.submittedAt,
          reviewedAt: existingSubmission.reviewedAt,
          version: existingSubmission.history.length + 1,
        },
      });

      // Update the submission (resubmission)
      const updated = await db.challengeSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          ...submissionData,
          submittedAt: new Date(),
          reviewedAt: autoApproved ? new Date() : null,
          reviewedBy: autoApproved ? user.id : null,
          reviewNotes: null,
        },
        include: {
          athlete: { select: { id: true, displayName: true } },
          challenge: { select: { id: true, name: true, slug: true } },
        },
      });

      // If auto-approved, award XP
      if (autoApproved && updated.achievedRank) {
        await processXPAward(updated, challenge, athlete);
      }

      return NextResponse.json({
        submission: updated,
        message: "Submission updated",
        isResubmission: true,
      });
    }

    // Create new submission
    const submission = await db.challengeSubmission.create({
      data: {
        athleteId: athlete.id,
        challengeId: data.challengeId,
        submittedById: user.id,
        ...submissionData,
        reviewedAt: autoApproved ? new Date() : null,
        reviewedBy: autoApproved ? user.id : null,
      },
      include: {
        athlete: { select: { id: true, displayName: true } },
        challenge: { select: { id: true, name: true, slug: true } },
      },
    });

    // If auto-approved, award XP
    if (autoApproved && submission.achievedRank) {
      await processXPAward(submission, challenge, athlete);
    }

    return NextResponse.json({
      submission,
      message: autoApproved ? "Submission approved automatically" : "Submission pending review",
      isResubmission: false,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating submission:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}

// Helper: Calculate age from date of birth
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

// Helper: Calculate achieved rank from grades
function calculateAchievedRankFromGrades(
  achievedValue: number,
  grades: Array<{ rank: string; targetValue: number }>,
  gradingType: string
): string | null {
  if (!grades.length) return null;

  // For TIME, lower is better. For REPS/DISTANCE, higher is better
  const isLowerBetter = gradingType === "TIME";
  
  // Sort grades by target value
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

// Helper: Process XP award after approval
async function processXPAward(
  submission: { id: string; achievedRank: string | null; claimedTiers: string; athleteId: string },
  challenge: {
    minRank: string;
    primaryDomainId: string;
    primaryXPPercent: number;
    secondaryDomainId: string | null;
    secondaryXPPercent: number | null;
    tertiaryDomainId: string | null;
    tertiaryXPPercent: number | null;
  },
  athlete: { id: string }
) {
  if (!submission.achievedRank) return;

  const achievedRank = submission.achievedRank as Rank;
  const minRank = challenge.minRank as Rank;

  // Get tiers to claim (those not yet claimed)
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

  // Calculate total XP for new tiers
  const baseXP = newTiers.reduce((sum, tier) => sum + XP_PER_TIER[tier], 0);

  // Distribute XP across domains
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

  // Award XP for each domain
  for (const { domainId, amount } of xpDistribution) {
    await awardXP({
      athleteId: athlete.id,
      domainId,
      amount,
      source: "CHALLENGE",
      sourceId: submission.id,
      note: `Completed ${newTiers.join(",")} tier(s)`,
    });
  }

  // Update claimed tiers and XP on submission
  const updatedClaimed = [...alreadyClaimed, ...newTiers];
  await db.challengeSubmission.update({
    where: { id: submission.id },
    data: {
      claimedTiers: ranks.filter(r => updatedClaimed.includes(r)).join(","),
      xpAwarded: { increment: baseXP },
    },
  });
}
