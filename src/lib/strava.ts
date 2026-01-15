import { db } from "@/lib/db";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate: boolean;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  map?: {
    summary_polyline: string;
  };
  trainer: boolean; // true if indoor/treadmill
  manual: boolean; // true if manually entered
  private: boolean;
  visibility: string;
  timezone: string;
  athlete: {
    id: number;
  };
}

/**
 * Refresh a user's Strava access token if needed
 * Returns the valid access token or null if refresh fails
 */
export async function refreshStravaToken(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stravaAccessToken: true,
      stravaRefreshToken: true,
    },
  });

  if (!user?.stravaRefreshToken) {
    console.error("No Strava refresh token for user:", userId);
    return null;
  }

  try {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: user.stravaRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Strava token refresh failed:", errorText);
      return null;
    }

    const data: StravaTokenResponse = await response.json();

    // Update tokens in database
    await db.user.update({
      where: { id: userId },
      data: {
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
      },
    });

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing Strava token:", error);
    return null;
  }
}

/**
 * Get the current valid access token for a user
 * Refreshes if the current token might be expired
 */
export async function getStravaAccessToken(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stravaAccessToken: true,
      stravaRefreshToken: true,
      stravaConnectedAt: true,
    },
  });

  if (!user?.stravaAccessToken || !user?.stravaRefreshToken) {
    return null;
  }

  // Strava tokens expire after 6 hours, but we refresh more conservatively
  // For simplicity, we'll always try to refresh if the connection is older than 5 hours
  const connectedAt = user.stravaConnectedAt;
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

  if (!connectedAt || connectedAt < fiveHoursAgo) {
    // Token might be expired, refresh it
    const newToken = await refreshStravaToken(userId);
    return newToken;
  }

  return user.stravaAccessToken;
}

/**
 * Fetch activities from Strava API
 */
export async function fetchStravaActivities(
  userId: string,
  options: {
    before?: number; // Unix timestamp
    after?: number; // Unix timestamp
    page?: number;
    perPage?: number;
  } = {}
): Promise<StravaActivity[] | null> {
  const accessToken = await getStravaAccessToken(userId);
  if (!accessToken) {
    return null;
  }

  const params = new URLSearchParams();
  if (options.before) params.set("before", String(options.before));
  if (options.after) params.set("after", String(options.after));
  if (options.page) params.set("page", String(options.page));
  params.set("per_page", String(options.perPage || 30));

  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await refreshStravaToken(userId);
      if (!newToken) return null;

      // Retry with new token
      const retryResponse = await fetch(
        `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        }
      );

      if (!retryResponse.ok) return null;
      return retryResponse.json();
    }

    if (!response.ok) {
      console.error("Strava API error:", response.status, await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching Strava activities:", error);
    return null;
  }
}

/**
 * Fetch a single activity by ID
 */
export async function fetchStravaActivity(
  userId: string,
  activityId: string
): Promise<StravaActivity | null> {
  const accessToken = await getStravaAccessToken(userId);
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await refreshStravaToken(userId);
      if (!newToken) return null;

      // Retry with new token
      const retryResponse = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}`,
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        }
      );

      if (!retryResponse.ok) return null;
      return retryResponse.json();
    }

    if (!response.ok) {
      console.error("Strava API error:", response.status, await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching Strava activity:", error);
    return null;
  }
}

/**
 * Validate a Strava activity against challenge requirements
 */
export function validateActivityForChallenge(
  activity: StravaActivity,
  requirements: {
    activityType?: string | null;
    minDistance?: number | null;
    maxDistance?: number | null;
    minElevationGain?: number | null;
    requiresGPS?: boolean;
    requiresHeartRate?: boolean;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check activity type
  if (requirements.activityType) {
    // Map Strava activity types to our simplified types
    const typeMapping: Record<string, string[]> = {
      "Run": ["Run", "VirtualRun"],
      "Trail Run": ["TrailRun"],
      "Ride": ["Ride", "VirtualRide", "EBikeRide"],
      "Mountain Bike": ["MountainBikeRide"],
      "Swim": ["Swim"],
      "Open Water Swim": ["Swim"], // Strava doesn't differentiate, check start_latlng
      "Walk": ["Walk"],
      "Hike": ["Hike"],
      "Row": ["Rowing"],
      "Kayak": ["Kayaking", "Canoeing", "StandUpPaddling"],
      "Cross-Country Ski": ["NordicSki", "BackcountrySki"],
    };

    const allowedTypes = typeMapping[requirements.activityType] || [requirements.activityType];
    if (!allowedTypes.includes(activity.type) && !allowedTypes.includes(activity.sport_type)) {
      errors.push(`Activity type must be ${requirements.activityType} (got ${activity.type})`);
    }
  }

  // Check distance
  if (requirements.minDistance && activity.distance < requirements.minDistance) {
    errors.push(`Distance must be at least ${(requirements.minDistance / 1000).toFixed(1)} km (got ${(activity.distance / 1000).toFixed(1)} km)`);
  }
  if (requirements.maxDistance && activity.distance > requirements.maxDistance) {
    errors.push(`Distance must be at most ${(requirements.maxDistance / 1000).toFixed(1)} km (got ${(activity.distance / 1000).toFixed(1)} km)`);
  }

  // Check elevation
  if (requirements.minElevationGain && activity.total_elevation_gain < requirements.minElevationGain) {
    errors.push(`Elevation gain must be at least ${requirements.minElevationGain}m (got ${Math.round(activity.total_elevation_gain)}m)`);
  }

  // Check GPS requirement (trainer = indoor/treadmill)
  if (requirements.requiresGPS && activity.trainer) {
    errors.push("Activity must be outdoor with GPS (no treadmill/trainer)");
  }

  // Check heart rate requirement
  if (requirements.requiresHeartRate && !activity.has_heartrate) {
    errors.push("Activity must have heart rate data");
  }

  // Reject manual entries (not real activity data)
  if (activity.manual) {
    errors.push("Manually entered activities are not accepted");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type { StravaActivity };
