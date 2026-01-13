import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Bootstrap endpoint to create the first system admin.
 * Only works when there are NO system admins in the database.
 * After first admin is created, this endpoint becomes disabled.
 */
export async function POST() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if any system admin exists
    const existingAdmin = await db.user.findFirst({
      where: { role: "SYSTEM_ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "System admin already exists. Use the admin panel to manage roles." },
        { status: 403 }
      );
    }

    // Find or create the current user
    let user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      // User hasn't gone through onboarding yet, create them
      user = await db.user.create({
        data: {
          clerkId,
          email: "", // Will be updated by webhook
          accountType: "ATHLETE",
          role: "SYSTEM_ADMIN",
        },
      });
    } else {
      // Promote existing user to system admin
      user = await db.user.update({
        where: { clerkId },
        data: { role: "SYSTEM_ADMIN" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "You are now a System Admin!",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json(
      { error: "Failed to bootstrap admin" },
      { status: 500 }
    );
  }
}

/**
 * Check if bootstrap is available
 */
export async function GET() {
  try {
    const existingAdmin = await db.user.findFirst({
      where: { role: "SYSTEM_ADMIN" },
    });

    return NextResponse.json({
      available: !existingAdmin,
      message: existingAdmin
        ? "System admin already exists"
        : "No system admin found. Bootstrap available.",
    });
  } catch (error) {
    console.error("Bootstrap check error:", error);
    return NextResponse.json(
      { error: "Failed to check bootstrap status" },
      { status: 500 }
    );
  }
}
