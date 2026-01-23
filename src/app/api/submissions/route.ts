import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canAutoApprove } from "@/lib/auth";
import { createSubmissionSchema, submissionQuerySchema } from "@/lib/validators/submission";
import { calculateSubmissionXP, awardXP, XP_PER_TIER } from "@/lib/xp";
import { toNumericLevel } from "@/lib/levels";
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

    // Rate limit: One submission per challenge per day (unless admin/coach)
    const isPrivileged = ["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(user.role);
    if (existingSubmission && !isPrivileged) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (existingSubmission.submittedAt > oneDayAgo) {
        const hoursRemaining = Math.ceil(
          (existingSubmission.submittedAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)
        );
        return NextResponse.json(
          { 
            error: `You can only submit once per day per challenge. Try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}.`,
            retryAfter: hoursRemaining,
          },
          { status: 429 }
        );
      }
    }

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
      activityPolyline: data.activityPolyline || null,
      // Privacy settings
      isPublic: data.isPublic ?? true,
      hideExactValue: data.hideExactValue ?? false,
      // Manual entry supervisor
      supervisorId: data.supervisorId || null,
      supervisorName: data.supervisorName || null,
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

      // If auto-approved, award XP and get celebration data
      let celebration: CelebrationData | null = null;
      if (autoApproved && updated.achievedRank) {
        celebration = await processXPAward(updated, challenge, athlete);
      }

      return NextResponse.json({
        submission: updated,
        message: "Submission updated",
        isResubmission: true,
        celebration,
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

    // If auto-approved, award XP and get celebration data
    let celebration: CelebrationData | null = null;
    if (autoApproved && submission.achievedRank) {
      celebration = await processXPAward(submission, challenge, athlete);
    }

    return NextResponse.json({
      submission,
      message: autoApproved ? "Submission approved automatically" : "Submission pending review",
      isResubmission: false,
      celebration,
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
// Returns celebration data for the client
interface CelebrationData {
  tierAchievement: {
    tier: Rank;
    challengeName: string;
    xpBreakdown: Array<{ domainName: string; xp: number; domainIcon?: string }>;
    totalXp: number;
    isNewBest: boolean;
  } | null;
  levelUps: Array<{
    previousLevel: number;
    newLevel: number;
    domainName: string;
    domainIcon?: string;
    xpGained: number;
  }>;
}

async function processXPAward(
  submission: { id: string; achievedRank: string | null; claimedTiers: string; athleteId: string },
  challenge: {
    name: string;
    minRank: string;
    primaryDomainId: string;
    primaryXPPercent: number;
    secondaryDomainId: string | null;
    secondaryXPPercent: number | null;
    tertiaryDomainId: string | null;
    tertiaryXPPercent: number | null;
    primaryDomain: { name: string; icon: string | null };
    secondaryDomain: { name: string; icon: string | null } | null;
    tertiaryDomain: { name: string; icon: string | null } | null;
  },
  athlete: { id: string }
): Promise<CelebrationData> {
  const result: CelebrationData = {
    tierAchievement: null,
    levelUps: [],
  };

  if (!submission.achievedRank) return result;

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

  if (newTiers.length === 0) return result;

  // Calculate total XP for new tiers
  const baseXP = newTiers.reduce((sum, tier) => sum + XP_PER_TIER[tier], 0);

  // Distribute XP across domains
  const xpDistribution: Array<{ domainId: string; amount: number; domainName: string; domainIcon?: string }> = [];

  const primaryXP = Math.round(baseXP * (challenge.primaryXPPercent / 100));
  xpDistribution.push({ 
    domainId: challenge.primaryDomainId, 
    amount: primaryXP,
    domainName: challenge.primaryDomain.name,
    domainIcon: challenge.primaryDomain.icon ?? undefined,
  });

  if (challenge.secondaryDomainId && challenge.secondaryXPPercent && challenge.secondaryDomain) {
    const secondaryXP = Math.round(baseXP * (challenge.secondaryXPPercent / 100));
    xpDistribution.push({ 
      domainId: challenge.secondaryDomainId, 
      amount: secondaryXP,
      domainName: challenge.secondaryDomain.name,
      domainIcon: challenge.secondaryDomain.icon ?? undefined,
    });
  }

  if (challenge.tertiaryDomainId && challenge.tertiaryXPPercent && challenge.tertiaryDomain) {
    const tertiaryXP = Math.round(baseXP * (challenge.tertiaryXPPercent / 100));
    xpDistribution.push({ 
      domainId: challenge.tertiaryDomainId, 
      amount: tertiaryXP,
      domainName: challenge.tertiaryDomain.name,
      domainIcon: challenge.tertiaryDomain.icon ?? undefined,
    });
  }

  // Award XP for each domain and track level ups
  const levelUpInfoForDb: Array<{
    domainName: string;
    domainSlug: string;
    domainColor: string | null;
    oldLetter: string;
    oldSublevel: number;
    newLetter: string;
    newSublevel: number;
  }> = [];
  
  for (const { domainId, amount, domainName, domainIcon } of xpDistribution) {
    // Get domain color and slug for feed display
    const domain = await db.domain.findUnique({
      where: { id: domainId },
      select: { color: true, slug: true },
    });
    
    const xpResult = await awardXP({
      athleteId: athlete.id,
      domainId,
      amount,
      source: "CHALLENGE",
      sourceId: submission.id,
      note: `Completed ${newTiers.join(",")} tier(s)`,
    });

    // Check for level up
    if (xpResult.leveledUp) {
      const previousNumeric = toNumericLevel(
        xpResult.previousLevel.letter as Rank,
        xpResult.previousLevel.sublevel
      );
      const newNumeric = toNumericLevel(
        xpResult.newLevel.letter as Rank,
        xpResult.newLevel.sublevel
      );

      result.levelUps.push({
        previousLevel: previousNumeric,
        newLevel: newNumeric,
        domainName,
        domainIcon,
        xpGained: amount,
      });
      
      // Store for database
      levelUpInfoForDb.push({
        domainName,
        domainSlug: domain?.slug ?? domainName.toLowerCase(),
        domainColor: domain?.color ?? null,
        oldLetter: xpResult.previousLevel.letter,
        oldSublevel: xpResult.previousLevel.sublevel,
        newLetter: xpResult.newLevel.letter,
        newSublevel: xpResult.newLevel.sublevel,
      });
    }
  }

  // Build tier achievement data
  const highestNewTier = newTiers[newTiers.length - 1];
  const isNewBest = alreadyClaimed.size === 0; // First time earning any tier

  result.tierAchievement = {
    tier: highestNewTier,
    challengeName: challenge.name,
    xpBreakdown: xpDistribution.map(({ domainName, amount, domainIcon }) => ({
      domainName,
      xp: amount,
      domainIcon,
    })),
    totalXp: baseXP,
    isNewBest,
  };

  // Update claimed tiers and XP on submission
  const updatedClaimed = [...alreadyClaimed, ...newTiers];
  await db.challengeSubmission.update({
    where: { id: submission.id },
    data: {
      claimedTiers: ranks.filter(r => updatedClaimed.includes(r)).join(","),
      xpAwarded: { increment: baseXP },
      // Store level up info for feed display
      ...(levelUpInfoForDb.length > 0 ? { levelUpInfo: levelUpInfoForDb } : {}),
    },
  });

  return result;
}
