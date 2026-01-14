"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChallengeActions } from "./challenge-actions";
import { Search, ArrowUpDown, Filter, Grid, List, X } from "lucide-react";

interface Challenge {
  id: string;
  name: string;
  slug: string;
  description: string;
  demoImageUrl: string | null;
  demoVideoUrl: string | null;
  isActive: boolean;
  gradingType: string;
  gradingUnit: string | null;
  minRank: string;
  maxRank: string;
  primaryXPPercent: number;
  secondaryXPPercent: number | null;
  tertiaryXPPercent: number | null;
  createdAt: string;
  primaryDomain: { id: string; name: string; icon: string | null; color: string | null };
  secondaryDomain: { id: string; name: string; color: string | null } | null;
  tertiaryDomain: { id: string; name: string; color: string | null } | null;
  gym: { id: string; name: string } | null;
  categories: { category: { id: string; name: string } }[];
  disciplines: { discipline: { id: string; name: string; icon: string | null } }[];
  _count: { submissions: number; rankRequirements: number; categories: number; disciplines: number; grades: number };
}

interface Domain {
  id: string;
  name: string;
  icon: string | null;
}

interface Category {
  id: string;
  name: string;
  domainId: string;
}

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface Gym {
  id: string;
  name: string;
}

type SortField = "name" | "createdAt" | "submissions" | "primaryDomain";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "grid";

interface ChallengeListProps {
  challenges: Challenge[];
  domains: Domain[];
  categories: Category[];
  disciplines: Discipline[];
  gyms: Gym[];
}

const RANKS = ["F", "E", "D", "C", "B", "A", "S"];
const GRADING_TYPES = [
  { value: "PASS_FAIL", label: "Pass/Fail" },
  { value: "REPS", label: "Reps" },
  { value: "TIME", label: "Time" },
  { value: "DISTANCE", label: "Distance" },
  { value: "TIMED_REPS", label: "Timed Reps" },
];

