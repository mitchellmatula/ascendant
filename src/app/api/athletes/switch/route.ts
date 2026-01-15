import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { setActiveAthleteId } from "@/lib/active-athlete";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { athleteId } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: "athleteId is required" },
        { status: 400 }
      );
    }

    // Verify the user has access to this athlete
    const isOwnAthlete = user.athlete?.id === athleteId;
    const isManagedAthlete = user.managedAthletes.some((a) => a.id === athleteId);

    if (!isOwnAthlete && !isManagedAthlete) {
      return NextResponse.json(
        { error: "You don't have access to this athlete" },
        { status: 403 }
      );
    }

    // Get athlete details for the response
    const athlete = await db.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        displayName: true,
      },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Set the cookie
    await setActiveAthleteId(athleteId);

    return NextResponse.json({
      success: true,
      athlete: {
        id: athlete.id,
        displayName: athlete.displayName,
      },
    });
  } catch (error) {
    console.error("Error switching athlete:", error);
    return NextResponse.json(
      { error: "Failed to switch athlete" },
      { status: 500 }
    );
  }
}
