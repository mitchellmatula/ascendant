"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  Search, 
  Plus, 
  Trash2,
  Target,
  Check
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useDebounce } from "@/hooks/use-debounce";

interface Challenge {
  id: string;
  name: string;
  gradingType: string;
  primaryDomain?: {
    name: string;
    icon: string;
    color: string;
  };
}

interface Benchmark {
  id: string;
  challengeId: string;
  challenge: Challenge;
  _count: {
    grades: number;
  };
}

interface SearchResult {
  id: string;
  name: string;
  gradingType: string;
  primaryDomain?: {
    name: string;
    icon: string;
    color: string;
  };
}

export default function ManageBenchmarksPage() {
  const params = useParams();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Load benchmarks
  useEffect(() => {
    async function loadBenchmarks() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}/benchmarks`);
        if (!res.ok) throw new Error("Failed to load benchmarks");
        const data = await res.json();
        setBenchmarks(data.benchmarks || []);
        setClassName(data.className || "Class");
        setMemberCount(data.memberCount || 0);
      } catch (error) {
        console.error("Error loading benchmarks:", error);
      } finally {
        setLoading(false);
      }
    }
    loadBenchmarks();
  }, [classId]);

  // Search challenges
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    async function search() {
      setSearching(true);
      try {
        // Get existing benchmark challenge IDs to exclude
        const existingIds = benchmarks.map(b => b.challengeId).join(",");
        const res = await fetchWithAuth(
          `/api/challenges?search=${encodeURIComponent(debouncedSearch)}&limit=10&excludeIds=${existingIds}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.challenges || []);
        }
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setSearching(false);
      }
    }
    search();
  }, [debouncedSearch, benchmarks]);

  const addBenchmark = async (challengeId: string) => {
    setAdding(challengeId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/benchmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add benchmark");
      }

      const data = await res.json();
      setBenchmarks(prev => [...prev, data.benchmark]);
      setSearchResults(prev => prev.filter(r => r.id !== challengeId));
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding benchmark:", error);
      alert(error instanceof Error ? error.message : "Failed to add benchmark");
    } finally {
      setAdding(null);
    }
  };

  const removeBenchmark = async (benchmarkId: string) => {
    const benchmark = benchmarks.find(b => b.id === benchmarkId);
    if (benchmark && benchmark._count.grades > 0) {
      if (!confirm(`This benchmark has ${benchmark._count.grades} grades recorded. Are you sure you want to remove it? Grades will be preserved but no longer visible in this class.`)) {
        return;
      }
    } else if (!confirm("Remove this benchmark from the class?")) {
      return;
    }
    
    setRemoving(benchmarkId);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/benchmarks?benchmarkId=${benchmarkId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove benchmark");
      }

      setBenchmarks(prev => prev.filter(b => b.id !== benchmarkId));
    } catch (error) {
      console.error("Error removing benchmark:", error);
      alert(error instanceof Error ? error.message : "Failed to remove benchmark");
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
          <Target className="w-7 h-7" />
          Manage Benchmarks
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {className}
        </p>
      </div>

      {/* Add Benchmark Search */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Challenges as Benchmarks
          </CardTitle>
          <CardDescription>
            Search for challenges to track in this class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by name..."
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
              {searchResults.map((challenge) => (
                <div 
                  key={challenge.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {challenge.primaryDomain?.icon || "🎯"}
                    </span>
                    <div>
                      <p className="font-medium">{challenge.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {challenge.primaryDomain && (
                          <Badge variant="outline" className="text-xs">
                            {challenge.primaryDomain.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {challenge.gradingType.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addBenchmark(challenge.id)}
                    disabled={adding === challenge.id}
                  >
                    {adding === challenge.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
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
              No challenges found matching &quot;{searchQuery}&quot;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Benchmarks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Class Benchmarks
            <Badge variant="secondary">{benchmarks.length}</Badge>
          </CardTitle>
          <CardDescription>
            {memberCount > 0 
              ? `Tracking progress for ${memberCount} athletes`
              : "Add athletes to start tracking progress"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {benchmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No benchmarks set yet. Search above to add challenges.
            </p>
          ) : (
            <div className="space-y-3">
              {benchmarks.map((benchmark) => {
                const gradedPercentage = memberCount > 0 
                  ? Math.round((benchmark._count.grades / memberCount) * 100)
                  : 0;

                return (
                  <div 
                    key={benchmark.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">
                          {benchmark.challenge.primaryDomain?.icon || "🎯"}
                        </span>
                        <div>
                          <p className="font-medium">{benchmark.challenge.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {benchmark.challenge.primaryDomain && (
                              <Badge variant="outline" className="text-xs">
                                {benchmark.challenge.primaryDomain.name}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {benchmark.challenge.gradingType.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBenchmark(benchmark.id)}
                        disabled={removing === benchmark.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0"
                      >
                        {removing === benchmark.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    
                    {memberCount > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{benchmark._count.grades} / {memberCount} graded</span>
                          <span>{gradedPercentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${gradedPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action */}
      {benchmarks.length > 0 && memberCount > 0 && (
        <div className="mt-6 text-center">
          <Button asChild size="lg">
            <Link href={`/coach/classes/${classId}/grade`}>
              <Check className="w-5 h-5 mr-2" />
              Start Grading
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
