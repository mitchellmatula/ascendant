import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  getCommunityFeed,
  getFollowingFeed,
  getGymFeed,
  getDivisionFeed,
} from "@/lib/feed";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    
    const tab = searchParams.get("tab") || "community";
    const cursor = searchParams.get("cursor") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    
    // Get current athlete if logged in
    let athleteId: string | undefined;
    let dbUserId: string | undefined;
    
    if (userId) {
      const user = await db.user.findUnique({
        where: { clerkId: userId },
        include: { athlete: { select: { id: true } } },
      });
      
      if (user?.athlete) {
        athleteId = user.athlete.id;
        dbUserId = user.id;
      }
    }
    
    // Route to appropriate feed based on tab
    switch (tab) {
      case "community":
        const communityFeed = await getCommunityFeed({
          limit,
          cursor,
          athleteId,
        });
        return NextResponse.json(communityFeed);
        
      case "following":
        if (!athleteId) {
          return NextResponse.json(
            { error: "Must be logged in to view following feed" },
            { status: 401 }
          );
        }
        const followingFeed = await getFollowingFeed(athleteId, {
          limit,
          cursor,
        });
        return NextResponse.json(followingFeed);
        
      case "gym":
        if (!dbUserId) {
          return NextResponse.json(
            { error: "Must be logged in to view gym feed" },
            { status: 401 }
          );
        }
        const gymFeed = await getGymFeed(dbUserId, {
          limit,
          cursor,
          athleteId,
        });
        return NextResponse.json(gymFeed);
        
      case "division":
        if (!athleteId) {
          return NextResponse.json(
            { error: "Must be logged in to view division feed" },
            { status: 401 }
          );
        }
        const divisionFeed = await getDivisionFeed(athleteId, {
          limit,
          cursor,
        });
        return NextResponse.json(divisionFeed);
        
      default:
        return NextResponse.json(
          { error: "Invalid tab. Must be: community, following, gym, or division" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Feed API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}
