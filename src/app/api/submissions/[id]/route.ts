import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canReviewSubmission } from "@/lib/submissions";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/submissions/[id]
 * Get a single submission with full details
 * Anyone can view approved submissions
 * Owners/admins/coaches can view pending submissions
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const submission = await db.challengeSubmission.findUnique({
      where: { id },
      include: {
        athlete: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            userId: true,
            parentId: true,
            domainLevels: {
              select: {
                domainId: true,
                letter: true,
                sublevel: true,
              },
            },
          },
        },
        challenge: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            instructions: true,
            gradingType: true,
            gradingUnit: true,
            demoVideoUrl: true,
            demoImageUrl: true,
            minRank: true,
            maxRank: true,
            primaryDomain: {
              select: { id: true, name: true, icon: true, color: true },
            },
            secondaryDomain: {
              select: { id: true, name: true, icon: true, color: true },
            },
            tertiaryDomain: {
              select: { id: true, name: true, icon: true, color: true },
            },
            grades: {
              select: {
                rank: true,
                targetValue: true,
                description: true,
                division: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        history: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Check access permissions
    const isOwner = user?.athlete?.id === submission.athleteId ||
      user?.managedAthletes.some(a => a.id === submission.athleteId);
    const isAdminOrCoach = user && ["SYSTEM_ADMIN", "GYM_ADMIN", "COACH"].includes(user.role);
    const isApproved = submission.status === "APPROVED";

    // If not approved and not owner/admin, deny access
    if (!isApproved && !isOwner && !isAdminOrCoach) {
      return NextResponse.json(
        { error: "You don't have permission to view this submission" },
        { status: 403 }
      );
    }

    // Check if current user can review this submission
    let canReview = false;
    if (user && submission.status === "PENDING" && !isOwner) {
      const reviewPermission = await canReviewSubmission({
        reviewerUserId: user.id,
        reviewerRole: user.role,
        submissionId: id,
      });
      canReview = reviewPermission.canReview;
    }

    return NextResponse.json({
      submission,
      permissions: {
        isOwner,
        canReview,
        canEdit: isOwner && submission.status !== "APPROVED",
      },
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/submissions/[id]
 * Delete a submission - only owners can delete their own submissions
 * Also reverses any XP that was awarded for this submission
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get submission with full details needed for XP reversal
    const submission = await db.challengeSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        athleteId: true,
        xpAwarded: true,
        claimedTiers: true,
        athlete: {
          select: {
            userId: true,
            parentId: true,
          },
        },
        challenge: {
          select: { 
            slug: true,
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

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Check if user owns this submission (directly or via managed athlete)
    const isOwner = user.athlete?.id === submission.athleteId ||
      user.managedAthletes.some(a => a.id === submission.athleteId);
    const isAdmin = ["SYSTEM_ADMIN", "GYM_ADMIN"].includes(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to delete this submission" },
        { status: 403 }
      );
    }

    // Reverse XP if any was awarded
    if (submission.xpAwarded > 0) {
      const challenge = submission.challenge;
      
      // Calculate how much XP went to each domain
      const xpDistribution: Array<{ domainId: string; amount: number }> = [];
      
      if (challenge.primaryDomainId) {
        const primaryXP = Math.round(submission.xpAwarded * (challenge.primaryXPPercent / 100));
        xpDistribution.push({ domainId: challenge.primaryDomainId, amount: primaryXP });
      }
      
      if (challenge.secondaryDomainId && challenge.secondaryXPPercent) {
        const secondaryXP = Math.round(submission.xpAwarded * (challenge.secondaryXPPercent / 100));
        xpDistribution.push({ domainId: challenge.secondaryDomainId, amount: secondaryXP });
      }
      
      if (challenge.tertiaryDomainId && challenge.tertiaryXPPercent) {
        const tertiaryXP = Math.round(submission.xpAwarded * (challenge.tertiaryXPPercent / 100));
        xpDistribution.push({ domainId: challenge.tertiaryDomainId, amount: tertiaryXP });
      }
      
      // Deduct XP from each domain level
      for (const { domainId, amount } of xpDistribution) {
        const domainLevel = await db.domainLevel.findUnique({
          where: {
            athleteId_domainId: {
              athleteId: submission.athleteId,
              domainId,
            },
          },
        });
        
        if (domainLevel) {
          // Calculate new XP (can't go below 0)
          const newXP = Math.max(0, domainLevel.currentXP - amount);
          
          // Recalculate level from new XP
          const XP_PER_SUBLEVEL: Record<string, number> = {
            F: 100, E: 200, D: 400, C: 800, B: 1600, A: 3200, S: 6400,
          };
          const XP_PER_RANK: Record<string, number> = {
            F: 1000, E: 2000, D: 4000, C: 8000, B: 16000, A: 32000, S: 64000,
          };
          const CUMULATIVE_XP_TO_RANK: Record<string, number> = {
            F: 0, E: 1000, D: 3000, C: 7000, B: 15000, A: 31000, S: 63000,
          };
          const RANKS = ["F", "E", "D", "C", "B", "A", "S"];
          
          // Find which rank we're in with the new XP
          let newLetter = "F";
          let newSublevel = 0;
          
          for (let i = RANKS.length - 1; i >= 0; i--) {
            const rank = RANKS[i];
            if (newXP >= CUMULATIVE_XP_TO_RANK[rank]) {
              newLetter = rank;
              const xpIntoRank = newXP - CUMULATIVE_XP_TO_RANK[rank];
              newSublevel = Math.min(9, Math.floor(xpIntoRank / XP_PER_SUBLEVEL[rank]));
              break;
            }
          }
          
          // Update domain level
          await db.domainLevel.update({
            where: { id: domainLevel.id },
            data: {
              currentXP: newXP,
              letter: newLetter,
              sublevel: newSublevel,
              // Reset breakthrough status if we dropped below max XP for rank
              breakthroughReady: newXP >= XP_PER_RANK[newLetter] && newSublevel === 9,
            },
          });
        }
      }
      
      // Delete XP transactions for this submission
      await db.xPTransaction.deleteMany({
        where: {
          sourceId: submission.id,
          source: "CHALLENGE",
        },
      });
    }

    // Delete the submission (cascade will handle reactions, comments, etc.)
    await db.challengeSubmission.delete({
      where: { id },
    });

    // Revalidate relevant pages
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath(`/challenges/${submission.challenge.slug}`);
    revalidatePath("/my-submissions");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
