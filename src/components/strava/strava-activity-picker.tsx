"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import dynamic from "next/dynamic";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Heart,
  Loader2,
  Mountain,
  Route,
  Search,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import map to avoid SSR issues with Leaflet
const StravaRouteMap = dynamic(
  () => import("@/components/strava/strava-route-map").then((m) => m.StravaRouteMap),
  { ssr: false, loading: () => <Skeleton className="h-24 w-28 rounded-lg" /> }
);

interface StravaActivityPickerProps {
  challengeId?: string;
  onSelect: (activity: TransformedActivity) => void;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export interface TransformedActivity {
  id: string;
  name: string;
  type: string;
  sportType: string;
  date: string;
  distance: number;
  distanceKm: string;
  distanceMi: string;
  movingTime: number;
  movingTimeFormatted: string;
  elapsedTime: number;
  elevationGain: number;
  averageSpeed: number;
  pacePerKm: string | null;
  pacePerMi: string | null;
  hasHeartrate: boolean;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  isTrainer: boolean;
  isManual: boolean;
  isPrivate: boolean;
  stravaUrl: string;
  polyline: string | null;
  startLatLng: [number, number] | null;
  endLatLng: [number, number] | null;
  validation: {
    valid: boolean;
    errors: string[];
  };
}

const TIME_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
];

const ACTIVITY_TYPES = [
  { value: "all", label: "All types" },
  { value: "Run", label: "🏃 Run" },
  { value: "Ride", label: "🚴 Ride" },
  { value: "Swim", label: "🏊 Swim" },
  { value: "Walk", label: "🚶 Walk" },
  { value: "Hike", label: "🥾 Hike" },
  { value: "WeightTraining", label: "🏋️ Weight Training" },
  { value: "Workout", label: "💪 Workout" },
];

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  Run: "🏃",
  Ride: "🚴",
  Swim: "🏊",
  Walk: "🚶",
  Hike: "🥾",
  WeightTraining: "🏋️",
  Workout: "💪",
  Yoga: "🧘",
  Crossfit: "🔥",
  Rowing: "🚣",
  VirtualRide: "🚴‍♂️",
  VirtualRun: "🏃‍♂️",
};

