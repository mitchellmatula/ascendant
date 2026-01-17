import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifyNewFollower } from "@/lib/notifications";

// POST /api/athletes/[username]/follow - Follow an athlete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { username } = await params;
    
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
    
    // Get target athlete
    const targetAthlete = await db.athlete.findUnique({
      where: { username },
      select: { id: true, username: true },
    });
    
    if (!targetAthlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }
    
    // Can't follow yourself
    if (targetAthlete.id === currentUser.athlete.id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }
    
    // Check if already following
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.athlete.id,
          followingId: targetAthlete.id,
        },
      },
    });
    
    if (existingFollow) {
      return NextResponse.json({ error: "Already following" }, { status: 400 });
    }
    
    // Create follow
    await db.follow.create({
      data: {
        followerId: currentUser.athlete.id,
        followingId: targetAthlete.id,
      },
    });
    
    // Send notification to target
    await notifyNewFollower(targetAthlete.id, {
      id: currentUser.athlete.id,
      username: currentUser.athlete.username || "unknown",
      avatarUrl: currentUser.athlete.avatarUrl,
    });
    
    return NextResponse.json({ success: true, following: true });
  } catch (error) {
    console.error("Follow POST error:", error);
    return NextResponse.json(
      { error: "Failed to follow athlete" },
      { status: 500 }
    );
  }
}

// DELETE /api/athletes/[username]/follow - Unfollow an athlete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { username } = await params;
    
    // Get current user's athlete
    const currentUser = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!currentUser?.athlete) {
      return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });
    }
    
    // Get target athlete
    const targetAthlete = await db.athlete.findUnique({
      where: { username },
      select: { id: true },
    });
    
    if (!targetAthlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }
    
    // Delete follow
    await db.follow.deleteMany({
      where: {
        followerId: currentUser.athlete.id,
        followingId: targetAthlete.id,
      },
    });
    
    return NextResponse.json({ success: true, following: false });
  } catch (error) {
    console.error("Follow DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to unfollow athlete" },
      { status: 500 }
    );
  }
}

// GET /api/athletes/[username]/follow - Check if following
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ following: false });
    }
    
    const { username } = await params;
    
    // Get current user's athlete
    const currentUser = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (!currentUser?.athlete) {
      return NextResponse.json({ following: false });
    }
    
    // Get target athlete
    const targetAthlete = await db.athlete.findUnique({
      where: { username },
      select: { id: true },
    });
    
    if (!targetAthlete) {
      return NextResponse.json({ following: false });
    }
    
    // Check if following
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.athlete.id,
          followingId: targetAthlete.id,
        },
      },
    });
    
    return NextResponse.json({ following: !!follow });
  } catch (error) {
    console.error("Follow GET error:", error);
    return NextResponse.json({ following: false });
  }
}
