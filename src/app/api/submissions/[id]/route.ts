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
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get submission to check ownership
    const submission = await db.challengeSubmission.findUnique({
      where: { id },
      select: {
        athleteId: true,
        athlete: {
          select: {
            userId: true,
            parentId: true,
          },
        },
        challenge: {
          select: { slug: true },
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
