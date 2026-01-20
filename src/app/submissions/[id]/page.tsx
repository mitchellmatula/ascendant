import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoDisplay } from "@/components/ui/video-display";
import { FeedReactions } from "@/components/feed/feed-reactions";
import { Comments, CommentData } from "@/components/feed/comments";
import { calculatePrime, formatLevel, getRankColor } from "@/lib/levels";
import { 
  ArrowLeft, 
  Trophy, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  MapPin,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  const submission = await db.challengeSubmission.findUnique({
    where: { id },
    include: {
      athlete: { select: { displayName: true, username: true } },
      challenge: { select: { name: true } },
    },
  });

  if (!submission) {
    return { title: "Submission Not Found" };
  }

  return {
    title: `${submission.athlete.displayName}'s ${submission.challenge.name} | Ascendant`,
    description: `Watch ${submission.athlete.displayName}'s attempt at ${submission.challenge.name}`,
  };
}

// Get tier color
const getTierColor = (tier: string) => {
  const colors: Record<string, string> = {
    F: "bg-gray-500",
    E: "bg-green-500",
    D: "bg-blue-500",
    C: "bg-purple-500",
    B: "bg-orange-500",
    A: "bg-red-500",
    S: "bg-yellow-500",
  };
  return colors[tier] || "bg-gray-500";
};

