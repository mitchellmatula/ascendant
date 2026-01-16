import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      domainId,
      applyToAllDomains,
      fromRank,
      toRank,
      tierRequired,
      challengeCount,
      divisionId,
    } = body;

    // Validate required fields
    if (!fromRank || !toRank || !tierRequired || !challengeCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!applyToAllDomains && !domainId) {
      return NextResponse.json(
        { error: "Domain ID is required when not applying to all domains" },
        { status: 400 }
      );
    }

    // Get domains to create rules for
    let domainIds: string[] = [];
    if (applyToAllDomains) {
      const domains = await db.domain.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      domainIds = domains.map((d) => d.id);
    } else {
      domainIds = [domainId];
    }

    // Create rules for each domain
    const createdRules = [];
    for (const dId of domainIds) {
      // Check if rule already exists
      const existing = await db.breakthroughRule.findFirst({
        where: {
          domainId: dId,
          fromRank,
          toRank,
          divisionId: divisionId || null,
        },
      });

      if (existing) {
        // Update existing rule
        const updated = await db.breakthroughRule.update({
          where: { id: existing.id },
          data: {
            tierRequired,
            challengeCount,
            isActive: true,
          },
        });
        createdRules.push(updated);
      } else {
        // Create new rule
        const created = await db.breakthroughRule.create({
          data: {
            domainId: dId,
            fromRank,
            toRank,
            tierRequired,
            challengeCount,
            divisionId: divisionId || null,
            isActive: true,
          },
        });
        createdRules.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdRules.length,
      rules: createdRules,
    });
  } catch (error) {
    console.error("Error creating breakthrough rule:", error);
    return NextResponse.json(
      { error: "Failed to create breakthrough rule" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await db.breakthroughRule.findMany({
      include: {
        domain: true,
        division: true,
      },
      orderBy: [
        { domain: { sortOrder: "asc" } },
        { fromRank: "asc" },
      ],
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching breakthrough rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakthrough rules" },
      { status: 500 }
    );
  }
}
