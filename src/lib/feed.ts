import { db } from "./db";
import { SubmissionStatus, FeedVisibility } from "../../prisma/generated/prisma/client";

// ============================================
// FEED ITEM TYPES
// ============================================

export type FeedItemType = "submission" | "level_up";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  createdAt: Date;
  
  // Athlete info
  athlete: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    // Current rank info (Prime level)
    primeLevel?: {
      letter: string;
      sublevel: number;
    };
    // Whether current user is following this athlete
    isFollowing?: boolean;
  };
  
  // For submission type
  submission?: {
    id: string;
    challengeSlug: string;
    challengeName: string;
    videoUrl: string | null;
    imageUrl: string | null;
    achievedTier: string | null;
    achievedValue: number | null;
    gradingType: string | null;
    gradingUnit: string | null;
    notes: string | null;
    xpAwarded: number;
    isPublic: boolean;
    claimedTiersCount: number; // How many tiers were claimed (for "earned X ranks")
    
    // Strava/activity data for route maps
    activityType: string | null;
    activityPolyline: string | null;
    stravaActivityUrl: string | null;
    
    // Level up info (if this submission caused a level up)
    levelUp?: {
      domainName: string;
      domainColor: string | null;
      oldLetter: string;
      oldSublevel: number;
      newLetter: string;
      newSublevel: number;
    };
    
    // Engagement counts
    reactionCounts: Record<string, number>; // { "🔥": 5, "💪": 3, ... }
    commentCount: number;
    
    // Who reacted with each emoji
    reactors: Record<string, Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    }>>;
    
    // Current user's reactions (for highlighting)
    userReactions?: string[];
  };
  
  // For level_up type (standalone, not from submission)
  levelUp?: {
    domainName: string;
    domainSlug: string;
    domainColor: string | null;
    oldLetter: string;
    oldSublevel: number;
    newLetter: string;
    newSublevel: number;
    xpGained: number;
  };
}

// ============================================
// FEED QUERY OPTIONS
// ============================================

export interface FeedQueryOptions {
  limit?: number;
  cursor?: string; // For pagination
  athleteId?: string; // Current user (for checking their reactions)
}

// ============================================
// VISIBILITY HELPERS
// ============================================

/**
 * Check if an athlete's content should be visible to another athlete
 */
export function isContentVisibleTo(
  contentOwner: {
    feedVisibility: FeedVisibility;
    isMinor: boolean;
  },
  viewerId: string | null,
  isFollowing: boolean
): boolean {
  // Minors with default settings should be private
  if (contentOwner.isMinor && contentOwner.feedVisibility === "PUBLIC") {
    // COPPA: Minors default to FOLLOWERS only in feed even if set to PUBLIC
    return isFollowing;
  }
  
  switch (contentOwner.feedVisibility) {
    case "PUBLIC":
      return true;
    case "FOLLOWERS":
      return isFollowing;
    case "PRIVATE":
      return false;
    default:
      return false;
  }
}

// ============================================
// FEED QUERIES
// ============================================

/**
 * Base query for approved, public submissions with all needed data
 */
