"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  Check,
  X,
  Clock,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface Athlete {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface JoinRequest {
  id: string;
  athleteId: string;
  athlete: Athlete;
  note: string | null;
  createdAt: string;
  status: string;
}

export default function JoinRequestsPage() {
  const params = useParams();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}/requests`);
        if (!res.ok) throw new Error("Failed to load requests");
        const data = await res.json();
        setRequests(data.requests || []);
        setClassName(data.className || "Class");
      } catch (error) {
        console.error("Error loading requests:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, [classId]);

  const handleRequest = async (requestId: string, action: "approve" | "deny") => {
    setProcessing(requestId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} request`);
      }

      // Update the request status in the list
      setRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, status: action === "approve" ? "APPROVED" : "DENIED" }
          : r
      ));
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(error instanceof Error ? error.message : `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  const handleAll = async (action: "approve" | "deny") => {
    const pendingRequests = requests.filter(r => r.status === "PENDING");
    if (pendingRequests.length === 0) return;
    
    const confirmMsg = action === "approve" 
      ? `Approve all ${pendingRequests.length} pending requests?`
      : `Deny all ${pendingRequests.length} pending requests?`;
    
    if (!confirm(confirmMsg)) return;

    for (const request of pendingRequests) {
      await handleRequest(request.id, action);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const processedRequests = requests.filter(r => r.status !== "PENDING");

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/coach/classes/${classId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <UserCheck className="w-7 h-7" />
          Join Requests
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {className}
        </p>
      </div>

      {/* Pending Requests */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </CardTitle>
            {pendingRequests.length > 1 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAll("deny")}
                  className="text-red-600 hover:text-red-700"
                >
                  Deny All
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAll("approve")}
                >
                  Approve All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending join requests
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.athlete.avatarUrl || undefined} />
                      <AvatarFallback>
                        {request.athlete.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.athlete.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      {request.note && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          &quot;{request.note}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequest(request.id, "deny")}
                      disabled={processing === request.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0"
                    >
                      {processing === request.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRequest(request.id, "approve")}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent History</CardTitle>
            <CardDescription>Previously processed requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.slice(0, 10).map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.athlete.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {request.athlete.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm">{request.athlete.displayName}</p>
                  </div>
                  <Badge 
                    variant={request.status === "APPROVED" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {request.status === "APPROVED" ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Denied
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
