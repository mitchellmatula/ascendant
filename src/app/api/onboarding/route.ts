import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { isMinor } from "@/lib/divisions";

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountType, displayName, dateOfBirth, gender } = body;

    // Find or create the user
    let user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          clerkId,
          email: "", // Will be updated by webhook
          accountType: accountType === "parent" ? "PARENT" : "ATHLETE",
          role: accountType === "parent" ? "PARENT" : "ATHLETE",
        },
      });
    } else {
      // Update account type
      user = await db.user.update({
        where: { clerkId },
        data: {
          accountType: accountType === "parent" ? "PARENT" : "ATHLETE",
          role: accountType === "parent" ? "PARENT" : "ATHLETE",
        },
      });
    }

    const dob = new Date(dateOfBirth);
    const isMinorAthlete = isMinor(dob);

    // Create the athlete profile
    if (accountType === "parent") {
      // Create child athlete managed by parent
      await db.athlete.create({
        data: {
          parentId: user.id,
          displayName,
          dateOfBirth: dob,
          gender,
          isMinor: isMinorAthlete,
        },
      });
    } else {
      // Create athlete profile for the user themselves
      await db.athlete.create({
        data: {
          userId: user.id,
          displayName,
          dateOfBirth: dob,
          gender,
          isMinor: isMinorAthlete,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
