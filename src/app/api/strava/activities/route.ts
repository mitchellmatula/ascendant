import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchStravaActivities, validateActivityForChallenge, type StravaActivity } from "@/lib/strava";
import { db } from "@/lib/db";

// GET /api/strava/activities - Fetch user's Strava activities
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has Strava connected
    if (!user.stravaAthleteId) {
      return NextResponse.json(
        { error: "Strava is not connected", code: "NOT_CONNECTED" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("challengeId");
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");
    
    // Optional filters
    const after = searchParams.get("after"); // Unix timestamp
    const before = searchParams.get("before"); // Unix timestamp

    // Fetch activities from Strava
    const activities = await fetchStravaActivities(user.id, {
      page,
      perPage,
      after: after ? parseInt(after) : undefined,
      before: before ? parseInt(before) : undefined,
    });

    if (!activities) {
      return NextResponse.json(
        { error: "Failed to fetch activities from Strava", code: "FETCH_FAILED" },
        { status: 500 }
      );
    }

    // If a challenge is specified, validate each activity
    let challenge: {
      activityType: string | null;
      minDistance: number | null;
      maxDistance: number | null;
      minElevationGain: number | null;
      requiresGPS: boolean;
      requiresHeartRate: boolean;
    } | null = null;

    if (challengeId) {
      challenge = await db.challenge.findUnique({
        where: { id: challengeId },
        select: {
          activityType: true,
          minDistance: true,
          maxDistance: true,
          minElevationGain: true,
          requiresGPS: true,
          requiresHeartRate: true,
        },
      });
    }

    // Filter activities by challenge requirements if specified
    let filteredActivities = activities;
    if (challenge) {
      filteredActivities = activities.filter((activity: StravaActivity) => {
        // Filter by activity type if specified
        if (challenge.activityType) {
          const typeMap: Record<string, string[]> = {
            "Run": ["Run", "VirtualRun", "TrailRun"],
            "Trail Run": ["TrailRun", "Run"],
            "Ride": ["Ride", "VirtualRide", "MountainBikeRide", "GravelRide"],
            "Mountain Bike": ["MountainBikeRide", "Ride"],
            "Swim": ["Swim", "OpenWaterSwim"],
            "Walk": ["Walk"],
            "Hike": ["Hike"],
            "Row": ["Rowing"],
          };
          const allowedTypes = typeMap[challenge.activityType] || [challenge.activityType];
          if (!allowedTypes.includes(activity.type) && !allowedTypes.includes(activity.sport_type)) {
            return false;
          }
        }
        // Filter by minimum distance
        if (challenge.minDistance && activity.distance < challenge.minDistance) {
          return false;
        }
        // Filter by maximum distance
        if (challenge.maxDistance && activity.distance > challenge.maxDistance) {
          return false;
        }
        return true;
      });
    }

    // Transform and optionally validate activities
    const transformedActivities = filteredActivities.map((activity: StravaActivity) => {
      const validation = challenge 
        ? validateActivityForChallenge(activity, challenge)
        : { valid: true, errors: [] };

      return {
        id: String(activity.id),
        name: activity.name,
        type: activity.type,
        sportType: activity.sport_type,
        date: activity.start_date_local,
        distance: activity.distance,
        distanceKm: (activity.distance / 1000).toFixed(2),
        distanceMi: (activity.distance / 1609.344).toFixed(2),
        movingTime: activity.moving_time,
        movingTimeFormatted: formatDuration(activity.moving_time),
        elapsedTime: activity.elapsed_time,
        elevationGain: Math.round(activity.total_elevation_gain),
        averageSpeed: activity.average_speed,
        pacePerKm: activity.distance > 0 
          ? formatPace(activity.moving_time / (activity.distance / 1000))
          : null,
        pacePerMi: activity.distance > 0 
          ? formatPace(activity.moving_time / (activity.distance / 1609.344))
          : null,
        hasHeartrate: activity.has_heartrate,
        averageHeartrate: activity.average_heartrate,
        maxHeartrate: activity.max_heartrate,
        isTrainer: activity.trainer,
        isManual: activity.manual,
        isPrivate: activity.private,
        stravaUrl: `https://www.strava.com/activities/${activity.id}`,
        // Map data for route visualization
        polyline: activity.map?.summary_polyline || null,
        startLatLng: activity.start_latlng || null,
        endLatLng: activity.end_latlng || null,
        // Validation results (if challenge specified)
        validation,
      };
    });

    return NextResponse.json({
      activities: transformedActivities,
      page,
      perPage,
      hasMore: activities.length === perPage,
      // Include challenge requirements for display
      challengeRequirements: challenge ? {
        activityType: challenge.activityType,
        minDistance: challenge.minDistance,
        maxDistance: challenge.maxDistance,
        minElevationGain: challenge.minElevationGain,
        requiresGPS: challenge.requiresGPS,
        requiresHeartRate: challenge.requiresHeartRate,
      } : null,
      totalBeforeFilter: activities.length,
    });
  } catch (error) {
    console.error("Error fetching Strava activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format seconds per unit into mm:ss pace
 */
function formatPace(secondsPerUnit: number): string {
  if (!isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "--:--";
  const minutes = Math.floor(secondsPerUnit / 60);
  const secs = Math.round(secondsPerUnit % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
