import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Video, 
  ChevronRight,
  Target
} from "lucide-react";
import Image from "next/image";

export default async function MySubmissionsPage() {
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

  // Get all submissions for this athlete
  const submissions = await db.challengeSubmission.findMany({
    where: { athleteId: athlete.id },
    include: {
      challenge: {
        include: {
          primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Group by status
  const pending = submissions.filter(s => s.status === "PENDING");
  const needsRevision = submissions.filter(s => s.status === "NEEDS_REVISION");
  const approved = submissions.filter(s => s.status === "APPROVED");
  const rejected = submissions.filter(s => s.status === "REJECTED");

  const totalXP = approved.reduce((sum, s) => sum + (s.xpAwarded || 0), 0);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">My Submissions</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Track the status of your challenge attempts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{pending.length}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{approved.length}</div>
                <div className="text-xs text-muted-foreground">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{needsRevision.length}</div>
                <div className="text-xs text-muted-foreground">Needs Work</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <div className="text-2xl font-bold text-green-600">{totalXP.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">XP Earned</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Section */}
      {needsRevision.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Action Required
          </h2>
          <div className="grid gap-3">
            {needsRevision.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        </div>
      )}

      {/* Pending Section */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Review ({pending.length})
          </h2>
          <div className="grid gap-3">
            {pending.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Approved */}
      {approved.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Completed ({approved.length})
          </h2>
          <div className="grid gap-3">
            {approved.slice(0, 10).map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
            {approved.length > 10 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                And {approved.length - 10} more...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rejected Section */}
      {rejected.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Rejected ({rejected.length})
          </h2>
          <div className="grid gap-3">
            {rejected.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {submissions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground mb-4">
              Start completing challenges to track your progress!
            </p>
            <Link href="/challenges">
              <Button>Browse Challenges</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubmissionCard({ submission }: { 
  submission: {
    id: string;
    status: string;
    achievedRank: string | null;
    achievedValue: number | null;
    xpAwarded: number | null;
    submittedAt: Date;
    reviewNotes: string | null;
    challenge: {
      name: string;
      slug: string;
      gradingType: string;
      gradingUnit: string | null;
      demoImageUrl: string | null;
      primaryDomain: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
      };
    };
  };
}) {
  const statusStyles = {
    PENDING: "border-yellow-500/30 bg-yellow-500/5",
    APPROVED: "border-green-500/30 bg-green-500/5",
    REJECTED: "border-red-500/30 bg-red-500/5",
    NEEDS_REVISION: "border-orange-500/30 bg-orange-500/5",
  };

  const StatusIcon = {
    PENDING: Clock,
    APPROVED: CheckCircle,
    REJECTED: XCircle,
    NEEDS_REVISION: AlertTriangle,
  }[submission.status] || Clock;

  const statusColor = {
    PENDING: "text-yellow-500",
    APPROVED: "text-green-500",
    REJECTED: "text-red-500",
    NEEDS_REVISION: "text-orange-500",
  }[submission.status] || "text-muted-foreground";

  return (
    <Link href={`/challenges/${submission.challenge.slug}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${statusStyles[submission.status as keyof typeof statusStyles] || ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted">
              {submission.challenge.demoImageUrl ? (
                <Image
                  src={submission.challenge.demoImageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div 
                  className="absolute inset-0 flex items-center justify-center text-2xl"
                  style={{ backgroundColor: submission.challenge.primaryDomain.color ? `${submission.challenge.primaryDomain.color}20` : undefined }}
                >
                  {submission.challenge.primaryDomain.icon || "🎯"}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{submission.challenge.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{submission.challenge.primaryDomain.icon} {submission.challenge.primaryDomain.name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <StatusIcon className={`w-5 h-5 shrink-0 ${statusColor}`} />
              </div>

              {/* Result & XP */}
              <div className="flex items-center gap-2 mt-2">
                {submission.achievedRank && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ backgroundColor: submission.challenge.primaryDomain.color ? `${submission.challenge.primaryDomain.color}30` : undefined }}
                  >
                    {submission.achievedRank}-Tier
                  </Badge>
                )}
                {submission.achievedValue && (
                  <span className="text-xs text-muted-foreground">
                    {submission.achievedValue} {submission.challenge.gradingUnit}
                  </span>
                )}
                {submission.xpAwarded && submission.xpAwarded > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
                    +{submission.xpAwarded} XP
                  </Badge>
                )}
              </div>

              {/* Review Notes */}
              {submission.reviewNotes && (submission.status === "NEEDS_REVISION" || submission.status === "REJECTED") && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 p-2 rounded">
                  💬 {submission.reviewNotes}
                </p>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
