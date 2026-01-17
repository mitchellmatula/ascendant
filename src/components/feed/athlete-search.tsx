"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface AthleteResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  primeLevel: {
    letter: string;
    sublevel: number;
  } | null;
}

export function AthleteSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AthleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const searchAthletes = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/athletes/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.athletes);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    searchAthletes(debouncedQuery);
    
    // Update URL without navigation
    if (debouncedQuery) {
      router.replace(`/athletes/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false });
    } else {
      router.replace("/athletes/search", { scroll: false });
    }
  }, [debouncedQuery, searchAthletes, router]);

  // Get initials for avatar
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Format level
  const formatLevel = (letter: string, sublevel: number) => `${letter}${sublevel}`;

  // Get rank color
  const getRankColor = (letter: string) => {
    const colors: Record<string, string> = {
      F: "#6b7280", // gray
      E: "#22c55e", // green
      D: "#3b82f6", // blue
      C: "#a855f7", // purple
      B: "#f97316", // orange
      A: "#ef4444", // red
      S: "#eab308", // yellow/gold
    };
    return colors[letter] || colors.F;
  };

  return (
    <>
      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by username or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {query.trim() === "" ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Search for athletes</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Enter a username or display name to find athletes
          </p>
        </div>
      ) : isLoading && results.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-24 h-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results.length === 0 && debouncedQuery.trim() !== "" ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No athletes found</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((athlete) => (
            <Link key={athlete.id} href={`/athletes/${athlete.username}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={athlete.avatarUrl || undefined} alt={athlete.displayName} />
                    <AvatarFallback>{getInitials(athlete.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{athlete.displayName}</span>
                      {athlete.primeLevel && (
                        <Badge
                          className="text-xs font-bold"
                          style={{
                            backgroundColor: `${getRankColor(athlete.primeLevel.letter)}20`,
                            color: getRankColor(athlete.primeLevel.letter),
                          }}
                        >
                          {formatLevel(athlete.primeLevel.letter, athlete.primeLevel.sublevel)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{athlete.username}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
