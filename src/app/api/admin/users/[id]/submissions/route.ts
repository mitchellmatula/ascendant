import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";

// GET /api/admin/users/[id]/submissions - Get all submissions for a user (and their managed athletes)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSystemAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the user with their athlete and managed athletes
    const targetUser = await db.user.findUnique({
      where: { id },
      include: {
        athlete: { select: { id: true, displayName: true } },
        managedAthletes: { select: { id: true, displayName: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Collect all athlete IDs (user's own + managed)
    const athleteIds: string[] = [];
    if (targetUser.athlete) {
      athleteIds.push(targetUser.athlete.id);
    }
    for (const managed of targetUser.managedAthletes) {
      athleteIds.push(managed.id);
    }

    if (athleteIds.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    // Get all submissions for these athletes
    const submissions = await db.challengeSubmission.findMany({
      where: {
        athleteId: { in: athleteIds },
      },
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
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/submissions - Delete a specific submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSystemAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    // Verify the submission exists and belongs to this user's athletes
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        athlete: { select: { id: true } },
        managedAthletes: { select: { id: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const athleteIds: string[] = [];
    if (targetUser.athlete) {
      athleteIds.push(targetUser.athlete.id);
    }
    for (const managed of targetUser.managedAthletes) {
      athleteIds.push(managed.id);
    }

    const submission = await db.challengeSubmission.findUnique({
      where: { id: submissionId },
      select: { athleteId: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (!athleteIds.includes(submission.athleteId)) {
      return NextResponse.json(
        { error: "Submission does not belong to this user" },
        { status: 403 }
      );
    }

    // Delete the submission (cascade will handle reactions, comments, etc.)
    await db.challengeSubmission.delete({
      where: { id: submissionId },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/submissions");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
