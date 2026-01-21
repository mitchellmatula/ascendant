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
  Shield,
  Crown
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useDebounce } from "@/hooks/use-debounce";

interface Coach {
  id: string;
  userId: string;
  role: "COACH" | "ASSISTANT";
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface SearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  userId: string;
}

export default function ManageCoachesPage() {
  const params = useParams();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isHeadCoach, setIsHeadCoach] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Load class info and coaches
  useEffect(() => {
    async function loadData() {
      try {
        // Get class info
        const classRes = await fetchWithAuth(`/api/classes/${classId}`);
        if (classRes.ok) {
          const classData = await classRes.json();
          setClassName(classData.name || "Class");
        }

        // Get coaches
        const coachesRes = await fetchWithAuth(`/api/classes/${classId}/coaches`);
        if (coachesRes.ok) {
          const data = await coachesRes.json();
          setCoaches(data.coaches || []);
          
          // Check if current user is head coach
          const meRes = await fetchWithAuth("/api/me");
          if (meRes.ok) {
            const meData = await meRes.json();
            const myCoachEntry = data.coaches?.find((c: Coach) => c.userId === meData.userId);
            setIsHeadCoach(myCoachEntry?.role === "COACH");
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId]);

  // Search users (athletes)
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    async function search() {
      setSearching(true);
      try {
        const res = await fetchWithAuth(
          `/api/athletes/search?q=${encodeURIComponent(debouncedSearch)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out users who are already coaches
          const coachUserIds = coaches.map(c => c.userId);
          const filtered = (data.athletes || []).filter(
            (a: SearchResult) => !coachUserIds.includes(a.userId)
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setSearching(false);
      }
    }
    search();
  }, [debouncedSearch, coaches]);

  const addCoach = async (userId: string) => {
    setAdding(userId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add coach");
      }

      // Reload coaches
      const coachesRes = await fetchWithAuth(`/api/classes/${classId}/coaches`);
      if (coachesRes.ok) {
        const data = await coachesRes.json();
        setCoaches(data.coaches || []);
      }
      
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error adding coach:", error);
      alert(error instanceof Error ? error.message : "Failed to add coach");
    } finally {
      setAdding(null);
    }
  };

  const removeCoach = async (coachId: string) => {
    if (!confirm("Remove this coach from the class?")) return;
    
    setRemoving(coachId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/coaches`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove coach");
      }

      setCoaches(prev => prev.filter(c => c.id !== coachId));
    } catch (error) {
      console.error("Error removing coach:", error);
      alert(error instanceof Error ? error.message : "Failed to remove coach");
    } finally {
      setRemoving(null);
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
          <Shield className="w-7 h-7" />
          Manage Coaches
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {className}
        </p>
      </div>

      {/* Add Coach Search - Only for Head Coaches */}
      {isHeadCoach && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Coach
            </CardTitle>
            <CardDescription>
              Search for users to add as assistant coaches
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
                      onClick={() => addCoach(athlete.userId)}
                      disabled={adding === athlete.userId}
                    >
                      {adding === athlete.userId ? (
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
                No users found matching &quot;{searchQuery}&quot;
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Coaches */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Current Coaches
            <Badge variant="secondary">{coaches.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No coaches assigned to this class.
            </p>
          ) : (
            <div className="space-y-2">
              {coaches.map((coach) => (
                <div 
                  key={coach.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={coach.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(coach.displayName || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {coach.displayName}
                        {coach.role === "COACH" && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </p>
                      <Badge 
                        variant={coach.role === "COACH" ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {coach.role === "COACH" ? "Head Coach" : "Assistant"}
                      </Badge>
                    </div>
                  </div>
                  {isHeadCoach && coach.role !== "COACH" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCoach(coach.id)}
                      disabled={removing === coach.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0"
                    >
                      {removing === coach.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UserMinus className="w-5 h-5" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isHeadCoach && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          Only the head coach can add or remove coaches.
        </p>
      )}
    </div>
  );
}
