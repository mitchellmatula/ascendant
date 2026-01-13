import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AdminPage() {
  // Get counts for overview
  const [
    domainCount,
    categoryCount,
    challengeCount,
    divisionCount,
    userCount,
    athleteCount,
    pendingSubmissions,
  ] = await Promise.all([
    db.domain.count(),
    db.category.count(),
    db.challenge.count(),
    db.division.count(),
    db.user.count(),
    db.athlete.count(),
    db.challengeSubmission.count({ where: { status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Domains", value: domainCount, href: "/admin/domains", icon: "🎯" },
    { label: "Categories", value: categoryCount, href: "/admin/categories", icon: "📁" },
    { label: "Challenges", value: challengeCount, href: "/admin/challenges", icon: "🏆" },
    { label: "Divisions", value: divisionCount, href: "/admin/divisions", icon: "👥" },
    { label: "Users", value: userCount, href: "/admin/users", icon: "👤" },
    { label: "Athletes", value: athleteCount, href: "/admin/users", icon: "🏃" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">
          Manage your Ascendant system configuration
        </p>
      </div>

      {/* Pending Submissions Alert */}
      {pendingSubmissions > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>⚠️</span>
              Pending Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You have <strong>{pendingSubmissions}</strong> submission{pendingSubmissions !== 1 ? "s" : ""} waiting for review.
            </p>
            <Link
              href="/admin/submissions"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Review now →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <span>{stat.icon}</span>
                  {stat.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Setup Guide */}
      {domainCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🚀 Getting Started</CardTitle>
            <CardDescription>
              Set up your Ascendant system in this order:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li className="text-muted-foreground">
                <Link href="/admin/domains" className="text-primary hover:underline">
                  Create Domains
                </Link>
                {" "}– The 4 core areas: Strength, Skill, Endurance, Speed
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/divisions" className="text-primary hover:underline">
                  Set Up Divisions
                </Link>
                {" "}– Age and gender brackets for athletes
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/categories" className="text-primary hover:underline">
                  Add Categories
                </Link>
                {" "}– Organize challenges within each domain
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/challenges" className="text-primary hover:underline">
                  Create Challenges
                </Link>
                {" "}– The actual tasks athletes complete
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/xp-thresholds" className="text-primary hover:underline">
                  Configure XP Thresholds
                </Link>
                {" "}– How much XP is needed per level
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/rank-requirements" className="text-primary hover:underline">
                  Set Rank Requirements
                </Link>
                {" "}– Which challenges unlock which ranks
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
