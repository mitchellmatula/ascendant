import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoDisplay } from "@/components/ui/video-display";
import { formatSecondsToTime, type TimeFormat } from "@/lib/time";
import { 
  ChevronLeft, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Dumbbell,
  Target,
  Trophy,
  Upload,
  Sparkles,
  Lock
} from "lucide-react";
import { XP_PER_TIER } from "@/lib/xp";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await db.challenge.findUnique({
    where: { slug, isActive: true },
    include: {
      primaryDomain: { select: { name: true } },
    },
  });

  if (!challenge) {
    return {
      title: "Challenge Not Found",
    };
  }

  return {
    title: challenge.name,
    description: challenge.description.slice(0, 160),
    openGraph: {
      title: `${challenge.name} | Ascendant Challenge`,
      description: challenge.description.slice(0, 160),
      images: challenge.demoImageUrl ? [challenge.demoImageUrl] : undefined,
    },
    alternates: {
      canonical: `/challenges/${slug}`,
    },
  };
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  const { slug } = await params;
  const athlete = await getActiveAthlete(user);
  if (!athlete) {
    redirect("/onboarding");
  }

  // Get challenge with all related data
  const challenge = await db.challenge.findUnique({
    where: { slug, isActive: true },
    include: {
      primaryDomain: { select: { id: true, name: true, icon: true, color: true, slug: true } },
      secondaryDomain: { select: { id: true, name: true, icon: true } },
      tertiaryDomain: { select: { id: true, name: true, icon: true } },
      categories: {
        include: { 
          category: { 
            include: { domain: { select: { slug: true } } },
          } 
        },
      },
      disciplines: {
        include: { discipline: { select: { id: true, name: true, icon: true } } },
      },
      equipment: {
        include: { equipment: { select: { id: true, name: true, icon: true, imageUrl: true } } },
      },
      grades: {
        orderBy: [{ division: { sortOrder: "asc" } }, { rank: "asc" }],
        include: { division: { select: { id: true, name: true } } },
      },
      gym: { select: { id: true, name: true, slug: true } },
      allowedDivisions: {
        include: { division: { select: { id: true, name: true } } },
      },
    },
  });

  if (!challenge) {
    notFound();
  }

  // Check gym-specific access: if challenge belongs to a gym, user must be a member
  let isGymMember = false;
  if (challenge.gym) {
    const membership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: challenge.gym.id,
          userId: user.id,
        },
      },
    });
    isGymMember = membership?.isActive ?? false;
    
    if (!isGymMember) {
      // User is not a member of this gym - show access denied
      return (
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Gym-Exclusive Challenge</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                This challenge is exclusive to members of <strong>{challenge.gym.name}</strong>.
                Join the gym to access this challenge.
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4">
                <Button variant="outline" asChild>
                  <Link href="/challenges">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Challenges
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/gym/${challenge.gym.slug}`}>
                    View Gym
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Get athlete's submission for this challenge
  const submission = await db.challengeSubmission.findUnique({
    where: {
      athleteId_challengeId: {
        athleteId: athlete.id,
        challengeId: challenge.id,
      },
    },
  });

  // Get athlete's division to show relevant grades
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

  // Check if athlete's division is allowed (if restrictions exist)
  const hasDivisionRestrictions = challenge.allowedDivisions.length > 0;
  const athleteDivisionAllowed = !hasDivisionRestrictions || 
    (athleteDivision && challenge.allowedDivisions.some(ad => ad.divisionId === athleteDivision.id));

  // Filter grades to athlete's division, or show all if no match
  let relevantGrades = athleteDivision 
    ? challenge.grades.filter(g => g.divisionId === athleteDivision.id)
    : [];
  
  // If no grades for this division but grades exist, show all unique grades (first division's grades as fallback)
  const hasAnyGrades = challenge.grades.length > 0;
  let showingFallbackGrades = false;
  if (relevantGrades.length === 0 && hasAnyGrades) {
    // Get unique grades from the first division that has them
    const firstDivisionId = challenge.grades[0]?.divisionId;
    if (firstDivisionId) {
      relevantGrades = challenge.grades.filter(g => g.divisionId === firstDivisionId);
      showingFallbackGrades = true;
    }
  }

  // Get first category for back link
  const firstCategory = challenge.categories[0]?.category;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      {/* Breadcrumb */}
      {firstCategory && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto">
          <Link href="/domains" className="hover:text-foreground shrink-0">Domains</Link>
          <span>/</span>
          <Link href={`/domains/${challenge.primaryDomain.slug}`} className="hover:text-foreground shrink-0">
            {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
          </Link>
          <span>/</span>
          <Link 
            href={`/domains/${firstCategory.domain.slug}/${firstCategory.slug}`} 
            className="hover:text-foreground shrink-0"
          >
            {firstCategory.name}
          </Link>
          <span>/</span>
          <span className="text-foreground truncate">{challenge.name}</span>
        </div>
      )}

      {/* Video/Image */}
      {(challenge.demoVideoUrl || challenge.demoImageUrl) && (
        <div className="mb-6 rounded-xl overflow-hidden">
          <VideoDisplay 
            url={challenge.demoVideoUrl ?? undefined} 
            fallbackImageUrl={challenge.demoImageUrl ?? undefined}
            title={challenge.name}
          />
        </div>
      )}

      {/* Challenge Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{challenge.name}</h1>
        
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge 
            variant="secondary" 
            className="text-sm"
            style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}30` : undefined }}
          >
            {challenge.primaryDomain.icon} {challenge.primaryDomain.name} ({challenge.primaryXPPercent}%)
          </Badge>
          {challenge.secondaryDomain && challenge.secondaryXPPercent && (
            <Badge variant="outline" className="text-sm">
              {challenge.secondaryDomain.icon} {challenge.secondaryDomain.name} ({challenge.secondaryXPPercent}%)
            </Badge>
          )}
          {challenge.tertiaryDomain && challenge.tertiaryXPPercent && (
            <Badge variant="outline" className="text-sm">
              {challenge.tertiaryDomain.icon} {challenge.tertiaryDomain.name} ({challenge.tertiaryXPPercent}%)
            </Badge>
          )}
          {challenge.gym && (
            <Badge variant="secondary" className="text-sm bg-amber-500/20 text-amber-600">
              🏢 {challenge.gym.name} only
            </Badge>
          )}
          {hasDivisionRestrictions && (
            <Badge 
              variant="secondary" 
              className={`text-sm ${athleteDivisionAllowed 
                ? "bg-blue-500/20 text-blue-600" 
                : "bg-red-500/20 text-red-600"}`}
            >
              👥 {challenge.allowedDivisions.length} division{challenge.allowedDivisions.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Submission Status */}
        {submission && (
          <Card className={`mb-4 ${
            submission.status === "APPROVED" ? "border-green-500/50 bg-green-500/10" :
            submission.status === "PENDING" ? "border-yellow-500/50 bg-yellow-500/10" :
            submission.status === "REJECTED" ? "border-red-500/50 bg-red-500/10" :
            "border-orange-500/50 bg-orange-500/10"
          }`}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                {submission.status === "APPROVED" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {submission.status === "PENDING" && <Clock className="w-5 h-5 text-yellow-500" />}
                {submission.status === "REJECTED" && <XCircle className="w-5 h-5 text-red-500" />}
                {submission.status === "NEEDS_REVISION" && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                <div>
                  <span className="font-medium">
                    {submission.status === "APPROVED" && "Completed!"}
                    {submission.status === "PENDING" && "Submission pending review"}
                    {submission.status === "REJECTED" && "Submission rejected"}
                    {submission.status === "NEEDS_REVISION" && "Revision requested"}
                  </span>
                  {submission.achievedRank && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      Achieved: {submission.achievedRank}-tier • {submission.xpAwarded} XP earned
                    </span>
                  )}
                </div>
              </div>
              {submission.reviewNotes && (
                <p className="text-sm text-muted-foreground mt-2">
                  Reviewer notes: {submission.reviewNotes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <p className="text-muted-foreground">{challenge.description}</p>
      </div>

      {/* Instructions */}
      {challenge.instructions && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              How to Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {challenge.instructions.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grading / Tier Targets */}
      {challenge.gradingType !== "PASS_FAIL" && relevantGrades.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Tier Targets
              {athleteDivision && !showingFallbackGrades && (
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {athleteDivision.name}
                </Badge>
              )}
              {showingFallbackGrades && (
                <Badge variant="secondary" className="ml-2 text-xs font-normal">
                  {relevantGrades[0]?.division?.name || "Sample"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Achieve higher tiers for more XP. 
              {challenge.gradingType === "TIME" 
                ? " Complete in faster time for higher tiers."
                : ` Measured in ${challenge.gradingUnit || "units"}.`}
              {showingFallbackGrades && (
                <span className="block text-amber-500 mt-1">
                  Note: Showing targets for {relevantGrades[0]?.division?.name}. Your division may differ.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center">
              {["F", "E", "D", "C", "B", "A", "S"].map(rank => {
                const grade = relevantGrades.find(g => g.rank === rank);
                const xpForTier = XP_PER_TIER[rank as keyof typeof XP_PER_TIER];
                
                // Format target value based on grading type
                const formatTargetValue = (value: number) => {
                  if (challenge.gradingType === "TIME" && challenge.timeFormat && challenge.timeFormat !== "seconds") {
                    return formatSecondsToTime(value, challenge.timeFormat as TimeFormat);
                  }
                  return value.toString();
                };
                
                return (
                  <div 
                    key={rank} 
                    className={`p-2 rounded-lg ${grade ? "bg-muted" : "bg-muted/30 opacity-50"}`}
                  >
                    <div className="font-bold text-lg">{rank}</div>
                    {grade ? (
                      <>
                        <div className="text-sm font-medium">{formatTargetValue(grade.targetValue)}</div>
                        <div className="text-xs text-muted-foreground">+{xpForTier} XP</div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pass/Fail XP Info */}
      {challenge.gradingType === "PASS_FAIL" && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              XP Reward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-500">+{XP_PER_TIER.F} XP</span>
              <span className="text-muted-foreground">for completing this challenge</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* XP Distribution by Domain */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            XP Distribution
          </CardTitle>
          <CardDescription>
            How XP is distributed across domains when you complete this challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Primary Domain */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: challenge.primaryDomain.color || "#888" }}
                />
                <span className="font-medium">{challenge.primaryDomain.icon} {challenge.primaryDomain.name}</span>
                <Badge variant="secondary" className="text-xs">Primary</Badge>
              </div>
              <span className="font-bold" style={{ color: challenge.primaryDomain.color || undefined }}>
                {challenge.primaryXPPercent}%
              </span>
            </div>
            
            {/* Secondary Domain */}
            {challenge.secondaryDomain && challenge.secondaryXPPercent && challenge.secondaryXPPercent > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full bg-muted-foreground/50"
                  />
                  <span>{challenge.secondaryDomain.icon} {challenge.secondaryDomain.name}</span>
                </div>
                <span className="font-medium text-muted-foreground">
                  {challenge.secondaryXPPercent}%
                </span>
              </div>
            )}
            
            {/* Tertiary Domain */}
            {challenge.tertiaryDomain && challenge.tertiaryXPPercent && challenge.tertiaryXPPercent > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full bg-muted-foreground/30"
                  />
                  <span>{challenge.tertiaryDomain.icon} {challenge.tertiaryDomain.name}</span>
                </div>
                <span className="font-medium text-muted-foreground">
                  {challenge.tertiaryXPPercent}%
                </span>
              </div>
            )}

            {/* Example calculation - show tier-based breakdown for graded challenges */}
            <div className="pt-3 mt-3 border-t border-border">
              {challenge.gradingType !== "PASS_FAIL" && relevantGrades.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    Hit these targets to earn XP
                    {showingFallbackGrades 
                      ? ` (${relevantGrades[0]?.division?.name || "sample division"}):`
                      : ` (${athleteDivision?.name || "Your Division"}):`
                    }
                  </p>
                  <div className="space-y-2">
                    {["S", "A", "B", "C", "D", "E", "F"].map(rank => {
                      const grade = relevantGrades.find(g => g.rank === rank);
                      if (!grade) return null;
                      
                      const tierXP = XP_PER_TIER[rank as keyof typeof XP_PER_TIER];
                      const primaryXP = Math.round(tierXP * (challenge.primaryXPPercent / 100));
                      const secondaryXP = challenge.secondaryXPPercent 
                        ? Math.round(tierXP * (challenge.secondaryXPPercent / 100)) 
                        : 0;
                      const tertiaryXP = challenge.tertiaryXPPercent 
                        ? Math.round(tierXP * (challenge.tertiaryXPPercent / 100)) 
                        : 0;
                      
                      // Format target value based on grading type
                      const formatTargetValue = (value: number) => {
                        if (challenge.gradingType === "TIME" && challenge.timeFormat && challenge.timeFormat !== "seconds") {
                          return formatSecondsToTime(value, challenge.timeFormat as TimeFormat);
                        }
                        return value.toString();
                      };
                      
                      const targetDisplay = formatTargetValue(grade.targetValue);
                      const unitLabel = challenge.gradingType === "TIME" 
                        ? "" 
                        : ` ${challenge.gradingUnit || ""}`.trimEnd();
                      
                      return (
                        <div key={rank} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <span className="font-bold text-base w-6">{rank}</span>
                          <span className="text-muted-foreground hidden sm:inline">•</span>
                          <span className="font-medium text-foreground min-w-[60px]">
                            {targetDisplay}{unitLabel}
                          </span>
                          <span className="text-muted-foreground mx-1">→</span>
                          <div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end">
                            <Badge 
                              variant="secondary" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: `${challenge.primaryDomain.color}20` || undefined,
                                color: challenge.primaryDomain.color || undefined,
                              }}
                            >
                              {challenge.primaryDomain.icon} +{primaryXP}
                            </Badge>
                            {challenge.secondaryDomain && secondaryXP > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {challenge.secondaryDomain.icon} +{secondaryXP}
                              </Badge>
                            )}
                            {challenge.tertiaryDomain && tertiaryXP > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {challenge.tertiaryDomain.icon} +{tertiaryXP}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-1">
                              = {tierXP} XP
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    💡 Beat a higher tier on your first attempt to earn all the XP at once!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">Completing this challenge earns you:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="secondary" 
                      style={{ 
                        backgroundColor: `${challenge.primaryDomain.color}20` || undefined,
                        color: challenge.primaryDomain.color || undefined,
                      }}
                    >
                      {challenge.primaryDomain.icon} +{Math.round(XP_PER_TIER.F * (challenge.primaryXPPercent / 100))} XP
                    </Badge>
                    {challenge.secondaryDomain && challenge.secondaryXPPercent && challenge.secondaryXPPercent > 0 && (
                      <Badge variant="outline">
                        {challenge.secondaryDomain.icon} +{Math.round(XP_PER_TIER.F * (challenge.secondaryXPPercent / 100))} XP
                      </Badge>
                    )}
                    {challenge.tertiaryDomain && challenge.tertiaryXPPercent && challenge.tertiaryXPPercent > 0 && (
                      <Badge variant="outline">
                        {challenge.tertiaryDomain.icon} +{Math.round(XP_PER_TIER.F * (challenge.tertiaryXPPercent / 100))} XP
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Required */}
      {challenge.equipment.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Equipment Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {challenge.equipment.map(e => (
                <Badge key={e.equipment.id} variant="secondary" className="text-sm py-1.5">
                  {e.equipment.icon} {e.equipment.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories & Disciplines */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {challenge.categories.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Categories</div>
                <div className="flex flex-wrap gap-1">
                  {challenge.categories.map(c => (
                    <Badge key={c.category.id} variant="outline" className="text-xs">
                      {c.category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {challenge.disciplines.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Disciplines</div>
                <div className="flex flex-wrap gap-1">
                  {challenge.disciplines.map(d => (
                    <Badge key={d.discipline.id} variant="secondary" className="text-xs">
                      {d.discipline.icon} {d.discipline.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="sticky bottom-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="py-4">
            {!athleteDivisionAllowed ? (
              <>
                <div className="text-center py-2 text-amber-600 dark:text-amber-400 mb-3">
                  <AlertTriangle className="w-5 h-5 inline-block mr-2" />
                  This challenge is not available for your age division
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  Available for: {challenge.allowedDivisions.map(ad => ad.division.name).join(", ")}
                </div>
              </>
            ) : (
              <>
                <Link href={`/challenges/${challenge.slug}/submit`}>
                  <Button size="lg" className="w-full gap-2">
                    <Upload className="w-5 h-5" />
                    {submission 
                      ? submission.status === "APPROVED" 
                        ? "Submit New Attempt"
                        : "Update Submission"
                      : "Submit Attempt"
                    }
                  </Button>
                </Link>
                {submission?.status === "APPROVED" && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Submit again to try for a higher tier!
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}
