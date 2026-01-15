import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Strava OAuth configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  athlete: {
    id: number;
    username: string | null;
    firstname: string;
    lastname: string;
    profile: string;
    profile_medium: string;
  };
}

// GET /api/auth/strava/callback - Handle Strava OAuth callback
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // Redirect to sign in if no user
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      console.log("Strava OAuth denied:", error);
      return NextResponse.redirect(
        new URL("/settings/connections?error=strava_denied", request.url)
      );
    }

    // Validate required params
    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=strava_no_code", request.url)
      );
    }

    // Validate state matches current user (CSRF protection)
    if (state !== user.id) {
      console.error("Strava OAuth state mismatch:", { state, userId: user.id });
      return NextResponse.redirect(
        new URL("/settings/connections?error=strava_invalid_state", request.url)
      );
    }

    // Exchange code for tokens
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/strava/callback`;

    const tokenResponse = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Strava token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/settings/connections?error=strava_token_failed", request.url)
      );
    }

    const tokenData: StravaTokenResponse = await tokenResponse.json();

    // Check if this Strava account is already connected to another user
    const existingConnection = await db.user.findFirst({
      where: {
        stravaAthleteId: String(tokenData.athlete.id),
        id: { not: user.id },
      },
    });

    if (existingConnection) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=strava_already_linked", request.url)
      );
    }

    // Save tokens to database
    await db.user.update({
      where: { id: user.id },
      data: {
        stravaAthleteId: String(tokenData.athlete.id),
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaConnectedAt: new Date(),
      },
    });

    console.log(`Strava connected for user ${user.id}: athlete ${tokenData.athlete.id}`);

    // Redirect back to connections page with success
    return NextResponse.redirect(
      new URL("/settings/connections?success=strava_connected", request.url)
    );
  } catch (error) {
    console.error("Error in Strava callback:", error);
    return NextResponse.redirect(
      new URL("/settings/connections?error=strava_error", request.url)
    );
  }
}
