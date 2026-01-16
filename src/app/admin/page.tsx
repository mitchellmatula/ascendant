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
    disciplineCount,
    equipmentCount,
    gymCount,
    userCount,
    athleteCount,
    suspendedUserCount,
    pendingSubmissionCount,
    breakthroughRuleCount,
  ] = await Promise.all([
    db.domain.count(),
    db.category.count(),
    db.challenge.count(),
    db.division.count(),
    db.discipline.count(),
    db.equipment.count(),
    db.gym.count(),
    db.user.count(),
    db.athlete.count(),
    db.user.count({ where: { suspendedAt: { not: null } } }),
    db.challengeSubmission.count({ where: { status: "PENDING" } }),
    db.breakthroughRule.count(),
  ]);

  const stats = [
    { label: "Pending Reviews", value: pendingSubmissionCount, href: "/admin/submissions", icon: "📝", highlight: pendingSubmissionCount > 0 },
    { label: "Domains", value: domainCount, href: "/admin/domains", icon: "🎯" },
    { label: "Categories", value: categoryCount, href: "/admin/categories", icon: "📁" },
    { label: "Challenges", value: challengeCount, href: "/admin/challenges", icon: "🏆" },
    { label: "Divisions", value: divisionCount, href: "/admin/divisions", icon: "👥" },
    { label: "Disciplines", value: disciplineCount, href: "/admin/disciplines", icon: "🥷" },
    { label: "Equipment", value: equipmentCount, href: "/admin/equipment", icon: "🏋️" },
    { label: "Breakthroughs", value: breakthroughRuleCount, href: "/admin/breakthroughs", icon: "✨" },
    { label: "Gyms", value: gymCount, href: "/admin/gyms", icon: "🏢" },
    { label: "Users", value: userCount, href: "/admin/users", icon: "👤" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">
          Manage your Ascendant system configuration
        </p>
      </div>

      {/* Suspended Users Alert */}
      {suspendedUserCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🚫</span>
              Suspended Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <strong>{suspendedUserCount}</strong> user{suspendedUserCount !== 1 ? "s" : ""} currently suspended.
            </p>
            <Link
              href="/admin/users"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View users →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`hover:shadow-lg transition-shadow cursor-pointer h-full ${stat.highlight ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <span>{stat.icon}</span>
                  {stat.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.highlight ? "text-primary" : ""}`}>{stat.value}</div>
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
                <Link href="/admin/disciplines" className="text-primary hover:underline">
                  Add Disciplines
                </Link>
                {" "}– Sports/activities like Ninja, Calisthenics, Parkour
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/categories" className="text-primary hover:underline">
                  Add Categories
                </Link>
                {" "}– Organize challenges within each domain
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/equipment" className="text-primary hover:underline">
                  Set Up Equipment
                </Link>
                {" "}– Equipment needed for challenges
              </li>
              <li className="text-muted-foreground">
                <Link href="/admin/challenges" className="text-primary hover:underline">
                  Create Challenges
                </Link>
                {" "}– The actual tasks athletes complete for XP
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
