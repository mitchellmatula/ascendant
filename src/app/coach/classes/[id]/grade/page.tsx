"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Loader2, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Target,
  Users,
  ClipboardCheck
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface Athlete {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Benchmark {
  id: string;
  challengeId: string;
  challenge: {
    id: string;
    name: string;
    gradingType: string;
    timeFormat?: string;
    primaryDomain?: {
      name: string;
      icon: string;
      color: string;
    };
  };
}

interface ClassMember {
  id: string;
  athleteId: string;
  athlete: Athlete;
}

interface ExistingGrade {
  benchmarkId: string;
  athleteId: string;
  achievedValue: number | null;
  achievedTier: string | null;
  passed: boolean | null;
  xpAwarded?: number;
  gradedAt?: string;
}

interface AthleteSubmission {
  id: string;
  achievedValue: number | null;
  achievedRank: string | null;
  status: string;
  submittedAt: string;
  notes: string | null;
}

interface ClassData {
  id: string;
  name: string;
  members: ClassMember[];
  benchmarks: Benchmark[];
}

export default function QuickGradePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [existingGrades, setExistingGrades] = useState<ExistingGrade[]>([]);
  
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("");
  const [expandedAthletes, setExpandedAthletes] = useState<Set<string>>(new Set());
  const [grades, setGrades] = useState<Record<string, { value: string; passed: boolean; notes: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [successfulGrades, setSuccessfulGrades] = useState<Set<string>>(new Set());
  const [athleteSubmissions, setAthleteSubmissions] = useState<Record<string, AthleteSubmission[]>>({});

  // Load class data
  useEffect(() => {
    async function loadClass() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}`);
        if (!res.ok) throw new Error("Failed to load class");
        const data = await res.json();
        setClassData(data);
        
        // Auto-select first benchmark if available
        if (data.benchmarks?.length > 0) {
          setSelectedBenchmark(data.benchmarks[0].id);
        }
      } catch (error) {
        console.error("Error loading class:", error);
      } finally {
        setLoading(false);
      }
    }
    loadClass();
  }, [classId]);

  // Load existing grades when benchmark changes
  useEffect(() => {
    if (!selectedBenchmark || !classData) return;

    async function loadGrades() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}/grades?benchmarkId=${selectedBenchmark}&includeSubmissions=true`);
        if (res.ok) {
          const data = await res.json();
          setExistingGrades(data.grades || []);
          setAthleteSubmissions(data.submissions || {});
        }
      } catch (error) {
        console.error("Error loading grades:", error);
      }
    }
    loadGrades();
  }, [classId, selectedBenchmark, classData]);

  const selectedBenchmarkData = classData?.benchmarks.find(b => b.id === selectedBenchmark);
  const gradingType = selectedBenchmarkData?.challenge.gradingType || "PASS_FAIL";

  const toggleAthlete = (athleteId: string) => {
    const newExpanded = new Set(expandedAthletes);
    if (newExpanded.has(athleteId)) {
      newExpanded.delete(athleteId);
    } else {
      newExpanded.add(athleteId);
    }
    setExpandedAthletes(newExpanded);
  };

  const getGradeValue = (athleteId: string) => {
    return grades[athleteId] || { value: "", passed: false, notes: "" };
  };

  const setGradeValue = (athleteId: string, field: string, value: string | boolean) => {
    setGrades(prev => ({
      ...prev,
      [athleteId]: {
        ...prev[athleteId] || { value: "", passed: false, notes: "" },
        [field]: value,
      },
    }));
  };

  const getExistingGrade = (athleteId: string) => {
    return existingGrades.find(g => g.athleteId === athleteId && g.benchmarkId === selectedBenchmark);
  };

  const getAthleteSubmissions = (athleteId: string): AthleteSubmission[] => {
    return athleteSubmissions[athleteId] || [];
  };

  const formatSubmissionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined 
    });
  };

  const submitGrade = useCallback(async (athleteId: string) => {
    if (!selectedBenchmark) return;
    
    const gradeData = getGradeValue(athleteId);
    const benchmark = classData?.benchmarks.find(b => b.id === selectedBenchmark);
    if (!benchmark) return;

    setSubmitting(athleteId);
    
    try {
      const body: Record<string, unknown> = {
        benchmarkId: selectedBenchmark,
        athleteId,
        notes: gradeData.notes || undefined,
      };

      if (gradingType === "PASS_FAIL") {
        body.passed = gradeData.passed;
      } else if (gradeData.value) {
        body.value = parseFloat(gradeData.value);
      }

      const res = await fetchWithAuth(`/api/classes/${classId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit grade");
      }

      const result = await res.json();
      
      // Update existing grades
      setExistingGrades(prev => {
        const filtered = prev.filter(g => !(g.athleteId === athleteId && g.benchmarkId === selectedBenchmark));
        return [...filtered, {
          benchmarkId: selectedBenchmark,
          athleteId,
          achievedValue: result.grade.achievedValue,
          achievedTier: result.grade.achievedTier,
          passed: result.grade.passed,
          xpAwarded: result.grade.xpAwarded,
        }];
      });

      // Mark as successful
      setSuccessfulGrades(prev => new Set(prev).add(athleteId));
      
      // Collapse athlete row
      setExpandedAthletes(prev => {
        const next = new Set(prev);
        next.delete(athleteId);
        return next;
      });

    } catch (error) {
      console.error("Error submitting grade:", error);
      alert(error instanceof Error ? error.message : "Failed to submit grade");
    } finally {
      setSubmitting(null);
    }
  }, [classId, classData, selectedBenchmark, gradingType, grades]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">Class not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/coach/classes/${classId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7" />
          Quick Grade
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {classData.name}
        </p>
      </div>

      {/* Benchmark Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Select Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classData.benchmarks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No benchmarks set for this class.</p>
              <Button asChild>
                <Link href={`/coach/classes/${classId}/benchmarks`}>
                  Add Benchmarks
                </Link>
              </Button>
            </div>
          ) : (
            <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a benchmark to grade" />
              </SelectTrigger>
              <SelectContent>
                {classData.benchmarks.map((benchmark) => (
                  <SelectItem key={benchmark.id} value={benchmark.id}>
                    <div className="flex items-center gap-2">
                      <span>{benchmark.challenge.primaryDomain?.icon || "🎯"}</span>
                      <span>{benchmark.challenge.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {benchmark.challenge.gradingType.replace("_", " ")}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Athletes to Grade */}
      {selectedBenchmark && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Grade Athletes
            </CardTitle>
            <CardDescription>
              Tap an athlete to record their grade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classData.members.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">No athletes in this class yet.</p>
                <Button asChild variant="outline">
                  <Link href={`/coach/classes/${classId}/members`}>
                    Add Athletes
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {classData.members.map((member) => {
                  const existing = getExistingGrade(member.athleteId);
                  const isExpanded = expandedAthletes.has(member.athleteId);
                  const gradeValue = getGradeValue(member.athleteId);
                  const isSubmitting = submitting === member.athleteId;
                  const wasSuccessful = successfulGrades.has(member.athleteId);

                  return (
                    <div 
                      key={member.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        existing ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : ""
                      }`}
                    >
                      {/* Collapsed Row */}
                      <button
                        type="button"
                        onClick={() => toggleAthlete(member.athleteId)}
                        className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-h-[56px]"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.athlete.avatarUrl || undefined} />
                            <AvatarFallback>
                              {member.athlete.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium">{member.athlete.displayName}</p>
                            {existing && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {existing.passed !== null && (
                                  <Badge variant={existing.passed ? "default" : "destructive"} className="text-xs">
                                    {existing.passed ? "Passed" : "Failed"}
                                  </Badge>
                                )}
                                {existing.achievedValue !== null && (
                                  <span>Value: {existing.achievedValue}</span>
                                )}
                                {existing.achievedTier && (
                                  <Badge variant="outline" className="text-xs">
                                    {existing.achievedTier}-tier
                                  </Badge>
                                )}
                                {existing.xpAwarded !== undefined && existing.xpAwarded > 0 && (
                                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                    +{existing.xpAwarded} XP
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {existing && <Check className="w-5 h-5 text-green-500" />}
                          {wasSuccessful && !existing && <Check className="w-5 h-5 text-green-500" />}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Grade Form */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-background">
                          <div className="pt-4 space-y-4">
                            {/* Submission History */}
                            {getAthleteSubmissions(member.athleteId).length > 0 && (
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Previous Submissions
                                </p>
                                <div className="space-y-1.5">
                                  {getAthleteSubmissions(member.athleteId).slice(0, 5).map((sub) => (
                                    <div 
                                      key={sub.id} 
                                      className="flex items-center justify-between text-sm bg-background rounded px-2 py-1.5"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs">
                                          {formatSubmissionDate(sub.submittedAt)}
                                        </span>
                                        {sub.achievedValue !== null && (
                                          <span className="font-medium">
                                            {sub.achievedValue}
                                            {gradingType === "REPS" && " reps"}
                                            {gradingType === "TIMED_REPS" && " reps"}
                                            {gradingType === "TIME" && "s"}
                                            {gradingType === "DISTANCE" && "m"}
                                          </span>
                                        )}
                                        {sub.achievedRank && (
                                          <Badge variant="outline" className="text-xs">
                                            {sub.achievedRank}
                                          </Badge>
                                        )}
                                      </div>
                                      <Badge 
                                        variant={sub.status === "APPROVED" ? "default" : sub.status === "PENDING" ? "secondary" : "destructive"}
                                        className="text-xs"
                                      >
                                        {sub.status}
                                      </Badge>
                                    </div>
                                  ))}
                                  {getAthleteSubmissions(member.athleteId).length > 5 && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">
                                      +{getAthleteSubmissions(member.athleteId).length - 5} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {gradingType === "PASS_FAIL" ? (
                              <div className="flex items-center gap-4">
                                <Label className="text-sm">Result:</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={gradeValue.passed ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setGradeValue(member.athleteId, "passed", true)}
                                    className={gradeValue.passed ? "bg-green-600 hover:bg-green-700" : ""}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Pass
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!gradeValue.passed && gradeValue.value !== "" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setGradeValue(member.athleteId, "passed", false)}
                                    className={!gradeValue.passed && gradeValue.value !== "" ? "bg-red-600 hover:bg-red-700" : ""}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Fail
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label htmlFor={`value-${member.athleteId}`}>
                                  {gradingType === "REPS" && "Reps Completed"}
                                  {gradingType === "TIME" && "Time (seconds)"}
                                  {gradingType === "DISTANCE" && "Distance (meters)"}
                                  {gradingType === "TIMED_REPS" && "Reps in Time Limit"}
                                </Label>
                                <Input
                                  id={`value-${member.athleteId}`}
                                  type="number"
                                  step={gradingType === "TIME" ? "0.01" : "1"}
                                  value={gradeValue.value}
                                  onChange={(e) => setGradeValue(member.athleteId, "value", e.target.value)}
                                  placeholder={`Enter ${gradingType.toLowerCase().replace("_", " ")}`}
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor={`notes-${member.athleteId}`}>Notes (optional)</Label>
                              <Textarea
                                id={`notes-${member.athleteId}`}
                                value={gradeValue.notes}
                                onChange={(e) => setGradeValue(member.athleteId, "notes", e.target.value)}
                                placeholder="Any observations..."
                                rows={2}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => toggleAthlete(member.athleteId)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                className="flex-1"
                                onClick={() => submitGrade(member.athleteId)}
                                disabled={isSubmitting || (gradingType !== "PASS_FAIL" && !gradeValue.value)}
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Save Grade
                                  </>
                                )}
                              </Button>
                            </div>
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
      )}
    </div>
  );
}
