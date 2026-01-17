import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifyComment, notifyCommentReply } from "@/lib/notifications";

const MAX_COMMENT_LENGTH = 2000;
const MAX_DEPTH = 2; // 0 = top-level, 1 = reply, 2 = reply-to-reply

// GET /api/submissions/[id]/comments - Get comments for a submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const { userId } = await auth();
    
    // Get current athlete ID for checking their reactions
    let currentAthleteId: string | undefined;
    if (userId) {
      const user = await db.user.findUnique({
        where: { clerkId: userId },
        include: { athlete: { select: { id: true } } },
      });
      currentAthleteId = user?.athlete?.id;
    }
    
    // Get top-level comments with nested replies
    const comments = await db.comment.findMany({
      where: {
        submissionId,
        parentId: null, // Top-level only
      },
      include: {
        athlete: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: {
          select: {
            emoji: true,
            athleteId: true,
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            athlete: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            reactions: {
              select: {
                emoji: true,
                athleteId: true,
              },
            },
            replies: {
              where: { isDeleted: false },
              include: {
                athlete: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
                reactions: {
                  select: {
                    emoji: true,
                    athleteId: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    
    // Transform comments to include reaction counts and user's reactions
    function transformComment(comment: any): any {
      const reactionCounts: Record<string, number> = {};
      const userReactions: string[] = [];
      
      for (const reaction of comment.reactions) {
        reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
        if (reaction.athleteId === currentAthleteId) {
          userReactions.push(reaction.emoji);
        }
      }
      
      return {
        id: comment.id,
        content: comment.isDeleted ? "[deleted]" : comment.content,
        isDeleted: comment.isDeleted,
        depth: comment.depth,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        athlete: comment.isDeleted ? null : {
          id: comment.athlete.id,
          username: comment.athlete.username,
          displayName: comment.athlete.displayName,
          avatarUrl: comment.athlete.avatarUrl,
        },
        reactionCounts,
        userReactions: currentAthleteId ? userReactions : undefined,
        replies: comment.replies?.map(transformComment) ?? [],
      };
    }
    
    return NextResponse.json({
      comments: comments
        .filter((c) => !c.isDeleted || c.replies.length > 0) // Keep deleted if has replies
        .map(transformComment),
    });
  } catch (error) {
    console.error("Comments GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/submissions/[id]/comments - Add a comment
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
    const { content, parentId } = body;
    
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    
    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or less` },
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
    
    // Get submission
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
    
    // If replying, check parent exists and get depth
    let depth = 0;
    let parentComment = null;
    
    if (parentId) {
      parentComment = await db.comment.findUnique({
        where: { id: parentId },
        include: { athlete: { select: { id: true } } },
      });
      
      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
      
      if (parentComment.submissionId !== submissionId) {
        return NextResponse.json(
          { error: "Parent comment belongs to different submission" },
          { status: 400 }
        );
      }
      
      depth = parentComment.depth + 1;
      
      if (depth > MAX_DEPTH) {
        return NextResponse.json(
          { error: "Maximum reply depth reached" },
          { status: 400 }
        );
      }
    }
    
    // Create comment
    const comment = await db.comment.create({
      data: {
        athleteId: currentUser.athlete.id,
        submissionId,
        parentId,
        content: content.trim(),
        depth,
      },
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
    
    // Send notifications
    if (parentComment) {
      // Notify parent comment author of reply
      await notifyCommentReply(
        parentComment.athlete.id,
        {
          id: currentUser.athlete.id,
          username: currentUser.athlete.username || "unknown",
          avatarUrl: currentUser.athlete.avatarUrl,
        },
        submissionId,
        comment.id,
        submission.challenge.slug,
        content
      );
    } else {
      // Notify submission owner of new comment
      await notifyComment(
        submission.athlete.id,
        {
          id: currentUser.athlete.id,
          username: currentUser.athlete.username || "unknown",
          avatarUrl: currentUser.athlete.avatarUrl,
        },
        submissionId,
        submission.challenge.slug,
        content
      );
    }
    
    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        depth: comment.depth,
        createdAt: comment.createdAt,
        athlete: {
          id: comment.athlete.id,
          username: comment.athlete.username,
          displayName: comment.athlete.displayName,
          avatarUrl: comment.athlete.avatarUrl,
        },
        reactionCounts: {},
        userReactions: [],
        replies: [],
      },
    });
  } catch (error) {
    console.error("Comments POST error:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
