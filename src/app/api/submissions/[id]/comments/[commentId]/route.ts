import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role } from "../../../../../../../prisma/generated/prisma/client";

// DELETE /api/submissions/[id]/comments/[commentId] - Delete a comment
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
    
    // Get current user
    const currentUser = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get comment
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        _count: { select: { replies: true } },
      },
    });
    
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    
    // Check permission: owner or admin
    const isOwner = currentUser.athlete?.id === comment.athleteId;
    const isAdmin = currentUser.role === Role.SYSTEM_ADMIN;
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not authorized to delete this comment" }, { status: 403 });
    }
    
    // If comment has replies, soft delete (mark as deleted but keep structure)
    // Otherwise, hard delete
    if (comment._count.replies > 0) {
      await db.comment.update({
        where: { id: commentId },
        data: { isDeleted: true, content: "[deleted]" },
      });
    } else {
      await db.comment.delete({
        where: { id: commentId },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

// POST /api/submissions/[id]/comments/[commentId] - Report a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { commentId } = await params;
    const body = await request.json();
    const { reason } = body;
    
    if (!reason || typeof reason !== "string" || reason.length < 10) {
      return NextResponse.json(
        { error: "Please provide a reason (at least 10 characters)" },
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
    
    // Check comment exists
    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    
    // Check if already reported by this user
    const existingReport = await db.commentReport.findFirst({
      where: {
        commentId,
        reporterId: currentUser.athlete.id,
      },
    });
    
    if (existingReport) {
      return NextResponse.json({ error: "You have already reported this comment" }, { status: 400 });
    }
    
    // Create report
    await db.commentReport.create({
      data: {
        commentId,
        reporterId: currentUser.athlete.id,
        reason: reason.trim(),
      },
    });
    
    return NextResponse.json({ success: true, message: "Report submitted" });
  } catch (error) {
    console.error("Comment report POST error:", error);
    return NextResponse.json(
      { error: "Failed to report comment" },
      { status: 500 }
    );
  }
}
