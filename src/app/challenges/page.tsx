import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Trophy, Clock, Target, ChevronRight, ChevronLeft, Zap, Building2, X, Lock, CheckCircle, Search, Wrench } from "lucide-react";
import { ChallengeSearchInput } from "./search-input";
import { GymFilter } from "./gym-filter";

export const metadata: Metadata = {
  title: "Challenges",
  description: "Browse athletic challenges across Strength, Skill, Endurance, and Speed. Complete challenges to earn XP and progress through ranks from F to S.",
  openGraph: {
    title: "Challenges | Ascendant",
    description: "Browse athletic challenges and earn XP to level up your fitness.",
  },
  alternates: {
    canonical: "/challenges",
  },
};

const CHALLENGES_PER_PAGE = 12;

interface ChallengesContentProps {
  gymSlug?: string;
  page: number;
  searchQuery?: string;
  equipmentFilter?: boolean;
}

async function ChallengesContent({ gymSlug, page, searchQuery, equipmentFilter = true }: ChallengesContentProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  const athlete = await getActiveAthlete(user);
  if (!athlete) {
    redirect("/onboarding");
  }

  // If filtering by gym, get gym info and its discipline IDs
  let filterGym: { id: string; name: string; slug: string; disciplines: { disciplineId: string }[]; equipment: { equipmentId: string }[] } | null = null;
  let gymDisciplineIds: string[] = [];
  let gymEquipmentIds: string[] = [];
  
  if (gymSlug) {
    filterGym = await db.gym.findUnique({
      where: { slug: gymSlug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        disciplines: { select: { disciplineId: true } },
        equipment: { select: { equipmentId: true } },
      },
    });
    if (filterGym) {
      gymDisciplineIds = filterGym.disciplines.map(d => d.disciplineId);
      gymEquipmentIds = filterGym.equipment.map(e => e.equipmentId);
    }
  }

  // Get user's gym memberships to show gym-specific challenges
  const userGymMemberships = await db.gymMember.findMany({
    where: { userId: user.id, isActive: true },
    select: { gymId: true },
  });
  const memberGymIds = userGymMemberships.map(m => m.gymId);

  // Get user's gyms for the filter dropdown
  const userGyms = await db.gym.findMany({
    where: {
      id: { in: memberGymIds },
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
    },
    orderBy: { name: "asc" },
  });

  // Get athlete's disciplines
  const athleteDisciplines = await db.athleteDiscipline.findMany({
    where: { athleteId: athlete.id },
    include: { discipline: true },
  });

  const disciplineIds = athleteDisciplines.map(ad => ad.disciplineId);

  // Calculate athlete's age for division matching
  const getAge = (dateOfBirth: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  };

  // Get athlete's division
  const athleteDivision = await db.division.findFirst({
    where: {
      isActive: true,
      OR: [
        { gender: athlete.gender },
        { gender: null },
      ],
      AND: [
        {
          OR: [
            { ageMin: null },
            { ageMin: { lte: getAge(athlete.dateOfBirth) } },
          ],
        },
        {
          OR: [
            { ageMax: null },
            { ageMax: { gte: getAge(athlete.dateOfBirth) } },
          ],
        },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });

  // Determine which discipline IDs to filter by for gym filtering
  const filterDisciplineIds = filterGym ? gymDisciplineIds : disciplineIds;

  // Get athlete's submissions
  const submissions = await db.challengeSubmission.findMany({
    where: { athleteId: athlete.id },
    select: { challengeId: true, status: true, achievedRank: true },
  });

  const submissionMap = new Map(submissions.map(s => [s.challengeId, s]));
  const completedChallengeIds = submissions
    .filter(s => s.status === "APPROVED")
    .map(s => s.challengeId);

  // Equipment filter for gym: only show challenges where gym has ALL required equipment
  // This excludes challenges that have any required equipment the gym doesn't have
  const equipmentFilterCondition = filterGym && equipmentFilter && gymEquipmentIds.length > 0
    ? {
        // Exclude challenges that have required equipment NOT in gym's equipment list
        NOT: {
          equipment: {
            some: {
              isRequired: true,
              equipmentId: { notIn: gymEquipmentIds },
            },
          },
        },
      }
    : filterGym && equipmentFilter
    ? {
        // Gym has no equipment - only show challenges with no required equipment
        equipment: { none: { isRequired: true } },
      }
    : {};

  // Base challenge filter (access control)
  const baseChallengeFilter = {
    isActive: true,
    AND: [
      // Search filter - search in name and description
      ...(searchQuery
        ? [
            {
              OR: [
                { name: { contains: searchQuery, mode: "insensitive" as const } },
                { description: { contains: searchQuery, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      // Show global challenges OR gym-specific challenges user has access to
      {
        OR: [
          { gymId: null },
          ...(memberGymIds.length > 0 ? [{ gymId: { in: memberGymIds } }] : []),
        ],
      },
      // Division filter: no restrictions OR athlete's division is allowed
      {
        OR: [
          { allowedDivisions: { none: {} } },
          ...(athleteDivision ? [{ allowedDivisions: { some: { divisionId: athleteDivision.id } } }] : []),
        ],
      },
      // Equipment filter (only when filtering by gym)
      ...(Object.keys(equipmentFilterCondition).length > 0 ? [equipmentFilterCondition] : []),
    ],
  };

  const challengeInclude = {
    primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
    disciplines: { include: { discipline: true } },
    categories: { include: { category: true } },
    gym: { select: { id: true, name: true, slug: true } },
    _count: { select: { submissions: true } },
  } as const;

  // Define challenge type with includes
  type ChallengeWithIncludes = Awaited<ReturnType<typeof db.challenge.findMany<{ include: typeof challengeInclude }>>>[0];

  // Count challenges in each category
  const [forYouCount, allOthersCount, completedCount] = await Promise.all([
    // For You: matches user's disciplines, not completed
    filterDisciplineIds.length > 0
      ? db.challenge.count({
          where: {
            ...baseChallengeFilter,
            disciplines: { some: { disciplineId: { in: filterDisciplineIds } } },
            id: { notIn: completedChallengeIds },
          },
        })
      : 0,
    // All Others: doesn't match disciplines, not completed
    db.challenge.count({
      where: {
        ...baseChallengeFilter,
        ...(filterDisciplineIds.length > 0 && {
          NOT: { disciplines: { some: { disciplineId: { in: filterDisciplineIds } } } },
        }),
        id: { notIn: completedChallengeIds },
      },
    }),
    // Completed
    completedChallengeIds.length > 0
      ? db.challenge.count({
          where: {
            ...baseChallengeFilter,
            id: { in: completedChallengeIds },
          },
        })
      : 0,
  ]);

  const totalChallenges = forYouCount + allOthersCount + completedCount;
  const totalPages = Math.ceil(totalChallenges / CHALLENGES_PER_PAGE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const skip = (currentPage - 1) * CHALLENGES_PER_PAGE;

  // Determine which challenges to fetch based on pagination offset
  let challenges: ChallengeWithIncludes[] = [];
  let remaining = CHALLENGES_PER_PAGE;
  let currentSkip = skip;

  // Phase 1: For You challenges
  if (currentSkip < forYouCount && remaining > 0 && filterDisciplineIds.length > 0) {
    const takeFromForYou = Math.min(remaining, forYouCount - currentSkip);
    const forYouChallenges = await db.challenge.findMany({
      where: {
        ...baseChallengeFilter,
        disciplines: { some: { disciplineId: { in: filterDisciplineIds } } },
        id: { notIn: completedChallengeIds },
      },
      include: challengeInclude,
      orderBy: { name: "asc" },
      skip: currentSkip,
      take: takeFromForYou,
    });
    challenges.push(...forYouChallenges);
    remaining -= forYouChallenges.length;
    currentSkip = 0;
  } else {
    currentSkip = Math.max(0, currentSkip - forYouCount);
  }

  // Phase 2: All Others challenges
  if (currentSkip < allOthersCount && remaining > 0) {
    const takeFromAll = Math.min(remaining, allOthersCount - currentSkip);
    const allOthersChallenges = await db.challenge.findMany({
      where: {
        ...baseChallengeFilter,
        ...(filterDisciplineIds.length > 0 && {
          NOT: { disciplines: { some: { disciplineId: { in: filterDisciplineIds } } } },
        }),
        id: { notIn: completedChallengeIds },
      },
      include: challengeInclude,
      orderBy: { name: "asc" },
      skip: currentSkip,
      take: takeFromAll,
    });
    challenges.push(...allOthersChallenges);
    remaining -= allOthersChallenges.length;
    currentSkip = 0;
  } else {
    currentSkip = Math.max(0, currentSkip - allOthersCount);
  }

  // Phase 3: Completed challenges
  if (currentSkip < completedCount && remaining > 0 && completedChallengeIds.length > 0) {
    const takeFromCompleted = Math.min(remaining, completedCount - currentSkip);
    const completedChallenges = await db.challenge.findMany({
      where: {
        ...baseChallengeFilter,
        id: { in: completedChallengeIds },
      },
      include: challengeInclude,
      orderBy: { name: "asc" },
      skip: currentSkip,
      take: takeFromCompleted,
    });
    challenges.push(...completedChallenges);
  }

  // Get all disciplines for the "By Discipline" section
  const allDisciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Grading type display
  const gradingTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    PASS_FAIL: { label: "Pass/Fail", icon: <Target className="w-3 h-3" /> },
    REPS: { label: "Reps", icon: <Dumbbell className="w-3 h-3" /> },
    TIME: { label: "Timed", icon: <Clock className="w-3 h-3" /> },
    DISTANCE: { label: "Distance", icon: <Target className="w-3 h-3" /> },
    TIMED_REPS: { label: "Timed Reps", icon: <Clock className="w-3 h-3" /> },
  };

  // Helper to determine challenge category for visual indicator
  const getChallengeCategory = (challengeId: string, challengeDisciplines: { disciplineId: string }[]) => {
    if (completedChallengeIds.includes(challengeId)) {
      return "completed";
    }
    if (filterDisciplineIds.length > 0 && challengeDisciplines.some(cd => filterDisciplineIds.includes(cd.disciplineId))) {
      return "for-you";
    }
    return "all";
  };

  const ChallengeCard = ({ challenge }: { challenge: typeof challenges[0] }) => {
    const submission = submissionMap.get(challenge.id);
    const grading = gradingTypeLabels[challenge.gradingType] || { label: challenge.gradingType, icon: null };
    const isGymExclusive = !!challenge.gym;
    const category = getChallengeCategory(challenge.id, challenge.disciplines);

    return (
      <Link href={`/challenges/${challenge.slug}`} className="block group">
        <Card className={`h-full transition-all hover:shadow-md hover:border-primary/50 overflow-hidden ${
          category === "completed" ? "opacity-75" : ""
        }`}>
          {/* Thumbnail */}
          <div className="relative aspect-video bg-muted">
            {challenge.demoImageUrl ? (
              <Image
                src={challenge.demoImageUrl}
                alt={challenge.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Category indicator */}
            {category === "for-you" && !submission && (
              <div className="absolute top-2 left-2">
                <Badge className="text-xs gap-1 bg-blue-500 text-white border-0">
                  <Zap className="w-3 h-3" />
                  For You
                </Badge>
              </div>
            )}
            
            {/* Gym exclusive badge */}
            {isGymExclusive && (
              <div className={`absolute ${category === "for-you" && !submission ? "top-9" : "top-2"} left-2`}>
                <Badge variant="secondary" className="text-xs gap-1 backdrop-blur-sm bg-amber-500/90 text-white border-0">
                  <Lock className="w-3 h-3" />
                  {challenge.gym!.name}
                </Badge>
              </div>
            )}

            {/* Status badge overlay */}
            {submission && (
              <div className="absolute top-2 right-2">
                {submission.status === "APPROVED" ? (
                  <Badge className="bg-green-500 text-white gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {submission.achievedRank} Tier
                  </Badge>
                ) : submission.status === "PENDING" ? (
                  <Badge variant="secondary">Pending Review</Badge>
                ) : submission.status === "REJECTED" ? (
                  <Badge variant="destructive">Rejected</Badge>
                ) : null}
              </div>
            )}

            {/* Domain badge */}
            <div className="absolute bottom-2 left-2">
              <Badge 
                variant="secondary"
                className="text-xs backdrop-blur-sm"
                style={{ 
                  backgroundColor: challenge.primaryDomain.color 
                    ? `${challenge.primaryDomain.color}dd` 
                    : undefined,
                  color: "white",
                }}
              >
                {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
              </Badge>
            </div>
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-1 group-hover:text-accent transition-colors line-clamp-1">
              {challenge.name}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {challenge.description}
            </p>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Grading type */}
              <Badge variant="outline" className="text-xs gap-1">
                {grading.icon}
                {grading.label}
              </Badge>

              {/* Disciplines */}
              {challenge.disciplines.slice(0, 2).map(cd => (
                <Badge key={cd.id} variant="secondary" className="text-xs">
                  {cd.discipline.icon} {cd.discipline.name}
                </Badge>
              ))}
              {challenge.disciplines.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{challenge.disciplines.length - 2}
                </Badge>
              )}
            </div>

            {/* Submission count */}
            <div className="mt-3 text-xs text-muted-foreground">
              {challenge._count.submissions} submission{challenge._count.submissions !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Build pagination URL
  const buildPageUrl = (pageNum: number, includeEquipment = true) => {
    const params = new URLSearchParams();
    if (gymSlug) params.set("gym", gymSlug);
    if (searchQuery) params.set("q", searchQuery);
    if (pageNum > 1) params.set("page", pageNum.toString());
    if (!includeEquipment && filterGym) params.set("equipment", "false");
    const query = params.toString();
    return `/challenges${query ? `?${query}` : ""}`;
  };

  // Count challenges without equipment filter to show how many are hidden
  let challengesWithoutEquipmentFilter = 0;
  if (filterGym && equipmentFilter) {
    // Create a filter without equipment restriction
    const noEquipmentFilter = {
      isActive: true,
      AND: [
        ...(searchQuery
          ? [
              {
                OR: [
                  { name: { contains: searchQuery, mode: "insensitive" as const } },
                  { description: { contains: searchQuery, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
        {
          OR: [
            { gymId: null },
            ...(memberGymIds.length > 0 ? [{ gymId: { in: memberGymIds } }] : []),
          ],
        },
        {
          OR: [
            { allowedDivisions: { none: {} } },
            ...(athleteDivision ? [{ allowedDivisions: { some: { divisionId: athleteDivision.id } } }] : []),
          ],
        },
        // Only discipline filter, no equipment
        ...(gymDisciplineIds.length > 0 
          ? [{ disciplines: { some: { disciplineId: { in: gymDisciplineIds } } } }]
          : []),
      ],
    };
    challengesWithoutEquipmentFilter = await db.challenge.count({
      where: noEquipmentFilter,
    });
  }
  const hiddenByEquipment = challengesWithoutEquipmentFilter - totalChallenges;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Gym Filter Banner */}
      {filterGym && (
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  Showing challenges for <span className="text-primary">{filterGym.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalChallenges} challenge{totalChallenges !== 1 ? "s" : ""} available
                  {equipmentFilter && gymEquipmentIds.length > 0 && (
                    <span className="ml-1">
                      • Equipment filtered ({gymEquipmentIds.length} items)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Link href="/challenges">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <X className="w-4 h-4" />
                Clear filter
              </Button>
            </Link>
          </div>
          
          {/* Equipment filter toggle */}
          {equipmentFilter && hiddenByEquipment > 0 && (
            <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wrench className="w-3.5 h-3.5" />
                <span>{hiddenByEquipment} challenge{hiddenByEquipment !== 1 ? "s" : ""} hidden (missing equipment)</span>
              </div>
              <Link href={`/challenges?gym=${gymSlug}${searchQuery ? `&q=${searchQuery}` : ""}&equipment=false`}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  Show all
                </Button>
              </Link>
            </div>
          )}
          
          {!equipmentFilter && filterGym && (
            <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <Wrench className="w-3.5 h-3.5" />
                <span>Showing all challenges (some may need equipment this gym doesn&apos;t have)</span>
              </div>
              <Link href={`/challenges?gym=${gymSlug}${searchQuery ? `&q=${searchQuery}` : ""}`}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  Filter by equipment
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h1 className="text-2xl md:text-3xl font-bold">Challenges</h1>
        </div>
        <p className="text-muted-foreground">
          {filterGym 
            ? `Challenges you can train at ${filterGym.name}`
            : "Earn XP by completing challenges tailored to your training"
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{forYouCount}</div>
              <div className="text-xs text-muted-foreground">For You</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{allOthersCount}</div>
              <div className="text-xs text-muted-foreground">Explore</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Trophy className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {submissions.filter(s => s.status === "PENDING").length}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <ChallengeSearchInput />
        </div>
        {userGyms.length > 0 && (
          <GymFilter gyms={userGyms} currentGymSlug={gymSlug} />
        )}
      </div>

      {/* Search Results Banner */}
      {searchQuery && (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {totalChallenges} result{totalChallenges !== 1 ? "s" : ""} for &ldquo;<span className="text-primary">{searchQuery}</span>&rdquo;
              </p>
            </div>
          </div>
          <Link href={gymSlug ? `/challenges?gym=${gymSlug}` : "/challenges"}>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <X className="w-4 h-4" />
              Clear search
            </Button>
          </Link>
        </div>
      )}

      {/* Challenge Grid */}
      {challenges.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {challenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Link href={buildPageUrl(currentPage - 1)}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
              </Link>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Link key={pageNum} href={buildPageUrl(pageNum)}>
                      <Button
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    </Link>
                  );
                })}
              </div>

              <Link href={buildPageUrl(currentPage + 1)}>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage >= totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Page info */}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Showing {skip + 1}-{Math.min(skip + CHALLENGES_PER_PAGE, totalChallenges)} of {totalChallenges} challenges
          </p>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No challenges available</h3>
            <p className="text-muted-foreground">
              Check back later for new challenges!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Browse by Discipline */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Browse by Discipline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDisciplines.map(discipline => (
            <Link key={discipline.id} href={`/disciplines/${discipline.slug}`}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ 
                      backgroundColor: discipline.color 
                        ? `${discipline.color}20` 
                        : undefined 
                    }}
                  >
                    {discipline.icon || "🏋️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{discipline.name}</h3>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChallengesPageProps {
  searchParams: Promise<{ gym?: string; page?: string; q?: string; equipment?: string }>;
}

export default async function ChallengesPage({ searchParams }: ChallengesPageProps) {
  const { gym, page, q, equipment } = await searchParams;
  const pageNum = parseInt(page || "1", 10) || 1;
  const searchQuery = q?.trim() || undefined;
  // Equipment filter defaults to true, can be disabled with ?equipment=false
  const equipmentFilter = equipment !== "false";
  
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded mt-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-[4/3] bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    }>
      <ChallengesContent gymSlug={gym} page={pageNum} searchQuery={searchQuery} equipmentFilter={equipmentFilter} />
    </Suspense>
  );
}
