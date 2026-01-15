import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Strava OAuth configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

// Scopes we need:
// - read: Read public segments, routes, etc.
// - activity:read_all: Read all activities (including private ones)
const STRAVA_SCOPES = "read,activity:read_all";

// GET /api/auth/strava - Redirect to Strava OAuth
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Strava is configured
    if (!STRAVA_CLIENT_ID) {
      return NextResponse.json(
        { error: "Strava integration is not configured" },
        { status: 503 }
      );
    }

    // Build the callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/strava/callback`;

    // Build the Strava authorization URL
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: STRAVA_SCOPES,
      // State parameter to prevent CSRF (include user ID)
      state: user.id,
    });

    const authorizeUrl = `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;

    // Redirect to Strava
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Error initiating Strava OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Strava connection" },
      { status: 500 }
    );
  }
}
