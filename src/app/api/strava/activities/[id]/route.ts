import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchStravaActivity, validateActivityForChallenge } from "@/lib/strava";
import { db } from "@/lib/db";

// GET /api/strava/activities/[id] - Fetch a specific Strava activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const activityId = id;

    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("challengeId");

    // Fetch the activity from Strava
    const activity = await fetchStravaActivity(user.id, activityId);

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found or failed to fetch" },
        { status: 404 }
      );
    }

    // If a challenge is specified, validate the activity
    let validation = { valid: true, errors: [] as string[] };

    if (challengeId) {
      const challenge = await db.challenge.findUnique({
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

      if (challenge) {
        validation = validateActivityForChallenge(activity, challenge);
      }
    }

    // Transform the activity
    const transformedActivity = {
      id: String(activity.id),
      name: activity.name,
      type: activity.type,
      sportType: activity.sport_type,
      description: activity.description || null,
      date: activity.start_date_local,
      timezone: activity.timezone,
      // Distance
      distance: activity.distance,
      distanceKm: (activity.distance / 1000).toFixed(2),
      distanceMi: (activity.distance / 1609.344).toFixed(2),
      // Time
      movingTime: activity.moving_time,
      movingTimeFormatted: formatDuration(activity.moving_time),
      elapsedTime: activity.elapsed_time,
      elapsedTimeFormatted: formatDuration(activity.elapsed_time),
      // Elevation
      elevationGain: Math.round(activity.total_elevation_gain),
      elevationHigh: activity.elev_high,
      elevationLow: activity.elev_low,
      // Speed
      averageSpeed: activity.average_speed,
      maxSpeed: activity.max_speed,
      pacePerKm: activity.distance > 0 
        ? formatPace(activity.moving_time / (activity.distance / 1000))
        : null,
      pacePerMi: activity.distance > 0 
        ? formatPace(activity.moving_time / (activity.distance / 1609.344))
        : null,
      // Heart rate
      hasHeartrate: activity.has_heartrate,
      averageHeartrate: activity.average_heartrate,
      maxHeartrate: activity.max_heartrate,
      // Cadence
      averageCadence: activity.average_cadence,
      // Power (for cycling)
      averageWatts: activity.average_watts,
      maxWatts: activity.max_watts,
      weightedAverageWatts: activity.weighted_average_watts,
      // Calories
      kilojoules: activity.kilojoules,
      calories: activity.calories,
      // Flags
      isTrainer: activity.trainer,
      isManual: activity.manual,
      isPrivate: activity.private,
      isCommute: activity.commute,
      // Links
      stravaUrl: `https://www.strava.com/activities/${activity.id}`,
      // Kudos & comments
      kudosCount: activity.kudos_count,
      commentCount: activity.comment_count,
      // Achievement count
      achievementCount: activity.achievement_count,
      // Gear
      gearId: activity.gear_id,
      // Splits (if available)
      splitsMetric: activity.splits_metric,
      splitsStandard: activity.splits_standard,
      // Validation results
      validation,
    };

    return NextResponse.json(transformedActivity);
  } catch (error) {
    console.error("Error fetching Strava activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
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
