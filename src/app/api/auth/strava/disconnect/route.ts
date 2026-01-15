import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/auth/strava/disconnect - Disconnect Strava account
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Strava is connected
    if (!user.stravaAthleteId) {
      return NextResponse.json(
        { error: "Strava is not connected" },
        { status: 400 }
      );
    }

    // Optionally, deauthorize from Strava's side
    // This revokes our app's access to the user's Strava data
    if (user.stravaAccessToken) {
      try {
        await fetch("https://www.strava.com/oauth/deauthorize", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            access_token: user.stravaAccessToken,
          }),
        });
      } catch (err) {
        // Log but don't fail - we still want to remove the connection locally
        console.error("Failed to deauthorize from Strava:", err);
      }
    }

    // Remove Strava connection from database
    await db.user.update({
      where: { id: user.id },
      data: {
        stravaAthleteId: null,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaConnectedAt: null,
      },
    });

    revalidatePath("/settings/connections");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Strava:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Strava" },
      { status: 500 }
    );
  }
}
