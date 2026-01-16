"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Eye, Check, X, RotateCcw, Play, Image as ImageIcon, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewDialog } from "./review-dialog";

type Submission = {
  id: string;
  videoUrl: string | null;
  imageUrl: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  achievedValue: number | null;
  achievedRank: string | null;
  submittedAt: string;
  athlete: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  challenge: {
    id: string;
    name: string;
    slug: string;
    gradingType: string;
    gradingUnit: string | null;
    primaryDomain: {
      name: string;
      icon: string | null;
      color: string | null;
    };
  };
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, page]);

  async function fetchSubmissions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions?status=${statusFilter}&page=${page}&limit=20`, {
        credentials: "include",
      });
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleReviewComplete() {
    setReviewDialogOpen(false);
    setSelectedSubmission(null);
    fetchSubmissions();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "NEEDS_REVISION":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Needs Revision</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getRankBadge(rank: string | null) {
    if (!rank) return null;
    const colors: Record<string, string> = {
      F: "bg-gray-100 text-gray-700",
      E: "bg-green-100 text-green-700",
      D: "bg-blue-100 text-blue-700",
      C: "bg-purple-100 text-purple-700",
      B: "bg-orange-100 text-orange-700",
      A: "bg-red-100 text-red-700",
      S: "bg-yellow-100 text-yellow-700",
    };
    return (
      <Badge className={colors[rank] || "bg-gray-100"}>
        {rank}-Tier
      </Badge>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Submission Review</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {total} submission{total !== 1 ? "s" : ""} {statusFilter.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review Queue</CardTitle>
          <CardDescription>
            Review athlete submissions and approve or request revisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No {statusFilter.toLowerCase()} submissions found
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Athlete</th>
                      <th className="pb-3 font-medium">Challenge</th>
                      <th className="pb-3 font-medium">Domain</th>
                      <th className="pb-3 font-medium">Result</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Submitted</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {sub.athlete.avatarUrl ? (
                              <img
                                src={sub.athlete.avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {sub.athlete.displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-medium">{sub.athlete.displayName}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {sub.videoUrl && <Play className="w-4 h-4 text-muted-foreground" />}
                            {sub.imageUrl && !sub.videoUrl && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                            <span>{sub.challenge.name}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <span>{sub.challenge.primaryDomain.icon}</span>
                            <span>{sub.challenge.primaryDomain.name}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          {sub.achievedValue && (
                            <span className="font-mono">
                              {sub.achievedValue} {sub.challenge.gradingUnit}
                            </span>
                          )}
                          {getRankBadge(sub.achievedRank)}
                        </td>
                        <td className="py-4">{getStatusBadge(sub.status)}</td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setReviewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {sub.status === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedSubmission(sub);
                                    setReviewDialogOpen(true);
                                  }}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {submissions.map((sub) => (
                  <Card key={sub.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {sub.athlete.avatarUrl ? (
                            <img
                              src={sub.athlete.avatarUrl}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <span className="font-medium">
                                {sub.athlete.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{sub.athlete.displayName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(sub.status)}
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          {sub.videoUrl && <Play className="w-4 h-4 text-muted-foreground" />}
                          {sub.imageUrl && !sub.videoUrl && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                          <span className="font-medium">{sub.challenge.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{sub.challenge.primaryDomain.icon}</span>
                          <span>{sub.challenge.primaryDomain.name}</span>
                          {sub.achievedValue && (
                            <>
                              <span>•</span>
                              <span className="font-mono">
                                {sub.achievedValue} {sub.challenge.gradingUnit}
                              </span>
                            </>
                          )}
                          {sub.achievedRank && getRankBadge(sub.achievedRank)}
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setReviewDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSubmission && (
        <ReviewDialog
          submission={selectedSubmission}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onReviewComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}
