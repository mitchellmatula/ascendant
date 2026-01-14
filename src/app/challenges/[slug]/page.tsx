import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoDisplay } from "@/components/ui/video-display";
import { formatSecondsToTime, type TimeFormat } from "@/components/ui/time-input";
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
  Sparkles
} from "lucide-react";
import { XP_PER_TIER } from "@/lib/xp";

interface PageProps {
  params: Promise<{ slug: string }>;
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
  const athlete = user.athlete ?? user.managedAthletes[0];

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
    },
  });

  if (!challenge) {
    notFound();
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

  // Filter grades to athlete's division
  const relevantGrades = athleteDivision 
    ? challenge.grades.filter(g => g.divisionId === athleteDivision.id)
    : [];

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
              {athleteDivision && (
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {athleteDivision.name}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Achieve higher tiers for more XP. Measured in {challenge.gradingUnit || "units"}.
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

            {/* Example calculation */}
            <div className="pt-3 mt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Example: If you earn 100 XP</p>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="secondary" 
                  style={{ 
                    backgroundColor: `${challenge.primaryDomain.color}20` || undefined,
                    color: challenge.primaryDomain.color || undefined,
                  }}
                >
                  {challenge.primaryDomain.icon} +{challenge.primaryXPPercent} XP
                </Badge>
                {challenge.secondaryDomain && challenge.secondaryXPPercent && challenge.secondaryXPPercent > 0 && (
                  <Badge variant="outline">
                    {challenge.secondaryDomain.icon} +{challenge.secondaryXPPercent} XP
                  </Badge>
                )}
                {challenge.tertiaryDomain && challenge.tertiaryXPPercent && challenge.tertiaryXPPercent > 0 && (
                  <Badge variant="outline">
                    {challenge.tertiaryDomain.icon} +{challenge.tertiaryXPPercent} XP
                  </Badge>
                )}
              </div>
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
