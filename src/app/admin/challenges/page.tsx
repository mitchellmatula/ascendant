import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChallengeList } from "./challenge-list";

export default async function ChallengesPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const [challenges, domains, categories, disciplines, gyms, domainCount, categoryCount] = await Promise.all([
    db.challenge.findMany({
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      include: {
        primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
        secondaryDomain: { select: { id: true, name: true, color: true } },
        tertiaryDomain: { select: { id: true, name: true, color: true } },
        gym: { select: { id: true, name: true } },
        categories: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        disciplines: {
          include: {
            discipline: { select: { id: true, name: true, icon: true } },
          },
        },
        _count: {
          select: { submissions: true, rankRequirements: true, categories: true, disciplines: true, grades: true },
        },
      },
    }),
    db.domain.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, domainId: true },
    }),
    db.discipline.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    db.gym.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.domain.count(),
    db.category.count(),
  ]);

  const canCreateChallenge = domainCount > 0 && categoryCount > 0;

  // Serialize dates for client component
  const serializedChallenges = challenges.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Challenges</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {challenges.length} challenge{challenges.length !== 1 ? "s" : ""} • Manage challenges that athletes can complete for XP
          </p>
        </div>
        {canCreateChallenge ? (
          <Link href="/admin/challenges/new">
            <Button size="lg" className="w-full sm:w-auto">
              + Add Challenge
            </Button>
          </Link>
        ) : (
          <Button size="lg" className="w-full sm:w-auto" disabled>
            + Add Challenge
          </Button>
        )}
      </div>

      {!canCreateChallenge && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-amber-200">
              ⚠️ Before creating challenges, you need to create at least one{" "}
              <Link href="/admin/domains" className="underline font-medium">domain</Link> and one{" "}
              <Link href="/admin/categories" className="underline font-medium">category</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No challenges have been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Challenges are the core content of the system. Athletes complete challenges to earn XP and progress through ranks.
            </p>
            {canCreateChallenge && (
              <Link href="/admin/challenges/new">
                <Button>Create Your First Challenge</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <ChallengeList 
          challenges={serializedChallenges}
          domains={domains}
          categories={categories}
          disciplines={disciplines}
          gyms={gyms}
        />
      )}
    </div>
  );
}
