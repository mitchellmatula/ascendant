import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifyCommentLike } from "@/lib/notifications";

// Valid reaction emojis
const VALID_EMOJIS = ["🔥", "💪", "👏", "🎯", "⚡"];

// POST /api/submissions/[id]/comments/[commentId]/reactions - Add reaction to comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id: submissionId, commentId } = await params;
    const body = await request.json();
    const { emoji } = body;
    
    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: `Invalid emoji. Must be one of: ${VALID_EMOJIS.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Get current user's athlete
    const currentUser = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        athlete: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
    
    if (!currentUser?.athlete) {
      return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });
    }
    
    // Get comment
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        athlete: { select: { id: true } },
        submission: {
          include: { challenge: { select: { slug: true } } },
        },
      },
    });
    
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    
    // Check if already reacted with this emoji
    const existingReaction = await db.reaction.findUnique({
      where: {
        athleteId_commentId_emoji: {
          athleteId: currentUser.athlete.id,
          commentId,
          emoji,
        },
      },
    });
    
    if (existingReaction) {
      return NextResponse.json({ error: "Already reacted with this emoji" }, { status: 400 });
    }
    
    // Create reaction
    await db.reaction.create({
      data: {
        athleteId: currentUser.athlete.id,
        commentId,
        emoji,
      },
    });
    
    // Notify comment owner
    await notifyCommentLike(
      comment.athlete.id,
      {
        id: currentUser.athlete.id,
        username: currentUser.athlete.username || "unknown",
        avatarUrl: currentUser.athlete.avatarUrl,
      },
      commentId,
      comment.submission.challenge.slug
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment reaction POST error:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}

// DELETE /api/submissions/[id]/comments/[commentId]/reactions - Remove reaction from comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { commentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const emoji = searchParams.get("emoji");
    
    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: `Invalid emoji. Must be one of: ${VALID_EMOJIS.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Get current user's athlete
    const currentUser = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!currentUser?.athlete) {
      return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });
    }
    
    // Delete reaction
    await db.reaction.deleteMany({
      where: {
        athleteId: currentUser.athlete.id,
        commentId,
        emoji,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment reaction DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 }
    );
  }
}
