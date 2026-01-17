import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/athletes/search - Search for athletes by username or display name
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    
    if (!query || query.length < 2) {
      return NextResponse.json({ athletes: [] });
    }
    
    const athletes = await db.athlete.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
        ],
        // Only show public profiles in search
        isPublicProfile: true,
        // COPPA: Don't show minors in search
        isMinor: false,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        domainLevels: {
          select: {
            letter: true,
            sublevel: true,
          },
        },
        _count: {
          select: {
            followers: true,
            submissions: {
              where: { status: "APPROVED" },
            },
          },
        },
      },
      take: limit,
      orderBy: [
        // Prioritize exact username match
        { username: "asc" },
      ],
    });
    
    // Calculate Prime level for each athlete
    const ranks = ["F", "E", "D", "C", "B", "A", "S"];
    
    const results = athletes.map((athlete) => {
      let primeLevel = { letter: "F", sublevel: 0 };
      
      if (athlete.domainLevels.length > 0) {
        let totalNumeric = 0;
        for (const dl of athlete.domainLevels) {
          const rankIndex = ranks.indexOf(dl.letter);
          totalNumeric += rankIndex * 10 + dl.sublevel;
        }
        const avgNumeric = Math.round(totalNumeric / athlete.domainLevels.length);
        const primeRankIndex = Math.min(Math.floor(avgNumeric / 10), 6);
        const primeSublevel = avgNumeric % 10;
        primeLevel = {
          letter: ranks[primeRankIndex],
          sublevel: primeSublevel,
        };
      }
      
      return {
        id: athlete.id,
        username: athlete.username,
        displayName: athlete.displayName,
        avatarUrl: athlete.avatarUrl,
        primeLevel,
        followerCount: athlete._count.followers,
        completedChallenges: athlete._count.submissions,
      };
    });
    
    return NextResponse.json({ athletes: results });
  } catch (error) {
    console.error("Athlete search error:", error);
    return NextResponse.json(
      { error: "Failed to search athletes" },
      { status: 500 }
    );
  }
}
