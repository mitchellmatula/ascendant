import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "../../../../../prisma/generated/prisma/client";

// GET /api/athletes/search - Search for athletes by username or display name
// Optional params for coaching: gymId (filter to gym members), excludeClassId (exclude current members)
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    
    // Coaching-specific filters
    const gymId = searchParams.get("gymId");
    const excludeClassId = searchParams.get("excludeClassId");
    const forClass = gymId || excludeClassId;
    
    if (!query || query.length < 2) {
      return NextResponse.json({ athletes: [] });
    }

    // If searching for class, require authentication
    if (forClass && !clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build the where clause
    const where: Prisma.AthleteWhereInput = {
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { displayName: { contains: query, mode: "insensitive" } },
      ],
    };

    // For class search (coaching context), show gym members regardless of profile settings
    if (forClass) {
      if (gymId) {
        where.user = {
          gymMemberships: { some: { gymId, isActive: true } },
        };
      }
      if (excludeClassId) {
        where.classMembers = {
          none: { classId: excludeClassId, status: "ACTIVE" },
        };
      }
    } else {
      // Public search: only show public, non-minor profiles
      where.isPublicProfile = true;
      where.isMinor = false;
    }
    
    const athletes = await db.athlete.findMany({
      where,
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
