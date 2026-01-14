import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// GET /api/admin/challenges/search?q=name - Search for similar challenges
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const excludeId = url.searchParams.get("excludeId"); // Exclude current challenge when editing

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Split query into words for better matching
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    
    if (words.length === 0) {
      return NextResponse.json([]);
    }

    // Search for challenges where name contains any of the words
    const challenges = await db.challenge.findMany({
      where: {
        AND: [
          // Exclude current challenge if editing
          excludeId ? { NOT: { id: excludeId } } : {},
          // Match any word in the search query
          {
            OR: [
              // Exact phrase match (highest priority - handled by ordering)
              { name: { contains: query, mode: "insensitive" } },
              // Individual word matches
              ...words.map(word => ({
                name: { contains: word, mode: "insensitive" as const },
              })),
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        gradingType: true,
        isActive: true,
        primaryDomain: {
          select: { name: true, icon: true },
        },
        categories: {
          take: 2,
          include: {
            category: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 8, // Limit results
    });

    // Calculate relevance score and sort
    const scoredChallenges = challenges.map(challenge => {
      const nameLower = challenge.name.toLowerCase();
      let score = 0;
      
      // Exact match gets highest score
      if (nameLower === query.toLowerCase()) {
        score += 100;
      }
      // Starts with query
      else if (nameLower.startsWith(query.toLowerCase())) {
        score += 50;
      }
      // Contains full query
      else if (nameLower.includes(query.toLowerCase())) {
        score += 25;
      }
      
      // Add points for each word match
      for (const word of words) {
        if (nameLower.includes(word)) {
          score += 10;
        }
      }
      
      return { ...challenge, score };
    });

    // Sort by score descending
    scoredChallenges.sort((a, b) => b.score - a.score);

    // Return top results without the score
    const results = scoredChallenges.slice(0, 5).map(({ score: _score, ...rest }) => rest);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Challenge search error:", error);
    return NextResponse.json(
      { error: "Failed to search challenges" },
      { status: 500 }
    );
  }
}
