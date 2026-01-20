import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// DELETE /api/feed/[id] - Hide a feed item (admin only)
// The id is the submission ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify submission exists
    const submission = await db.challengeSubmission.findUnique({
      where: { id },
      select: { id: true, isHiddenFromFeed: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Toggle the hidden state (allows unhiding too)
    await db.challengeSubmission.update({
      where: { id },
      data: { isHiddenFromFeed: !submission.isHiddenFromFeed },
    });

    revalidatePath("/feed");
    return NextResponse.json({ 
      success: true, 
      isHiddenFromFeed: !submission.isHiddenFromFeed 
    });
  } catch (error) {
    console.error("Error hiding feed item:", error);
    return NextResponse.json(
      { error: "Failed to hide feed item" },
      { status: 500 }
    );
  }
}
