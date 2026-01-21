"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  Search, 
  UserPlus, 
  UserMinus,
  Users,
  Check,
  X
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useDebounce } from "@/hooks/use-debounce";

interface Athlete {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ClassMember {
  id: string;
  athleteId: string;
  athlete: Athlete;
  joinedAt: string;
  status: string;
}

interface SearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  userId: string;
}

interface PendingRequest {
  id: string;
  athleteId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  note: string | null;
  requestedAt: string;
  requestedBy: string;
}

export default function ManageMembersPage() {
  const params = useParams();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Load class members
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}/members`);
        if (!res.ok) throw new Error("Failed to load members");
        const data = await res.json();
        setMembers(data.members || []);
        setClassName(data.className || "Class");
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, [classId]);

  // Load pending requests
  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}/requests`);
        if (res.ok) {
          const data = await res.json();
          setPendingRequests(data.requests || []);
        }
      } catch (error) {
        console.error("Error loading requests:", error);
      }
    }
    loadRequests();
  }, [classId]);

  // Search athletes
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    async function search() {
      setSearching(true);
      try {
        const res = await fetchWithAuth(
          `/api/athletes/search?q=${encodeURIComponent(debouncedSearch)}&excludeClassId=${classId}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.athletes || []);
        }
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setSearching(false);
      }
    }
    search();
  }, [debouncedSearch, classId]);

  const addMember = async (athleteId: string) => {
    setAdding(athleteId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }

      const data = await res.json();
      setMembers(prev => [...prev, data.member]);
      setSearchResults(prev => prev.filter(r => r.id !== athleteId));
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding member:", error);
      alert(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setAdding(null);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this athlete from the class?")) return;
    
    setRemoving(memberId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error("Error removing member:", error);
      alert(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  const handleRequest = async (requestId: string, action: "approve" | "deny") => {
    setProcessing(requestId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} request`);
      }

      // Remove from pending list
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));

      // If approved and member returned, add to members list
      if (action === "approve" && data.member) {
        setMembers(prev => [...prev, data.member]);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(error instanceof Error ? error.message : `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <Users className="w-7 h-7" />
          Manage Members
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {className}
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {pendingRequests.length}
              </Badge>
              Pending Join Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(request.displayName || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(request.requestedAt).toLocaleDateString()}
                        {request.requestedBy !== request.displayName && (
                          <span> by {request.requestedBy}</span>
                        )}
                      </p>
                      {request.note && (
                        <p className="text-xs text-muted-foreground italic mt-1">
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
                      <X className="w-5 h-5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRequest(request.id, "approve")}
                      disabled={processing === request.id}
                      className="h-10 w-10 p-0"
                    >
                      {processing === request.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Member Search */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Athletes
          </CardTitle>
          <CardDescription>
            Search for athletes to add to this class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="pl-10"
            />
          </div>

          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((athlete) => (
                <div 
                  key={athlete.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={athlete.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(athlete.displayName || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{athlete.displayName}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addMember(athlete.id)}
                    disabled={adding === athlete.id}
                  >
                    {adding === athlete.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No athletes found matching &quot;{searchQuery}&quot;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Members
            <Badge variant="secondary">{members.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No athletes in this class yet. Search above to add members.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.athlete.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(member.athlete.displayName || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.athlete.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMember(member.id)}
                    disabled={removing === member.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0"
                  >
                    {removing === member.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserMinus className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
