"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  ExternalLink,
  Video,
  ImageIcon,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Submission {
  id: string;
  status: string;
  videoUrl: string | null;
  imageUrl: string | null;
  achievedRank: string | null;
  achievedValue: number | null;
  xpAwarded: number;
  submittedAt: string;
  reviewedAt: string | null;
  notes: string | null;
  athlete: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  challenge: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UserSubmissionsProps {
  userId: string;
}

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30", label: "Pending" },
  APPROVED: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30", label: "Approved" },
  REJECTED: { icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30", label: "Rejected" },
  NEEDS_REVISION: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Needs Revision" },
};

export function UserSubmissions({ userId }: UserSubmissionsProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [userId]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/submissions`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (submissionId: string) => {
    setDeletingId(submissionId);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/submissions?submissionId=${submissionId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete submission");
      }
    } catch (error) {
      console.error("Failed to delete submission:", error);
      alert("Failed to delete submission");
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Challenge Submissions</CardTitle>
          <CardDescription>Loading submissions...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge Submissions</CardTitle>
        <CardDescription>
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} from this user and their managed athletes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No submissions found for this user.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Mobile view - cards */}
            <div className="md:hidden space-y-3">
              {submissions.map((submission) => {
                const status = STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                const StatusIcon = status.icon;
                
                return (
                  <div
                    key={submission.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={submission.athlete.avatarUrl || undefined} />
                          <AvatarFallback>{getInitials(submission.athlete.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{submission.athlete.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${status.bg} ${status.color} border-0`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>

                    <div>
                      <Link
                        href={`/challenges/${submission.challenge.slug}`}
                        className="font-medium hover:text-primary"
                      >
                        {submission.challenge.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        {submission.achievedRank && (
                          <Badge className={`text-white text-xs ${getTierColor(submission.achievedRank)}`}>
                            {submission.achievedRank}-Tier
                          </Badge>
                        )}
                        {submission.xpAwarded > 0 && (
                          <span className="text-xs text-green-500">+{submission.xpAwarded} XP</span>
                        )}
                        {submission.videoUrl && <Video className="w-3 h-3 text-muted-foreground" />}
                        {submission.imageUrl && !submission.videoUrl && <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link href={`/admin/submissions?id=${submission.id}`}>
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingId === submission.id}
                          >
                            {deletingId === submission.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this submission including any reactions and comments. 
                              The athlete will lose the {submission.xpAwarded} XP awarded. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(submission.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop view - table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => {
                    const status = STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={submission.athlete.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(submission.athlete.displayName)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{submission.athlete.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/challenges/${submission.challenge.slug}`}
                            className="hover:text-primary hover:underline"
                          >
                            {submission.challenge.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.bg} ${status.color} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {submission.achievedRank && (
                              <Badge className={`text-white ${getTierColor(submission.achievedRank)}`}>
                                {submission.achievedRank}-Tier
                              </Badge>
                            )}
                            {submission.xpAwarded > 0 && (
                              <span className="text-sm text-green-500">+{submission.xpAwarded} XP</span>
                            )}
                            {submission.videoUrl && <Video className="w-4 h-4 text-muted-foreground" />}
                            {submission.imageUrl && !submission.videoUrl && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/admin/submissions?id=${submission.id}`}>
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  disabled={deletingId === submission.id}
                                >
                                  {deletingId === submission.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this submission including any reactions and comments.
                                    The athlete will lose the {submission.xpAwarded} XP awarded. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(submission.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
