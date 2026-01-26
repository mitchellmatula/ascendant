import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StravaConnectButton } from "@/components/settings/strava-connect-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ConnectionsPageProps {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function ConnectionsSettingsPage({ searchParams }: ConnectionsPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/sign-in");
  }

  // Connection status from user data
  const stravaConnected = !!user.stravaAthleteId;
  const stravaConnectedDate = user.stravaConnectedAt;

  // Check for success/error messages from OAuth callback
  const successMessage = params.success === "strava_connected" 
    ? "Strava connected successfully! You can now submit activities for challenges."
    : null;

  const errorMessages: Record<string, string> = {
    strava_denied: "You declined to connect Strava. You can try again anytime.",
    strava_no_code: "No authorization code received from Strava. Please try again.",
    strava_invalid_state: "Invalid state parameter. Please try connecting again.",
    strava_token_failed: "Failed to get access token from Strava. Please try again.",
    strava_already_linked: "This Strava account is already connected to another user.",
    strava_error: "An error occurred connecting to Strava. Please try again.",
  };

  const errorMessage = params.error ? errorMessages[params.error] || "An unknown error occurred." : null;

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Connect external fitness apps to automatically import activities for challenge submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strava Connection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#FC4C02]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#FC4C02]">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Strava</span>
                  {stravaConnected ? (
                    <Badge variant="default" className="bg-green-600">Connected</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Not Connected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stravaConnected 
                    ? `Connected ${stravaConnectedDate ? new Date(stravaConnectedDate).toLocaleDateString() : ""}`
                    : "Connect to import running, cycling, and swimming activities"
                  }
                </p>
              </div>
            </div>
            
            <StravaConnectButton connected={stravaConnected} />
          </div>

          {/* Tip: Garmin → Strava sync */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong>Garmin users:</strong> Connect Garmin to Strava to sync your activities automatically. 
              Most Garmin users already have this enabled in the Garmin Connect app.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Why Connect?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Connecting your fitness apps allows you to:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Submit running, cycling, and endurance challenges with verified data</li>
            <li>Automatically import your distances, times, and elevation</li>
            <li>Get instant verification without manual video review</li>
            <li>Track your outdoor activities alongside gym challenges</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              We only access your activity data (distance, time, elevation, heart rate) for challenge verification.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              We never post to your account or share your data with third parties.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              You can disconnect at any time to revoke our access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
