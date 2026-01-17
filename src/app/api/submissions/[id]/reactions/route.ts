import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifyReaction } from "@/lib/notifications";

// Valid reaction emojis
const VALID_EMOJIS = ["🔥", "💪", "👏", "🎯", "⚡"];

// GET /api/submissions/[id]/reactions - Get reactions for a submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const reactions = await db.reaction.findMany({
      where: { submissionId: id },
      include: {
        athlete: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    // Group by emoji
    const grouped: Record<string, Array<{
      athleteId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    }>> = {};
    
    for (const reaction of reactions) {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = [];
      }
      grouped[reaction.emoji].push({
        athleteId: reaction.athlete.id,
        username: reaction.athlete.username || "unknown",
        displayName: reaction.athlete.displayName,
        avatarUrl: reaction.athlete.avatarUrl,
      });
    }
    
    // Also return counts
    const counts: Record<string, number> = {};
    for (const [emoji, athletes] of Object.entries(grouped)) {
      counts[emoji] = athletes.length;
    }
    
    return NextResponse.json({ reactions: grouped, counts });
  } catch (error) {
    console.error("Reactions GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}

// POST /api/submissions/[id]/reactions - Add a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id: submissionId } = await params;
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
    
    // Get submission (and verify it exists)
    const submission = await db.challengeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: { select: { slug: true } },
        athlete: { select: { id: true } },
      },
    });
    
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    
    // Check if already reacted with this emoji
    const existingReaction = await db.reaction.findUnique({
      where: {
        athleteId_submissionId_emoji: {
          athleteId: currentUser.athlete.id,
          submissionId,
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
        submissionId,
        emoji,
      },
    });
    
    // Notify submission owner
    await notifyReaction(
      submission.athlete.id,
      {
        id: currentUser.athlete.id,
        username: currentUser.athlete.username || "unknown",
        avatarUrl: currentUser.athlete.avatarUrl,
      },
      emoji,
      submissionId,
      submission.challenge.slug
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reactions POST error:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}

// DELETE /api/submissions/[id]/reactions - Remove a reaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id: submissionId } = await params;
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
        submissionId,
        emoji,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reactions DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 }
    );
  }
}
