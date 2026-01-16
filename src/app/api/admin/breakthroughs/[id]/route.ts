import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    console.log("PATCH breakthroughs - user:", user?.id, "role:", user?.role);

    if (!user || !isAdmin(user.role)) {
      console.log("PATCH breakthroughs - unauthorized, user:", !!user, "isAdmin:", user ? isAdmin(user.role) : false);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tierRequired, challengeCount, isActive } = body;

    // Check if rule exists
    const existing = await db.breakthroughRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Breakthrough rule not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      tierRequired?: string;
      challengeCount?: number;
      isActive?: boolean;
    } = {};

    if (tierRequired !== undefined) {
      updateData.tierRequired = tierRequired;
    }
    if (challengeCount !== undefined) {
      updateData.challengeCount = challengeCount;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updated = await db.breakthroughRule.update({
      where: { id },
      data: updateData,
      include: {
        domain: true,
        division: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating breakthrough rule:", error);
    return NextResponse.json(
      { error: "Failed to update breakthrough rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if rule exists
    const existing = await db.breakthroughRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Breakthrough rule not found" },
        { status: 404 }
      );
    }

    await db.breakthroughRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting breakthrough rule:", error);
    return NextResponse.json(
      { error: "Failed to delete breakthrough rule" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const rule = await db.breakthroughRule.findUnique({
      where: { id },
      include: {
        domain: true,
        division: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Breakthrough rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Error fetching breakthrough rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakthrough rule" },
      { status: 500 }
    );
  }
}