export function StravaActivityPicker({
  challengeId,
  onSelect,
  disabled,
  trigger,
}: StravaActivityPickerProps) {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<TransformedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("90");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [minDistanceFilter, setMinDistanceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [challengeRequirements, setChallengeRequirements] = useState<{
    activityType: string | null;
    minDistance: number | null;
    maxDistance: number | null;
    minElevationGain: number | null;
  } | null>(null);
  const [totalBeforeFilter, setTotalBeforeFilter] = useState(0);

  // Filter activities client-side for instant feedback
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Activity type filter
      if (activityTypeFilter !== "all" && activity.type !== activityTypeFilter) {
        return false;
      }
      
      // Minimum distance filter (in km)
      if (minDistanceFilter) {
        const minKm = parseFloat(minDistanceFilter);
        if (!isNaN(minKm) && activity.distance < minKm * 1000) {
          return false;
        }
      }
      
      // Search query (name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!activity.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [activities, activityTypeFilter, minDistanceFilter, searchQuery]);

  const fetchActivities = async (pageNum: number = 1, append: boolean = false, retryCount: number = 0) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        perPage: "20",
      });

      if (challengeId) {
        params.set("challengeId", challengeId);
      }

      if (timeRange !== "all") {
        const days = parseInt(timeRange);
        const after = Math.floor(startOfDay(subDays(new Date(), days)).getTime() / 1000);
        params.set("after", String(after));
      }

      const response = await fetchWithAuth(`/api/strava/activities?${params}`);
      
      // Retry once on 401 (auth may not be ready yet on initial load)
      if (response.status === 401 && retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchActivities(pageNum, append, retryCount + 1);
      }
      
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NOT_CONNECTED") {
          setError("Please connect your Strava account in Settings → Connections");
        } else {
          setError(data.error || "Failed to fetch activities");
        }
        return;
      }

      if (append) {
        setActivities((prev) => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }
      setHasMore(data.hasMore);
      setPage(pageNum);
      setChallengeRequirements(data.challengeRequirements || null);
      setTotalBeforeFilter(data.totalBeforeFilter || data.activities.length);
    } catch {
      setError("Failed to connect to Strava");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch activities when dialog opens or time range changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      fetchActivities(1);
    }
  }, [open, timeRange]);

  const handleSelect = (activity: TransformedActivity) => {
    onSelect(activity);
    setOpen(false);
  };

  const handleLoadMore = () => {
    fetchActivities(page + 1, true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" disabled={disabled}>
            <Zap className="mr-2 h-4 w-4 text-[#FC4C02]" />
            Select Strava Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Select an Activity
          </DialogTitle>
          <DialogDescription>
            Choose a Strava activity to submit as proof for this challenge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 border-b">
          {/* Main controls row */}
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Button
              type="button"
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Min distance:</span>
                <Input
                  type="number"
                  placeholder="km"
                  value={minDistanceFilter}
                  onChange={(e) => setMinDistanceFilter(e.target.value)}
                  className="w-20"
                  min={0}
                  step={0.5}
                />
              </div>
            </div>
          )}

          {/* Challenge requirements banner */}
          {challengeRequirements && (challengeRequirements.activityType || challengeRequirements.minDistance || challengeRequirements.maxDistance) && (
            <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-sm">
              <span className="font-medium text-orange-700 dark:text-orange-400">Challenge requires: </span>
              <span className="text-orange-600 dark:text-orange-300">
                {[
                  challengeRequirements.activityType,
                  challengeRequirements.minDistance && `≥${(challengeRequirements.minDistance / 1000).toFixed(1)}km`,
                  challengeRequirements.maxDistance && `≤${(challengeRequirements.maxDistance / 1000).toFixed(1)}km`,
                  challengeRequirements.minElevationGain && `≥${challengeRequirements.minElevationGain}m elevation`,
                ].filter(Boolean).join(", ")}
              </span>
              {totalBeforeFilter > activities.length && (
                <span className="text-muted-foreground ml-1">
                  ({totalBeforeFilter - activities.length} activities hidden)
                </span>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredActivities.length} of {activities.length} {activities.length === 1 ? "activity" : "activities"}
            {(activityTypeFilter !== "all" || minDistanceFilter || searchQuery) && " (filtered)"}
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="text-destructive">{error}</p>
            {error.includes("connect") && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => (window.location.href = "/settings/connections")}
              >
                Go to Connections →
              </Button>
            )}
          </div>
        ) : loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Route className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No activities found in this time period.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a longer time range.
            </p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Filter className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No activities match your filters.</p>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setActivityTypeFilter("all");
                setMinDistanceFilter("");
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onSelect={() => handleSelect(activity)}
                  showValidation={!!challengeId}
                />
              ))}

              {hasMore && (
                <div className="pt-2 pb-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityCard({
  activity,
  onSelect,
  showValidation,
}: {
  activity: TransformedActivity;
  onSelect: () => void;
  showValidation: boolean;
}) {
  const isValid = activity.validation.valid;
  const icon = ACTIVITY_TYPE_ICONS[activity.type] || "🏃";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all hover:border-[#FC4C02] hover:bg-muted/50",
        !isValid && showValidation && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Route map thumbnail */}
        {activity.polyline && (
          <div className="flex-shrink-0 w-28 h-24 rounded-lg overflow-hidden border">
            <StravaRouteMap
              polyline={activity.polyline}
              startLatLng={activity.startLatLng}
              endLatLng={activity.endLatLng}
              height={96}
              interactive={false}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="font-medium truncate">{activity.name}</span>
            {activity.isManual && (
              <Badge variant="outline" className="text-xs">
                Manual
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground mt-1">
            {format(new Date(activity.date), "MMM d, yyyy 'at' h:mm a")}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
            {activity.distance > 0 && (
              <span className="flex items-center gap-1">
                <Route className="h-3.5 w-3.5" />
                {activity.distanceKm} km ({activity.distanceMi} mi)
              </span>
            )}

            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {activity.movingTimeFormatted}
            </span>

            {activity.elevationGain > 0 && (
              <span className="flex items-center gap-1">
                <Mountain className="h-3.5 w-3.5" />
                {activity.elevationGain}m
              </span>
            )}

            {activity.hasHeartrate && activity.averageHeartrate && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-red-500" />
                {Math.round(activity.averageHeartrate)} bpm
              </span>
            )}
          </div>

          {/* Validation status */}
          {showValidation && (
            <div className="mt-2">
              {isValid ? (
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Meets requirements
                </Badge>
              ) : (
                <div className="space-y-1">
                  {activity.validation.errors.map((error, i) => (
                    <Badge key={i} variant="secondary" className="text-red-600 bg-red-50">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {error}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <a
          href={activity.stravaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-[#FC4C02] p-1"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </button>
  );
}

function ActivitySkeleton() {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-start gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36 mt-1" />
          <div className="flex gap-4 mt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}
