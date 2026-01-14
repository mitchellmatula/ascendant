/**
 * Submission Review Permission Logic
 * 
 * Who can review a submission:
 * 1. SYSTEM_ADMIN - can review anything
 * 2. GYM_ADMIN - can review anything  
 * 3. COACH - can review anything
 * 4. Athletes - can review if they are:
 *    - At least 1 tier HIGHER than the achieved tier in the PRIMARY domain
 *    - OR same tier (S-rank reviewing S-rank) if both are S-rank
 * 
 * Example: If someone submits a C-tier attempt on a Strength challenge,
 * a reviewer needs to be at least B-rank (or higher) in Strength to review it.
 */

import { db } from "./db";
import { RANK_INDEX, type Rank, toNumericLevel } from "./levels";
import type { Role } from "../../prisma/generated/prisma/client";

/**
 * Check if a user/athlete can review a specific submission
 */
export async function canReviewSubmission(params: {
  reviewerUserId: string;
  reviewerRole: Role;
  submissionId: string;
}): Promise<{ canReview: boolean; reason?: string }> {
  const { reviewerUserId, reviewerRole, submissionId } = params;

  // First, check if the user is banned from reviewing
  const reviewerUser = await db.user.findUnique({
    where: { id: reviewerUserId },
    select: { canReview: true, reviewBannedAt: true, suspendedAt: true },
  });

  if (!reviewerUser) {
    return { canReview: false, reason: "User not found" };
  }

  // Suspended users can't review
  if (reviewerUser.suspendedAt) {
    return { canReview: false, reason: "Your account is suspended" };
  }

  // Check review ban (admins/coaches bypass this)
  if (!reviewerUser.canReview && !["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(reviewerRole)) {
    return { canReview: false, reason: "Your review privileges have been revoked" };
  }

  // Admins and coaches can always review
  if (["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(reviewerRole)) {
    return { canReview: true };
  }

  // Get the submission with challenge and athlete info
  const submission = await db.challengeSubmission.findUnique({
    where: { id: submissionId },
    include: {
      challenge: {
        select: { primaryDomainId: true, name: true },
      },
      athlete: {
        select: { id: true, userId: true, parentId: true },
      },
    },
  });

  if (!submission) {
    return { canReview: false, reason: "Submission not found" };
  }

  // Can't review your own submission (or your child's)
  if (submission.athlete.userId === reviewerUserId || submission.athlete.parentId === reviewerUserId) {
    return { canReview: false, reason: "Cannot review your own submission" };
  }

  // Get reviewer's athlete profile and their level in the primary domain
  const reviewerAthlete = await db.athlete.findFirst({
    where: {
      OR: [
        { userId: reviewerUserId },
        // If reviewer is a parent, they might have their own athlete profile
      ],
    },
    include: {
      domainLevels: {
        where: { domainId: submission.challenge.primaryDomainId },
      },
    },
  });

  if (!reviewerAthlete) {
    return { canReview: false, reason: "You must have an athlete profile to review" };
  }

  // Check age requirement - must be 18+ to review
  const age = calculateAge(reviewerAthlete.dateOfBirth);
  if (age < 18) {
    return { canReview: false, reason: "You must be 18 or older to review submissions" };
  }

  // Get the achieved tier of the submission
  const submissionTier = submission.achievedRank as Rank | null;
  
  // If submission hasn't been graded yet, use the challenge's minRank as baseline
  // For PASS_FAIL challenges without achievedRank, use the submission's potential tier
  const tierToCheck = submissionTier || "F";

  // Get reviewer's level in the relevant domain
  const reviewerLevel = reviewerAthlete.domainLevels[0];
  const reviewerRank = (reviewerLevel?.letter || "F") as Rank;
  const reviewerSublevel = reviewerLevel?.sublevel || 0;

  // Calculate if reviewer is qualified
  const submissionRankIndex = RANK_INDEX[tierToCheck];
  const reviewerRankIndex = RANK_INDEX[reviewerRank];

  // S-rank can review S-rank (same tier allowed at max)
  if (tierToCheck === "S" && reviewerRank === "S") {
    return { canReview: true };
  }

  // Otherwise, reviewer must be at least 1 full tier higher
  if (reviewerRankIndex > submissionRankIndex) {
    return { canReview: true };
  }

  // If same rank, check sublevel - must be higher
  if (reviewerRankIndex === submissionRankIndex && reviewerSublevel > 0) {
    // For non-S ranks, being in the same rank with any sublevel doesn't count
    // You need to be a FULL tier higher
    return { 
      canReview: false, 
      reason: `You need to be ${getNextRankName(tierToCheck)}-rank or higher in this domain to review` 
    };
  }

  return { 
    canReview: false, 
    reason: `You need to be ${getNextRankName(tierToCheck)}-rank or higher in this domain to review` 
  };
}

function getNextRankName(rank: Rank): string {
  const ranks: Rank[] = ["F", "E", "D", "C", "B", "A", "S"];
  const index = ranks.indexOf(rank);
  if (index >= ranks.length - 1) return "S";
  return ranks[index + 1];
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get submissions that a reviewer is qualified to review
 */
export async function getReviewableSubmissions(params: {
  reviewerUserId: string;
  reviewerRole: Role;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  page?: number;
  limit?: number;
}): Promise<{
  submissions: Awaited<ReturnType<typeof getSubmissionWithDetails>>[];
  total: number;
  page: number;
  totalPages: number;
  reviewBanned?: boolean;
}> {
  const { reviewerUserId, reviewerRole, status = "PENDING", page = 1, limit = 20 } = params;

  // Check if user can review at all
  const reviewerUser = await db.user.findUnique({
    where: { id: reviewerUserId },
    select: { canReview: true, suspendedAt: true },
  });

  // If user is banned from reviewing (and not admin/coach), return empty
  const isPrivileged = ["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(reviewerRole);
  if (reviewerUser && (!reviewerUser.canReview || reviewerUser.suspendedAt) && !isPrivileged) {
    return { 
      submissions: [], 
      total: 0, 
      page: 1, 
      totalPages: 0,
      reviewBanned: !reviewerUser.canReview,
    };
  }

  // Admins and coaches can see all submissions
  if (isPrivileged) {
    const where = status === "PENDING" ? { status: "PENDING" as const } : {};
    
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
              primaryDomainId: true,
              primaryDomain: { select: { name: true, icon: true, color: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.challengeSubmission.count({ where }),
    ]);

    return {
      submissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // For athletes, we need to filter based on their domain levels
  const reviewerAthlete = await db.athlete.findFirst({
    where: { userId: reviewerUserId },
    include: { domainLevels: true },
  });

  if (!reviewerAthlete) {
    return { submissions: [], total: 0, page: 1, totalPages: 0 };
  }

  // Check age requirement - must be 18+ to review
  const age = calculateAge(reviewerAthlete.dateOfBirth);
  if (age < 18) {
    return { submissions: [], total: 0, page: 1, totalPages: 0 };
  }

  // Build a map of reviewer's rank per domain
  const reviewerLevels = new Map<string, { letter: string; sublevel: number }>();
  for (const level of reviewerAthlete.domainLevels) {
    reviewerLevels.set(level.domainId, { letter: level.letter, sublevel: level.sublevel });
  }

  // Get all pending submissions (we'll filter in memory for complex logic)
  const allPending = await db.challengeSubmission.findMany({
    where: {
      status: status as "PENDING",
      // Exclude own submissions
      athlete: {
        userId: { not: reviewerUserId },
        parentId: { not: reviewerUserId },
      },
    },
    include: {
      athlete: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          userId: true,
          parentId: true,
        },
      },
      challenge: {
        select: {
          id: true,
          name: true,
          slug: true,
          gradingType: true,
          gradingUnit: true,
          primaryDomainId: true,
          primaryDomain: { select: { name: true, icon: true, color: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Filter based on tier requirements
  const reviewable = allPending.filter((sub) => {
    const domainId = sub.challenge.primaryDomainId;
    const reviewerLevel = reviewerLevels.get(domainId) || { letter: "F", sublevel: 0 };
    const submissionTier = (sub.achievedRank || "F") as Rank;
    const reviewerRank = reviewerLevel.letter as Rank;

    const submissionRankIndex = RANK_INDEX[submissionTier];
    const reviewerRankIndex = RANK_INDEX[reviewerRank];

    // S-rank can review S-rank
    if (submissionTier === "S" && reviewerRank === "S") {
      return true;
    }

    // Must be at least 1 full tier higher
    return reviewerRankIndex > submissionRankIndex;
  });

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedSubmissions = reviewable.slice(startIndex, startIndex + limit);

  return {
    submissions: paginatedSubmissions,
    total: reviewable.length,
    page,
    totalPages: Math.ceil(reviewable.length / limit),
  };
}

async function getSubmissionWithDetails(submissionId: string) {
  return db.challengeSubmission.findUnique({
    where: { id: submissionId },
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
          primaryDomainId: true,
          primaryDomain: { select: { name: true, icon: true, color: true } },
        },
      },
    },
  });
}