export function ChallengeList({ challenges, domains, categories, disciplines, gyms }: ChallengeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [gradingFilter, setGradingFilter] = useState<string>("all");
  const [gymFilter, setGymFilter] = useState<string>("all");
  const [hasImageFilter, setHasImageFilter] = useState<"all" | "yes" | "no">("all");
  const [hasGradesFilter, setHasGradesFilter] = useState<"all" | "yes" | "no">("all");

  // Check if any filters are active
  const hasActiveFilters = 
    statusFilter !== "all" ||
    domainFilter !== "all" ||
    categoryFilter !== "all" ||
    disciplineFilter !== "all" ||
    gradingFilter !== "all" ||
    gymFilter !== "all" ||
    hasImageFilter !== "all" ||
    hasGradesFilter !== "all";

  const clearAllFilters = () => {
    setStatusFilter("all");
    setDomainFilter("all");
    setCategoryFilter("all");
    setDisciplineFilter("all");
    setGradingFilter("all");
    setGymFilter("all");
    setHasImageFilter("all");
    setHasGradesFilter("all");
  };

  // Filter and sort challenges
  const filteredChallenges = useMemo(() => {
    let result = [...challenges];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.categories.some(cat => cat.category.name.toLowerCase().includes(query)) ||
        c.disciplines.some(disc => disc.discipline.name.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter(c => c.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter(c => !c.isActive);
    }

    // Domain filter
    if (domainFilter !== "all") {
      result = result.filter(c => c.primaryDomain.id === domainFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(c => c.categories.some(cat => cat.category.id === categoryFilter));
    }

    // Discipline filter
    if (disciplineFilter !== "all") {
      result = result.filter(c => c.disciplines.some(disc => disc.discipline.id === disciplineFilter));
    }

    // Grading type filter
    if (gradingFilter !== "all") {
      result = result.filter(c => c.gradingType === gradingFilter);
    }

    // Gym filter
    if (gymFilter === "global") {
      result = result.filter(c => !c.gym);
    } else if (gymFilter !== "all") {
      result = result.filter(c => c.gym?.id === gymFilter);
    }

    // Has image filter
    if (hasImageFilter === "yes") {
      result = result.filter(c => c.demoImageUrl || c.demoVideoUrl);
    } else if (hasImageFilter === "no") {
      result = result.filter(c => !c.demoImageUrl && !c.demoVideoUrl);
    }

    // Has grades filter
    if (hasGradesFilter === "yes") {
      result = result.filter(c => c._count.grades > 0);
    } else if (hasGradesFilter === "no") {
      result = result.filter(c => c._count.grades === 0);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "submissions":
          comparison = a._count.submissions - b._count.submissions;
          break;
        case "primaryDomain":
          comparison = a.primaryDomain.name.localeCompare(b.primaryDomain.name);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [challenges, searchQuery, statusFilter, domainFilter, categoryFilter, disciplineFilter, gradingFilter, gymFilter, hasImageFilter, hasGradesFilter, sortField, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col gap-4">
        {/* Search + View toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Row 1 */}
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {domains.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Discipline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              {disciplines.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={gradingFilter} onValueChange={setGradingFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Grading" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {GRADING_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters Row 2 */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={gymFilter} onValueChange={setGymFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Gym" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (Global + Gym)</SelectItem>
              <SelectItem value="global">Global Only</SelectItem>
              {gyms.map(g => (
                <SelectItem key={g.id} value={g.id}>🏢 {g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={hasImageFilter} onValueChange={(v) => setHasImageFilter(v as typeof hasImageFilter)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Media" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Media</SelectItem>
              <SelectItem value="yes">Has Media</SelectItem>
              <SelectItem value="no">No Media</SelectItem>
            </SelectContent>
          </Select>

          <Select value={hasGradesFilter} onValueChange={(v) => setHasGradesFilter(v as typeof hasGradesFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Grades</SelectItem>
              <SelectItem value="yes">Has Grades</SelectItem>
              <SelectItem value="no">No Grades</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Controls */}
          <div className="flex items-center gap-1 ml-auto">
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="submissions">Submissions</SelectItem>
                <SelectItem value="primaryDomain">Domain</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={toggleSortOrder}>
              <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Showing {filteredChallenges.length} of {challenges.length} challenges
            </span>
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2">
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || hasActiveFilters 
                ? "No challenges match your filters." 
                : "No challenges have been created yet."}
            </p>
            {(searchQuery || hasActiveFilters) && (
              <Button variant="link" onClick={() => { setSearchQuery(""); clearAllFilters(); }}>
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChallenges.map((challenge) => (
            <Link key={challenge.id} href={`/admin/challenges/${challenge.id}`}>
              <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  {challenge.demoImageUrl ? (
                    <Image
                      src={challenge.demoImageUrl}
                      alt={challenge.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-4xl"
                      style={{ 
                        backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}20` : undefined 
                      }}
                    >
                      {challenge.primaryDomain.icon || "🎯"}
                    </div>
                  )}
                  {!challenge.isActive && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    </div>
                  )}
                  {challenge.gym && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs bg-amber-500/80">🏢</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold line-clamp-1">{challenge.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}30` : undefined }}
                    >
                      {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {challenge._count.submissions} sub{challenge._count.submissions !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredChallenges.map((challenge) => (
            <Card key={challenge.id} className="overflow-hidden">
              <div className="flex items-start p-4 gap-4">
                {/* Thumbnail */}
                <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                  {challenge.demoImageUrl ? (
                    <Image
                      src={challenge.demoImageUrl}
                      alt={challenge.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-2xl"
                      style={{ 
                        backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}20` : undefined 
                      }}
                    >
                      {challenge.primaryDomain.icon || "🎯"}
                    </div>
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/challenges/${challenge.id}`} className="hover:underline">
                      <h3 className="font-semibold">{challenge.name}</h3>
                    </Link>
                    {!challenge.isActive && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                    {challenge.gym && (
                      <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-300">
                        🏢 {challenge.gym.name}
                      </Badge>
                    )}
                    {challenge._count.grades === 0 && challenge.gradingType !== "PASS_FAIL" && (
                      <Badge variant="destructive" className="text-xs">No grades set</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {challenge.description}
                  </p>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}30` : undefined }}
                    >
                      {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {challenge.gradingType === "PASS_FAIL" ? "Pass/Fail" : challenge.gradingType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {challenge.minRank}→{challenge.maxRank}
                    </Badge>
                    {challenge.disciplines.slice(0, 2).map((d) => (
                      <Badge key={d.discipline.id} variant="secondary" className="text-xs">
                        {d.discipline.icon}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>{challenge._count.submissions} submission{challenge._count.submissions !== 1 ? "s" : ""}</span>
                    <span>{challenge._count.categories} categor{challenge._count.categories !== 1 ? "ies" : "y"}</span>
                    <span>{challenge._count.grades} grade{challenge._count.grades !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Actions */}
                <ChallengeActions challenge={challenge} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
