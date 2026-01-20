import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { calculatePrime, toNumericLevel, Rank } from "@/lib/levels";
import { findMatchingDivision } from "@/lib/divisions";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const activeAthlete = user ? await getActiveAthlete(user) : null;

    const { searchParams } = new URL(request.url);
    const divisionFilter = searchParams.get("division"); // "all" or "mine"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get current user's division if filtering by "mine"
    let userDivision: { id: string; name: string } | null = null;
    if (activeAthlete) {
      userDivision = await findMatchingDivision(
        activeAthlete.dateOfBirth,
        activeAthlete.gender
      );
    }

    // Fetch athletes with domain levels (public profiles only)
    const athletes = await db.athlete.findMany({
      where: {
        isPublicProfile: true,
      },
      include: {
        domainLevels: {
          include: {
            domain: true,
          },
        },
      },
    });

    // Calculate Prime and division for each athlete
    const athletesWithData = await Promise.all(
      athletes.map(async (athlete) => {
        const prime = calculatePrime(athlete.domainLevels);
        const division = await findMatchingDivision(
          athlete.dateOfBirth,
          athlete.gender
        );

        return {
          id: athlete.id,
          displayName: athlete.displayName,
          username: athlete.username,
          avatarUrl: athlete.avatarUrl,
          division: division
            ? {
                id: division.id,
                name: division.name,
              }
            : null,
          primeLevel: {
            letter: prime.letter,
            sublevel: prime.sublevel,
            numericValue: prime.numericValue,
          },
          domainLevels: athlete.domainLevels.map((dl) => ({
            domain: dl.domain.slug,
            domainName: dl.domain.name,
            letter: dl.letter,
            sublevel: dl.sublevel,
            numericValue: toNumericLevel(dl.letter as Rank, dl.sublevel),
          })),
          totalXp: athlete.domainLevels.reduce((sum, dl) => sum + dl.currentXP + dl.bankedXP, 0),
          isCurrentUser: athlete.id === activeAthlete?.id,
        };
      })
    );

    // Filter by division if requested
    let filteredAthletes = athletesWithData;
    if (divisionFilter === "mine" && userDivision) {
      filteredAthletes = athletesWithData.filter(
        (a) => a.division?.id === userDivision.id
      );
    }

    // Sort by Prime numeric value (descending)
    filteredAthletes.sort((a, b) => b.primeLevel.numericValue - a.primeLevel.numericValue);

    // Assign ranks
    let currentRank = 0;
    let lastValue: number | null = null;
    const rankedAthletes = filteredAthletes.map((athlete, index) => {
      // Same Prime value gets same rank
      if (lastValue !== athlete.primeLevel.numericValue) {
        currentRank = index + 1;
        lastValue = athlete.primeLevel.numericValue;
      }
      return {
        rank: currentRank,
        ...athlete,
      };
    });

    // Apply pagination
    const paginatedAthletes = rankedAthletes.slice(offset, offset + limit);
    const total = rankedAthletes.length;

    // Find current user's rank if they're public
    let currentUserRank: number | null = null;
    if (activeAthlete) {
      const userEntry = rankedAthletes.find((a) => a.id === activeAthlete.id);
      if (userEntry) {
        currentUserRank = userEntry.rank;
      }
    }

    return NextResponse.json({
      athletes: paginatedAthletes,
      total,
      hasMore: offset + limit < total,
      currentUserRank,
      currentUserDivision: userDivision,
    });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
