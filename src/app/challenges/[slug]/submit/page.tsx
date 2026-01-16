import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import { SubmitChallengeForm } from "./submit-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SubmitChallengePage({ params }: PageProps) {
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

  // Get challenge
  const challenge = await db.challenge.findUnique({
    where: { slug, isActive: true },
    include: {
      primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
      grades: {
        include: { division: { select: { id: true, name: true } } },
      },
    },
  });

  // Check if user has Strava connected
  const hasStravaConnected = !!user.stravaAthleteId;

  if (!challenge) {
    notFound();
  }

  // Get existing submission if any
  const existingSubmission = await db.challengeSubmission.findUnique({
    where: {
      athleteId_challengeId: {
        athleteId: athlete.id,
        challengeId: challenge.id,
      },
    },
  });

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

  // Get relevant grades for display
  const relevantGrades = athleteDivision 
    ? challenge.grades.filter(g => g.divisionId === athleteDivision.id)
    : [];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      {/* Back button */}
      <Link 
        href={`/challenges/${challenge.slug}`} 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Challenge
      </Link>

      <SubmitChallengeForm 
        challenge={{
          id: challenge.id,
          name: challenge.name,
          slug: challenge.slug,
          gradingType: challenge.gradingType,
          gradingUnit: challenge.gradingUnit,
          timeFormat: challenge.timeFormat,
          primaryDomain: challenge.primaryDomain,
          proofTypes: challenge.proofTypes,
          activityType: challenge.activityType,
          minDistance: challenge.minDistance,
          maxDistance: challenge.maxDistance,
          minElevationGain: challenge.minElevationGain,
          requiresGPS: challenge.requiresGPS,
          requiresHeartRate: challenge.requiresHeartRate,
        }}
        athleteId={athlete.id}
        existingSubmission={existingSubmission ? {
          id: existingSubmission.id,
          videoUrl: existingSubmission.videoUrl,
          notes: existingSubmission.notes,
          achievedValue: existingSubmission.achievedValue,
          status: existingSubmission.status,
          proofType: existingSubmission.proofType,
          stravaActivityId: existingSubmission.stravaActivityId,
          stravaActivityUrl: existingSubmission.stravaActivityUrl,
          isPublic: existingSubmission.isPublic,
          hideExactValue: existingSubmission.hideExactValue,
          claimedTiers: existingSubmission.claimedTiers,
        } : null}
        grades={relevantGrades.map(g => ({
          rank: g.rank,
          targetValue: g.targetValue,
        }))}
        divisionName={athleteDivision?.name || null}
        hasStravaConnected={hasStravaConnected}
      />
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
