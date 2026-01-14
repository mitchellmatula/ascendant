import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isSystemAdmin } from "@/lib/auth";
import { z } from "zod";

const reviewBanSchema = z.object({
  action: z.enum(["ban", "unban"]),
  reason: z.string().max(500).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/[id]/review-ban
 * Ban or unban a user from reviewing submissions
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await requireUser();

    // Only system admins can manage review bans
    if (!isSystemAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: "Only system admins can manage review permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, reason } = reviewBanSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, canReview: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Can't ban yourself
    if (user.id === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot modify your own review permissions" },
        { status: 400 }
      );
    }

    if (action === "ban") {
      const updated = await db.user.update({
        where: { id },
        data: {
          canReview: false,
          reviewBannedAt: new Date(),
          reviewBannedBy: currentUser.id,
          reviewBanReason: reason || "Review privileges revoked by admin",
        },
        select: {
          id: true,
          email: true,
          canReview: true,
          reviewBannedAt: true,
          reviewBanReason: true,
        },
      });

      return NextResponse.json({
        user: updated,
        message: "User banned from reviewing submissions",
      });
    } else {
      const updated = await db.user.update({
        where: { id },
        data: {
          canReview: true,
          reviewBannedAt: null,
          reviewBannedBy: null,
          reviewBanReason: null,
        },
        select: {
          id: true,
          email: true,
          canReview: true,
        },
      });

      return NextResponse.json({
        user: updated,
        message: "User review privileges restored",
      });
    }
  } catch (error) {
    console.error("Error managing review ban:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update review permissions" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/[id]/review-ban
 * Get a user's review ban status
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await requireUser();

    if (!isSystemAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        canReview: true,
        reviewBannedAt: true,
        reviewBannedBy: true,
        reviewBanReason: true,
        reviewCount: true,
        reviewAccuracy: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching review ban status:", error);
    return NextResponse.json(
      { error: "Failed to fetch review status" },
      { status: 500 }
    );
  }
}