const submissionFeedInclude = {
  athlete: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      feedVisibility: true,
      isMinor: true,
      domainLevels: {
        include: {
          domain: { select: { name: true } },
        },
      },
    },
  },
  challenge: {
    select: {
      name: true,
      slug: true,
      gradingType: true,
      gradingUnit: true,
      primaryDomain: { select: { name: true, color: true } },
    },
  },
  reactions: {
    select: {
      emoji: true,
      athleteId: true,
      athlete: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
} as const;

/**
 * Transform a submission record into a feed item
 */
function transformSubmissionToFeedItem(
  submission: any, // Prisma return type is complex
  currentAthleteId?: string,
  followingIds?: Set<string>
): FeedItem {
  // Calculate reaction counts and group reactors
  const reactionCounts: Record<string, number> = {};
  const reactors: Record<string, Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>> = {};
  const userReactions: string[] = [];
  
  for (const reaction of submission.reactions) {
    reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
    
    // Group reactors by emoji
    if (!reactors[reaction.emoji]) {
      reactors[reaction.emoji] = [];
    }
    reactors[reaction.emoji].push({
      id: reaction.athlete.id,
      username: reaction.athlete.username || "unknown",
      displayName: reaction.athlete.displayName,
      avatarUrl: reaction.athlete.avatarUrl,
    });
    
    if (reaction.athleteId === currentAthleteId) {
      userReactions.push(reaction.emoji);
    }
  }
  
  // Calculate Prime level (average of all domains)
  let primeLevel: { letter: string; sublevel: number } | undefined;
  if (submission.athlete.domainLevels.length > 0) {
    const ranks = ["F", "E", "D", "C", "B", "A", "S"];
    let totalNumeric = 0;
    
    for (const dl of submission.athlete.domainLevels) {
      const rankIndex = ranks.indexOf(dl.letter);
      totalNumeric += rankIndex * 10 + dl.sublevel;
    }
    
    const avgNumeric = Math.round(totalNumeric / submission.athlete.domainLevels.length);
    const primeRankIndex = Math.min(Math.floor(avgNumeric / 10), 6);
    const primeSublevel = avgNumeric % 10;
    
    primeLevel = {
      letter: ranks[primeRankIndex],
      sublevel: primeSublevel,
    };
  }
  
  // Count claimed tiers (for achievement story)
  const claimedTiersCount = submission.claimedTiers 
    ? (submission.claimedTiers as string[]).length 
    : 0;
  
  return {
    id: `submission-${submission.id}`,
    type: "submission",
    createdAt: submission.submittedAt,
    athlete: {
      id: submission.athlete.id,
      username: submission.athlete.username || "unknown",
      displayName: submission.athlete.displayName,
      avatarUrl: submission.athlete.avatarUrl,
      primeLevel,
      isFollowing: followingIds ? followingIds.has(submission.athlete.id) : undefined,
    },
    submission: {
      id: submission.id,
      challengeSlug: submission.challenge.slug,
      challengeName: submission.challenge.name,
      videoUrl: submission.videoUrl,
      imageUrl: submission.imageUrl,
      achievedTier: submission.achievedRank,
      achievedValue: submission.achievedValue,
      gradingType: submission.challenge.gradingType,
      gradingUnit: submission.challenge.gradingUnit,
      notes: submission.notes,
      xpAwarded: submission.xpAwarded,
      isPublic: submission.isPublic,
      claimedTiersCount,
      activityType: submission.activityType,
      activityPolyline: submission.activityPolyline,
      stravaActivityUrl: submission.stravaActivityUrl,
      reactionCounts,
      reactors,
      commentCount: submission._count.comments,
      userReactions: currentAthleteId ? userReactions : undefined,
    },
  };
}

/**
 * Get community feed (all public submissions)
 */
export async function getCommunityFeed(options: FeedQueryOptions = {}) {
  const { limit = 20, cursor, athleteId } = options;
  
  // Get list of athletes the current user follows (for follow button state)
  let followingIds: Set<string> = new Set();
  if (athleteId) {
    const following = await db.follow.findMany({
      where: { followerId: athleteId },
      select: { followingId: true },
    });
    followingIds = new Set(following.map((f) => f.followingId));
  }
  
  const submissions = await db.challengeSubmission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      isPublic: true,
      athlete: {
        feedVisibility: "PUBLIC",
        OR: [
          // Non-minors can appear in community feed
          { isMinor: false },
          // Minors can appear if their parent has enabled sharing
          {
            isMinor: true,
            parent: {
              shareChildActivity: true,
            },
          },
        ],
      },
    },
    include: submissionFeedInclude,
    orderBy: { submittedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  
  const hasMore = submissions.length > limit;
  const items = hasMore ? submissions.slice(0, -1) : submissions;
  
  return {
    items: items.map((s) => transformSubmissionToFeedItem(s, athleteId, followingIds)),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

/**
 * Get following feed (submissions from people you follow)
 */
export async function getFollowingFeed(
  currentAthleteId: string,
  options: FeedQueryOptions = {}
) {
  const { limit = 20, cursor } = options;
  
  // Get list of followed athlete IDs
  const following = await db.follow.findMany({
    where: { followerId: currentAthleteId },
    select: { followingId: true },
  });
  
  const followingIds = following.map((f) => f.followingId);
  
  if (followingIds.length === 0) {
    return { items: [], nextCursor: undefined };
  }
  
  const submissions = await db.challengeSubmission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      isPublic: true,
      athleteId: { in: followingIds },
      athlete: {
        feedVisibility: { in: ["PUBLIC", "FOLLOWERS"] },
      },
    },
    include: submissionFeedInclude,
    orderBy: { submittedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  
  const hasMore = submissions.length > limit;
  const items = hasMore ? submissions.slice(0, -1) : submissions;
  
  return {
    items: items.map((s) => transformSubmissionToFeedItem(s, currentAthleteId)),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

/**
 * Get gym feed (submissions from members of your gyms)
 */
export async function getGymFeed(
  userId: string,
  options: FeedQueryOptions = {}
) {
  const { limit = 20, cursor, athleteId } = options;
  
  // Get gym IDs the user is a member of
  const memberships = await db.gymMember.findMany({
    where: { userId, isActive: true },
    select: { gymId: true },
  });
  
  const gymIds = memberships.map((m) => m.gymId);
  
  if (gymIds.length === 0) {
    return { items: [], nextCursor: undefined };
  }
  
  // Get all member user IDs from those gyms
  const gymMembers = await db.gymMember.findMany({
    where: { gymId: { in: gymIds }, isActive: true },
    select: { userId: true },
  });
  
  const memberUserIds = [...new Set(gymMembers.map((m) => m.userId))];
  
  // Get athlete IDs for those users
  const athletes = await db.athlete.findMany({
    where: { userId: { in: memberUserIds } },
    select: { id: true },
  });
  
  const athleteIds = athletes.map((a) => a.id);
  
  if (athleteIds.length === 0) {
    return { items: [], nextCursor: undefined };
  }
  
  const submissions = await db.challengeSubmission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      isPublic: true,
      athleteId: { in: athleteIds },
      athlete: {
        feedVisibility: { in: ["PUBLIC", "FOLLOWERS"] },
      },
    },
    include: submissionFeedInclude,
    orderBy: { submittedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  
  const hasMore = submissions.length > limit;
  const items = hasMore ? submissions.slice(0, -1) : submissions;
  
  return {
    items: items.map((s) => transformSubmissionToFeedItem(s, athleteId)),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

/**
 * Get division feed (submissions from athletes in same division)
 */
export async function getDivisionFeed(
  currentAthleteId: string,
  options: FeedQueryOptions = {}
) {
  const { limit = 20, cursor } = options;
  
  // Get current athlete's division info
  const currentAthlete = await db.athlete.findUnique({
    where: { id: currentAthleteId },
    select: { gender: true, dateOfBirth: true },
  });
  
  if (!currentAthlete) {
    return { items: [], nextCursor: undefined };
  }
  
  // Calculate age
  const today = new Date();
  const birthDate = new Date(currentAthlete.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Find matching division
  const division = await db.division.findFirst({
    where: {
      isActive: true,
      OR: [
        { gender: currentAthlete.gender },
        { gender: null },
      ],
      ageMin: { lte: age },
      ageMax: { gte: age },
    },
  });
  
  if (!division) {
    return { items: [], nextCursor: undefined };
  }
  
  // Get athletes in the same division (same gender, similar age range)
  const sameGenderAthletes = await db.athlete.findMany({
    where: {
      gender: currentAthlete.gender,
      feedVisibility: { in: ["PUBLIC", "FOLLOWERS"] },
      OR: [
        // Non-minors
        { isMinor: false },
        // Minors with parent consent
        {
          isMinor: true,
          parent: {
            shareChildActivity: true,
          },
        },
      ],
    },
    select: { id: true, dateOfBirth: true },
  });
  
  // Filter by age range
  const athleteIdsInDivision = sameGenderAthletes
    .filter((a) => {
      const dob = new Date(a.dateOfBirth);
      let athleteAge = today.getFullYear() - dob.getFullYear();
      const md = today.getMonth() - dob.getMonth();
      if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) {
        athleteAge--;
      }
      return (
        (!division.ageMin || athleteAge >= division.ageMin) &&
        (!division.ageMax || athleteAge <= division.ageMax)
      );
    })
    .map((a) => a.id);
  
  if (athleteIdsInDivision.length === 0) {
    return { items: [], nextCursor: undefined };
  }
  
  const submissions = await db.challengeSubmission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      isPublic: true,
      athleteId: { in: athleteIdsInDivision },
    },
    include: submissionFeedInclude,
    orderBy: { submittedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  
  const hasMore = submissions.length > limit;
  const items = hasMore ? submissions.slice(0, -1) : submissions;
  
  return {
    items: items.map((s) => transformSubmissionToFeedItem(s, currentAthleteId)),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

/**
 * Get a single athlete's activity feed (for their profile)
 */
export async function getAthleteFeed(
  username: string,
  viewerId: string | null,
  options: FeedQueryOptions = {}
) {
  const { limit = 20, cursor } = options;
  
  // Get the athlete
  const athlete = await db.athlete.findUnique({
    where: { username },
    select: {
      id: true,
      feedVisibility: true,
      isMinor: true,
    },
  });
  
  if (!athlete) {
    return { items: [], nextCursor: undefined };
  }
  
  // Check if viewer is following
  let isFollowing = false;
  if (viewerId && viewerId !== athlete.id) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: athlete.id,
        },
      },
    });
    isFollowing = !!follow;
  }
  
  // Check visibility
  const isOwner = viewerId === athlete.id;
  if (!isOwner && !isContentVisibleTo(athlete, viewerId, isFollowing)) {
    return { items: [], nextCursor: undefined, isPrivate: true };
  }
  
  const submissions = await db.challengeSubmission.findMany({
    where: {
      athleteId: athlete.id,
      status: SubmissionStatus.APPROVED,
      // Show private submissions only to owner
      ...(isOwner ? {} : { isPublic: true }),
    },
    include: submissionFeedInclude,
    orderBy: { submittedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  
  const hasMore = submissions.length > limit;
  const items = hasMore ? submissions.slice(0, -1) : submissions;
  
  return {
    items: items.map((s) => transformSubmissionToFeedItem(s, viewerId ?? undefined)),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    isPrivate: false,
  };
}
