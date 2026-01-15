import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ConnectionsSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Placeholder for future Strava/Garmin integration
  const connections = [
    {
      id: "strava",
      name: "Strava",
      icon: "🏃",
      description: "Connect to import running and cycling activities",
      connected: false,
      comingSoon: true,
    },
    {
      id: "garmin",
      name: "Garmin Connect",
      icon: "⌚",
      description: "Sync activities from your Garmin device",
      connected: false,
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Connect external fitness apps to automatically import activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{connection.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{connection.name}</span>
                    {connection.comingSoon && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connection.description}
                  </p>
                </div>
              </div>
              
              {connection.connected ? (
                <Badge variant="default">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not Connected
                </Badge>
              )}
            </div>
          ))}
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
            <li>Automatically import your best times and distances</li>
            <li>Get instant verification without manual review</li>
            <li>Track your outdoor activities alongside gym challenges</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
