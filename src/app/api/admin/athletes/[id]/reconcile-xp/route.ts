import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { XP_PER_TIER } from "@/lib/xp-constants";
import type { Rank } from "@/lib/levels";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// XP calculation constants
const XP_PER_SUBLEVEL: Record<string, number> = {
  F: 100, E: 200, D: 400, C: 800, B: 1600, A: 3200, S: 6400,
};
const CUMULATIVE_XP_TO_RANK: Record<string, number> = {
  F: 0, E: 1000, D: 3000, C: 7000, B: 15000, A: 31000, S: 63000,
};
const RANKS = ["F", "E", "D", "C", "B", "A", "S"];

/**
 * Calculate level from total XP
 */
function calculateLevelFromXP(totalXP: number): { letter: string; sublevel: number } {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const rank = RANKS[i];
    if (totalXP >= CUMULATIVE_XP_TO_RANK[rank]) {
      const xpIntoRank = totalXP - CUMULATIVE_XP_TO_RANK[rank];
      const sublevel = Math.min(9, Math.floor(xpIntoRank / XP_PER_SUBLEVEL[rank]));
      return { letter: rank, sublevel };
    }
  }
  return { letter: "F", sublevel: 0 };
}

/**
 * POST /api/admin/athletes/[id]/reconcile-xp
 * Recalculate an athlete's XP from their approved submissions
 * Admin only
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: athleteId } = await params;
    const user = await getCurrentUser();

    if (!user || !["SYSTEM_ADMIN", "GYM_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the athlete
    const athlete = await db.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true, displayName: true },
    });

    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }

    // Get all approved submissions for this athlete
    const submissions = await db.challengeSubmission.findMany({
      where: {
        athleteId,
        status: "APPROVED",
        xpAwarded: { gt: 0 },
      },
      select: {
        id: true,
        xpAwarded: true,
        claimedTiers: true,
        challenge: {
          select: {
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

    // Calculate XP per domain from submissions
    const domainXP: Record<string, number> = {};

    for (const submission of submissions) {
      const challenge = submission.challenge;
      const totalXP = submission.xpAwarded;

      if (challenge.primaryDomainId) {
        const primaryXP = Math.round(totalXP * (challenge.primaryXPPercent / 100));
        domainXP[challenge.primaryDomainId] = (domainXP[challenge.primaryDomainId] || 0) + primaryXP;
      }

      if (challenge.secondaryDomainId && challenge.secondaryXPPercent) {
        const secondaryXP = Math.round(totalXP * (challenge.secondaryXPPercent / 100));
        domainXP[challenge.secondaryDomainId] = (domainXP[challenge.secondaryDomainId] || 0) + secondaryXP;
      }

      if (challenge.tertiaryDomainId && challenge.tertiaryXPPercent) {
        const tertiaryXP = Math.round(totalXP * (challenge.tertiaryXPPercent / 100));
        domainXP[challenge.tertiaryDomainId] = (domainXP[challenge.tertiaryDomainId] || 0) + tertiaryXP;
      }
    }

    // Get all domains
    const domains = await db.domain.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const changes: Array<{
      domain: string;
      oldXP: number;
      newXP: number;
      oldLevel: string;
      newLevel: string;
    }> = [];

    // Update or reset each domain level
    for (const domain of domains) {
      const expectedXP = domainXP[domain.id] || 0;
      const { letter, sublevel } = calculateLevelFromXP(expectedXP);

      // Get current domain level
      const currentLevel = await db.domainLevel.findUnique({
        where: {
          athleteId_domainId: {
            athleteId,
            domainId: domain.id,
          },
        },
      });

      if (currentLevel) {
        // Update if different
        if (currentLevel.currentXP !== expectedXP) {
          changes.push({
            domain: domain.name,
            oldXP: currentLevel.currentXP,
            newXP: expectedXP,
            oldLevel: `${currentLevel.letter}${currentLevel.sublevel}`,
            newLevel: `${letter}${sublevel}`,
          });

          await db.domainLevel.update({
            where: { id: currentLevel.id },
            data: {
              currentXP: expectedXP,
              letter,
              sublevel,
              bankedXP: 0,
              breakthroughReady: false,
            },
          });
        }
      } else if (expectedXP > 0) {
        // Create new domain level if XP > 0
        changes.push({
          domain: domain.name,
          oldXP: 0,
          newXP: expectedXP,
          oldLevel: "F0",
          newLevel: `${letter}${sublevel}`,
        });

        await db.domainLevel.create({
          data: {
            athleteId,
            domainId: domain.id,
            currentXP: expectedXP,
            letter,
            sublevel,
            bankedXP: 0,
            breakthroughReady: false,
          },
        });
      }
    }

    // Delete domain levels with 0 XP that shouldn't exist
    const domainIdsWithXP = Object.keys(domainXP);
    if (domainIdsWithXP.length === 0) {
      // No submissions = delete all domain levels
      await db.domainLevel.deleteMany({
        where: { athleteId },
      });
    }

    // Also reconcile XP transactions - delete any that don't match submissions
    const submissionIds = submissions.map(s => s.id);
    await db.xPTransaction.deleteMany({
      where: {
        athleteId,
        source: "CHALLENGE",
        sourceId: submissionIds.length > 0 ? { notIn: submissionIds } : undefined,
      },
    });

    // If no submissions, delete all challenge XP transactions
    if (submissionIds.length === 0) {
      await db.xPTransaction.deleteMany({
        where: {
          athleteId,
          source: "CHALLENGE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      athlete: athlete.displayName,
      submissionsFound: submissions.length,
      changes,
      message: changes.length > 0 
        ? `Reconciled ${changes.length} domain(s)` 
        : "No changes needed - XP already accurate",
    });
  } catch (error) {
    console.error("Error reconciling XP:", error);
    return NextResponse.json(
      { error: "Failed to reconcile XP" },
      { status: 500 }
    );
  }
}