export default async function SubmissionPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();

  // Get current viewer's athlete ID
  let currentAthleteId: string | null = null;
  if (userId) {
    const viewer = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    currentAthleteId = viewer?.athlete?.id || null;
  }

  // Get submission with all related data
  const submission = await db.challengeSubmission.findUnique({
    where: { id },
    include: {
      athlete: {
        include: {
          domainLevels: {
            include: { domain: { select: { name: true, slug: true } } },
          },
        },
      },
      challenge: {
        include: {
          primaryDomain: { select: { name: true, color: true, icon: true } },
        },
      },
      reactions: {
        select: {
          emoji: true,
          athleteId: true,
          athlete: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  // Check privacy - only show if public or viewer is the owner
  const isOwner = currentAthleteId === submission.athleteId;
  if (!submission.isPublic && !isOwner) {
    notFound();
  }

  // Get comments
  const rawComments = await db.comment.findMany({
    where: {
      submissionId: id,
      parentId: null, // Top-level only
    },
    include: {
      athlete: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      reactions: {
        select: {
          emoji: true,
          athleteId: true,
        },
      },
      replies: {
        where: { isDeleted: false },
        include: {
          athlete: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reactions: {
            select: {
              emoji: true,
              athleteId: true,
            },
          },
          replies: {
            where: { isDeleted: false },
            include: {
              athlete: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              reactions: {
                select: {
                  emoji: true,
                  athleteId: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Transform comments to match component interface
  function transformComment(comment: typeof rawComments[0], depth: number = 0): CommentData {
    const likeCount = comment.reactions.filter((r) => r.emoji === "❤️").length;
    const isLikedByUser = currentAthleteId 
      ? comment.reactions.some((r) => r.athleteId === currentAthleteId && r.emoji === "❤️")
      : false;

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      athlete: {
        id: comment.athlete.id,
        username: comment.athlete.username || "unknown",
        displayName: comment.athlete.displayName,
        avatarUrl: comment.athlete.avatarUrl,
      },
      likeCount,
      isLikedByUser,
      isOwnComment: currentAthleteId === comment.athlete.id,
      depth,
      replies: (comment.replies as typeof rawComments)?.map((r) => transformComment(r as typeof rawComments[0], depth + 1)) || [],
    };
  }

  const comments: CommentData[] = rawComments
    .filter((c) => !c.isDeleted || (c.replies && c.replies.length > 0))
    .map((c) => transformComment(c));

  // Calculate reaction counts and group reactors
  const reactionCounts: Record<string, number> = {};
  const reactors: Record<string, Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>> = {};
  const userReactions: string[] = [];
  for (const reaction of submission.reactions) {
    reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
    
    // Group reactors by emoji
    if (!reactors[reaction.emoji]) {
      reactors[reaction.emoji] = [];
    }
    reactors[reaction.emoji].push({
      id: reaction.athlete.id,
      username: reaction.athlete.username || "unknown",
      displayName: reaction.athlete.displayName,
      avatarUrl: reaction.athlete.avatarUrl,
    });
    
    if (reaction.athleteId === currentAthleteId) {
      userReactions.push(reaction.emoji);
    }
  }

  // Calculate Prime level
  const primeLevel = submission.athlete.domainLevels.length > 0
    ? calculatePrime(submission.athlete.domainLevels)
    : { letter: "F", sublevel: 0 };

  // Get initials for avatar
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Status info
  const statusConfig = {
    PENDING: { icon: Clock, color: "text-yellow-500", label: "Pending Review" },
    APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Approved" },
    REJECTED: { icon: XCircle, color: "text-red-500", label: "Rejected" },
    NEEDS_REVISION: { icon: AlertTriangle, color: "text-orange-500", label: "Needs Revision" },
  };
  const status = statusConfig[submission.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Link 
              href={`/athletes/${submission.athlete.username}`}
              className="flex items-center gap-3 group"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={submission.athlete.avatarUrl || undefined} 
                  alt={submission.athlete.displayName} 
                />
                <AvatarFallback>{getInitials(submission.athlete.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold group-hover:text-primary transition-colors">
                    {submission.athlete.displayName}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-1.5 py-0"
                    style={{
                      backgroundColor: `${getRankColor(primeLevel.letter)}20`,
                      color: getRankColor(primeLevel.letter),
                    }}
                  >
                    {formatLevel(primeLevel.letter, primeLevel.sublevel)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>@{submission.athlete.username}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}</span>
                </div>
              </div>
            </Link>

            {/* Status Badge */}
            <div className={`flex items-center gap-1.5 ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{status.label}</span>
            </div>
          </div>
        </div>

        {/* Challenge Info */}
        <div className="p-4 bg-muted/30 border-b">
          <Link 
            href={`/challenges/${submission.challenge.slug}`}
            className="flex items-center gap-3 hover:text-primary transition-colors"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${submission.challenge.primaryDomain.color}20` }}
            >
              {submission.challenge.primaryDomain.icon || "🎯"}
            </div>
            <div>
              <h1 className="font-semibold text-lg">{submission.challenge.name}</h1>
              <span className="text-sm text-muted-foreground">
                {submission.challenge.primaryDomain.name}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
          </Link>
        </div>

        {/* Video/Image */}
        {(submission.videoUrl || submission.imageUrl) && (
          <div className="relative aspect-video bg-black">
            {submission.videoUrl ? (
              <VideoDisplay 
                url={submission.videoUrl} 
                fallbackImageUrl={submission.imageUrl}
              />
            ) : submission.imageUrl ? (
              <Image
                src={submission.imageUrl}
                alt={submission.challenge.name}
                fill
                className="object-contain"
              />
            ) : null}
          </div>
        )}

        {/* Strava Activity Info */}
        {submission.stravaActivityUrl && (
          <div className="p-4 border-b bg-[#FC4C02]/5">
            <a 
              href={submission.stravaActivityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-[#FC4C02] hover:underline"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <span className="font-medium">View on Strava</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            {(submission.activityDistance || submission.activityTime) && (
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                {submission.activityDistance && (
                  <span>{(submission.activityDistance / 1000).toFixed(2)} km</span>
                )}
                {submission.activityTime && (
                  <span>{Math.floor(submission.activityTime / 60)}:{String(submission.activityTime % 60).padStart(2, "0")}</span>
                )}
                {submission.activityElevation && (
                  <span>{submission.activityElevation}m elevation</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Achievement Info */}
        <CardContent className="p-4 space-y-4">
          {/* Tier & XP */}
          <div className="flex items-center gap-3">
            {submission.achievedRank && (
              <Badge className={`text-white ${getTierColor(submission.achievedRank)}`}>
                <Trophy className="w-3.5 h-3.5 mr-1" />
                {submission.achievedRank}-Tier Result
              </Badge>
            )}
            {submission.xpAwarded > 0 && (
              <span className="text-sm font-bold text-green-500">
                +{submission.xpAwarded} XP
              </span>
            )}
            {submission.achievedValue && !submission.hideExactValue && (
              <span className="text-sm text-muted-foreground">
                {submission.achievedValue} {submission.challenge.gradingUnit}
              </span>
            )}
          </div>

          {/* Notes */}
          {submission.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{submission.notes}</p>
            </div>
          )}

          {/* Review Notes */}
          {submission.reviewNotes && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                Reviewer Feedback
              </p>
              <p className="text-sm">{submission.reviewNotes}</p>
            </div>
          )}

          {/* Reactions */}
          <div className="pt-4 border-t">
            <FeedReactions
              submissionId={submission.id}
              reactionCounts={reactionCounts}
              reactors={reactors}
              userReactions={userReactions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <div id="comments" className="mt-6 scroll-mt-4">
        <h2 className="text-lg font-semibold mb-4">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>
        
        {currentAthleteId ? (
          <Comments 
            submissionId={submission.id}
            initialComments={comments}
            totalCount={comments.length}
            maxDepth={3}
            currentAthleteId={currentAthleteId}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                Sign in to leave a comment
              </p>
              <Link href="/sign-in">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
