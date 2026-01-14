import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import { getReviewableSubmissions } from "@/lib/submissions";

/**
 * GET /api/admin/submissions
 * Get all submissions for admin review queue
 * Admins/coaches see all, athletes see only what they can review (tier-based)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    
    // Allow admins, coaches, AND athletes to access (athletes see tier-filtered results)
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "PENDING") as "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getReviewableSubmissions({
      reviewerUserId: user.id,
      reviewerRole: user.role,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
