import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle, Clock, XCircle, Video } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string; category: string }>;
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  const { slug, category: categorySlug } = await params;
  const athlete = await getActiveAthlete(user);
  if (!athlete) {
    redirect("/onboarding");
  }

  // Get domain
  const domain = await db.domain.findUnique({
    where: { slug, isActive: true },
  });

  if (!domain) {
    notFound();
  }

  // Get category with challenges
  const category = await db.category.findFirst({
    where: { 
      slug: categorySlug, 
      domainId: domain.id,
      isActive: true,
    },
  });

  if (!category) {
    notFound();
  }

  // Get challenges in this category
  const challenges = await db.challenge.findMany({
    where: {
      isActive: true,
      categories: {
        some: { categoryId: category.id },
      },
    },
    include: {
      primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
      secondaryDomain: { select: { id: true, name: true } },
      tertiaryDomain: { select: { id: true, name: true } },
      disciplines: {
        include: { discipline: { select: { id: true, name: true, icon: true } } },
        take: 3,
      },
      equipment: {
        include: { equipment: { select: { id: true, name: true, icon: true } } },
        take: 3,
      },
      _count: {
        select: { equipment: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Get athlete's submissions for these challenges
  const submissions = await db.challengeSubmission.findMany({
    where: {
      athleteId: athlete.id,
      challengeId: { in: challenges.map(c => c.id) },
    },
    select: {
      challengeId: true,
      status: true,
      achievedRank: true,
    },
  });

  const submissionMap = new Map(submissions.map(s => [s.challengeId, s]));

  // Calculate stats
  const completedCount = submissions.filter(s => s.status === "APPROVED").length;
  const pendingCount = submissions.filter(s => s.status === "PENDING").length;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/domains" className="hover:text-foreground">Domains</Link>
        <span>/</span>
        <Link href={`/domains/${domain.slug}`} className="hover:text-foreground">
          {domain.icon} {domain.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </div>

      {/* Category Header */}
      <Card className="mb-6 md:mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl">{category.icon ?? "📁"}</span>
            <div>
              <CardTitle className="text-xl md:text-2xl">{category.name}</CardTitle>
              <CardDescription className="text-sm md:text-base">
                {category.description || `Challenges in ${category.name}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="text-sm">
              {challenges.length} {challenges.length === 1 ? "challenge" : "challenges"}
            </Badge>
            <Badge variant="default" className="text-sm bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {completedCount} completed
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-sm">
                <Clock className="w-3 h-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Challenges List */}
      <div className="grid gap-4">
        {challenges.map((challenge) => {
          const submission = submissionMap.get(challenge.id);
          const status = submission?.status;
          const achievedRank = submission?.achievedRank;

          return (
            <Link key={challenge.id} href={`/challenges/${challenge.slug}`}>
              <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
                <div className="flex">
                  {/* Thumbnail */}
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-muted">
                    {challenge.demoImageUrl ? (
                      <Image
                        src={challenge.demoImageUrl}
                        alt={challenge.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 96px, 128px"
                      />
                    ) : (
                      <div 
                        className="absolute inset-0 flex items-center justify-center text-3xl"
                        style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}20` : undefined }}
                      >
                        {challenge.demoVideoUrl ? <Video className="w-8 h-8 text-muted-foreground" /> : (challenge.primaryDomain.icon || "🎯")}
                      </div>
                    )}
                    {/* Status overlay */}
                    {status && (
                      <div className={`absolute top-1 left-1 p-1 rounded-full ${
                        status === "APPROVED" ? "bg-green-500" :
                        status === "PENDING" ? "bg-yellow-500" :
                        status === "REJECTED" ? "bg-red-500" :
                        "bg-orange-500"
                      }`}>
                        {status === "APPROVED" && <CheckCircle className="w-3 h-3 text-white" />}
                        {status === "PENDING" && <Clock className="w-3 h-3 text-white" />}
                        {status === "REJECTED" && <XCircle className="w-3 h-3 text-white" />}
                        {status === "NEEDS_REVISION" && <Clock className="w-3 h-3 text-white" />}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 sm:p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                          {challenge.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {challenge.description}
                        </p>
                      </div>
                      {achievedRank && (
                        <Badge 
                          variant="secondary" 
                          className="shrink-0 text-xs font-bold"
                          style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}30` : undefined }}
                        >
                          {achievedRank}
                        </Badge>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}30` : undefined }}
                      >
                        {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
                      </Badge>
                      {challenge.gradingType !== "PASS_FAIL" && (
                        <Badge variant="outline" className="text-xs">
                          {challenge.gradingType === "REPS" ? "Reps" :
                           challenge.gradingType === "TIME" ? "Time" :
                           challenge.gradingType === "DISTANCE" ? "Distance" :
                           challenge.gradingType === "TIMED_REPS" ? "Timed" : challenge.gradingType}
                        </Badge>
                      )}
                      {challenge.disciplines.slice(0, 2).map(d => (
                        <Badge key={d.discipline.id} variant="outline" className="text-xs">
                          {d.discipline.icon}
                        </Badge>
                      ))}
                      {challenge._count.equipment > 0 && (
                        <Badge variant="outline" className="text-xs">
                          🔧 {challenge._count.equipment}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {challenges.length === 0 && (
        <Card className="text-center py-8 md:py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No challenges have been added to this category yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back soon for new challenges!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
