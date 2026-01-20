"use client";

import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Upload, Link2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoUpload } from "@/components/ui/video-upload";
import { VideoEmbed, isEmbeddableVideoUrl, getVideoThumbnailUrl, fetchVimeoThumbnail, parseVideoUrl } from "@/components/ui/video-embed";
import { Image as ImageIcon } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TimeInput, TIME_FORMATS, type TimeFormat, formatSecondsToTime } from "@/components/ui/time-input";

interface Domain {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
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
  color: string | null;
}

interface Equipment {
  id: string;
  name: string;
  icon: string | null;
}

interface Division {
  id: string;
  name: string;
  gender: string | null;
  ageMin: number | null;
  ageMax: number | null;
}

interface Gym {
  id: string;
  name: string;
}

interface ChallengeGrade {
  divisionId: string;
  rank: string;
  targetValue: number;
  targetWeight?: number | null;
  description?: string | null;
  bonusXP?: number;
}

const GRADING_TYPES = [
  { value: "PASS_FAIL", label: "Pass/Fail", description: "Simple completion" },
  { value: "REPS", label: "Repetitions", description: "Count reps (e.g., pull-ups)" },
  { value: "TIME", label: "Time", description: "Duration in seconds (e.g., hold for X sec)" },
  { value: "DISTANCE", label: "Distance", description: "Distance achieved (e.g., broad jump)" },
  { value: "TIMED_REPS", label: "Timed Reps", description: "Max reps in time limit" },
  { value: "WEIGHTED_REPS", label: "Weighted Reps", description: "Reps at a specific weight (e.g., 10 reps at 100lbs)" },
] as const;

const RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;

const PROOF_TYPES = [
  { value: "VIDEO", label: "Video Upload", icon: "🎥", description: "Athlete uploads a video" },
  { value: "IMAGE", label: "Image Upload", icon: "📷", description: "Athlete uploads a photo" },
  { value: "STRAVA", label: "Strava Activity", icon: "🏃", description: "Link a Strava activity" },
  { value: "GARMIN", label: "Garmin Activity", icon: "⌚", description: "Link a Garmin activity" },
  { value: "MANUAL", label: "Manual Entry", icon: "✍️", description: "Coach/admin verified" },
] as const;

const ACTIVITY_TYPES = [
  "Run", "Trail Run", "Ride", "Mountain Bike", "Swim", "Open Water Swim",
  "Walk", "Hike", "Row", "Kayak", "Cross-Country Ski", "Other"
] as const;

interface ChallengeFormProps {
  challenge?: {
    id: string;
    name: string;
    description: string;
    instructions: string | null;
    demoVideoUrl: string | null;
    demoImageUrl: string | null;
    isActive: boolean;
    gradingType: string;
    gradingUnit: string | null;
    weightUnit: string | null;
    timeFormat: string | null;
    minRank: string;
    maxRank: string;
    primaryDomainId: string;
    primaryXPPercent: number;
    secondaryDomainId: string | null;
    secondaryXPPercent: number | null;
    tertiaryDomainId: string | null;
    tertiaryXPPercent: number | null;
    gymId: string | null;
    // Proof types & activity validation
    proofTypes?: string[];
    activityType?: string | null;
    minDistance?: number | null;
    maxDistance?: number | null;
    minElevationGain?: number | null;
    requiresGPS?: boolean;
    requiresHeartRate?: boolean;
    categories: { category: Category }[];
    disciplines: { discipline: Discipline }[];
    equipment: { equipment: Equipment }[];
    grades?: { divisionId: string; rank: string; targetValue: number; targetWeight: number | null; description: string | null; bonusXP: number }[];
    allowedDivisions?: { division: Division }[];
  };
  domains: Domain[];
  categories: Category[];
  disciplines: Discipline[];
  equipment: Equipment[];
  divisions: Division[];
  gyms: Gym[];
  mode: "create" | "edit";
}

export function ChallengeForm({ challenge, domains, categories, disciplines, equipment, divisions, gyms, mode }: ChallengeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGrades, setIsGeneratingGrades] = useState(false);
  const [gradeGenerationNotes, setGradeGenerationNotes] = useState<string | null>(null);
  const [isSuggestingXP, setIsSuggestingXP] = useState(false);
  const [xpReasoning, setXpReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Similar challenge search
  const [similarChallenges, setSimilarChallenges] = useState<{
    id: string;
    name: string;
    slug: string;
    gradingType: string;
    isActive: boolean;
    primaryDomain: { name: string; icon: string | null } | null;
    categories: { category: { name: string } }[];
  }[]>([]);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

  // Filter states for long lists
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");

  const [formData, setFormData] = useState({
    name: challenge?.name ?? "",
    description: challenge?.description ?? "",
    instructions: challenge?.instructions ?? "",
    demoVideoUrl: challenge?.demoVideoUrl ?? "",
    demoImageUrl: challenge?.demoImageUrl ?? "",
    isActive: challenge?.isActive ?? true,
    gradingType: challenge?.gradingType ?? "PASS_FAIL",
    gradingUnit: challenge?.gradingUnit ?? "",
    weightUnit: challenge?.weightUnit ?? "lbs",
    timeFormat: (challenge?.timeFormat as TimeFormat) ?? "seconds" as TimeFormat,
    minRank: challenge?.minRank ?? "F",
    maxRank: challenge?.maxRank ?? "S",
    primaryDomainId: challenge?.primaryDomainId ?? "",
    primaryXPPercent: challenge?.primaryXPPercent ?? 100,
    secondaryDomainId: challenge?.secondaryDomainId ?? "",
    secondaryXPPercent: challenge?.secondaryXPPercent ?? 0,
    tertiaryDomainId: challenge?.tertiaryDomainId ?? "",
    tertiaryXPPercent: challenge?.tertiaryXPPercent ?? 0,
    categoryIds: challenge?.categories.map(c => c.category.id) ?? [],
    disciplineIds: challenge?.disciplines.map(d => d.discipline.id) ?? [],
    equipmentIds: challenge?.equipment?.map(e => e.equipment.id) ?? [],
    grades: challenge?.grades ?? [] as ChallengeGrade[],
    gymId: challenge?.gymId ?? "",
    allowedDivisionIds: challenge?.allowedDivisions?.map(d => d.division.id) ?? [],
    // Proof types & activity validation
    proofTypes: challenge?.proofTypes ?? ["VIDEO"],
    activityType: challenge?.activityType ?? "",
    minDistance: challenge?.minDistance ?? null,
    maxDistance: challenge?.maxDistance ?? null,
    minElevationGain: challenge?.minElevationGain ?? null,
    requiresGPS: challenge?.requiresGPS ?? false,
    requiresHeartRate: challenge?.requiresHeartRate ?? false,
  });

  // Check if activity-based proof types are selected
  const hasActivityProof = formData.proofTypes.includes("STRAVA") || formData.proofTypes.includes("GARMIN");

  const [isExtractingThumbnail, setIsExtractingThumbnail] = useState(false);

  // Calculate remaining XP percentage
  const remainingPercent = 100 - (formData.primaryXPPercent + (formData.secondaryXPPercent || 0) + (formData.tertiaryXPPercent || 0));

  // Check if grading unit is required (REPS, DISTANCE, TIMED_REPS)
  const needsGradingUnit = formData.gradingType !== "PASS_FAIL" && formData.gradingType !== "TIME";
  const hasRequiredGradingUnit = !needsGradingUnit || (formData.gradingUnit && formData.gradingUnit.trim().length > 0);

  // Collect validation errors for display
  const validationErrors: string[] = [];
  if (formData.name.trim().length < 2) validationErrors.push("Name must be at least 2 characters");
  if (formData.description.trim().length < 10) validationErrors.push("Description must be at least 10 characters");
  if (!formData.primaryDomainId) validationErrors.push("Primary domain is required");
  if (formData.categoryIds.length === 0) validationErrors.push("At least one category is required");
  if (remainingPercent !== 0) validationErrors.push(`XP percentages must sum to 100% (currently ${100 - remainingPercent}%)`);
  if (!hasRequiredGradingUnit) validationErrors.push("Unit of measurement is required for this grading type");

  // Form validation
  const isFormValid = validationErrors.length === 0;

  // Auto-adjust percentages when domains change
  useEffect(() => {
    if (!formData.secondaryDomainId) {
      setFormData(prev => ({
        ...prev,
        secondaryXPPercent: 0,
        tertiaryDomainId: "",
        tertiaryXPPercent: 0,
        primaryXPPercent: 100,
      }));
    } else if (!formData.tertiaryDomainId) {
      setFormData(prev => ({
        ...prev,
        tertiaryXPPercent: 0,
      }));
    }
  }, [formData.secondaryDomainId, formData.tertiaryDomainId]);

  // Debounced search for similar challenges
  const searchSimilarChallenges = useCallback(async (name: string) => {
    if (!name || name.trim().length < 3) {
      setSimilarChallenges([]);
      return;
    }

    setIsSearchingSimilar(true);
    try {
      const params = new URLSearchParams({ q: name.trim() });
      if (challenge?.id) {
        params.set("excludeId", challenge.id);
      }
      
      const response = await fetch(`/api/admin/challenges/search?${params}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSimilarChallenges(data);
      }
    } catch (err) {
      console.error("Similar challenge search error:", err);
    } finally {
      setIsSearchingSimilar(false);
    }
  }, [challenge?.id]);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSimilarChallenges(formData.name);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [formData.name, searchSimilarChallenges]);

  // AI generation for description and instructions
  const handleAIGenerate = async () => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError("Enter a challenge name first to generate content");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          gradingType: formData.gradingType,
          gradingUnit: formData.gradingUnit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content");
      }

      setFormData(prev => ({
        ...prev,
        description: data.description || prev.description,
        instructions: data.instructions || prev.instructions,
      }));
    } catch (err) {
      console.error("AI generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  // AI suggestion for XP distribution
  const handleSuggestXPDistribution = async () => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError("Enter a challenge name first to get XP suggestions");
      return;
    }

    if (domains.length === 0) {
      setError("No domains available for XP distribution");
      return;
    }

    setIsSuggestingXP(true);
    setError(null);
    setXpReasoning(null);

    try {
      let response: Response;
      try {
        response = await fetch("/api/admin/ai/suggest-xp-distribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim(),
            domains: domains.map(d => ({ id: d.id, name: d.name })),
          }),
        });
      } catch (networkError) {
        throw new Error("Network error - please check your connection");
      }

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response:", response.status, contentType);
        throw new Error(`Server error (${response.status}) - please try again`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to get XP suggestion");
      }

      // Apply the suggestion
      setFormData(prev => ({
        ...prev,
        primaryDomainId: data.primaryDomainId || prev.primaryDomainId,
        primaryXPPercent: data.primaryXPPercent || prev.primaryXPPercent,
        secondaryDomainId: data.secondaryDomainId || "",
        secondaryXPPercent: data.secondaryXPPercent || 0,
        tertiaryDomainId: data.tertiaryDomainId || "",
        tertiaryXPPercent: data.tertiaryXPPercent || 0,
      }));

      // Show the reasoning
      if (data.reasoning) {
        setXpReasoning(data.reasoning);
      }
    } catch (err) {
      console.error("XP suggestion error:", err);
      setError(err instanceof Error ? err.message : "Failed to get XP suggestion");
    } finally {
      setIsSuggestingXP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Client-side validation
    if (!formData.name.trim()) {
      setError("Challenge name is required");
      setIsLoading(false);
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setError("Description must be at least 10 characters");
      setIsLoading(false);
      return;
    }

    if (!formData.primaryDomainId) {
      setError("Primary domain is required");
      setIsLoading(false);
      return;
    }

    if (formData.categoryIds.length === 0) {
      setError("At least one category is required");
      setIsLoading(false);
      return;
    }

    // Validate XP sum
    const xpSum = formData.primaryXPPercent + (formData.secondaryXPPercent || 0) + (formData.tertiaryXPPercent || 0);
    if (xpSum !== 100) {
      setError(`XP percentages must sum to 100% (currently ${xpSum}%)`);
      setIsLoading(false);
      return;
    }

    // Validate domain selection (no duplicates)
    const selectedDomains = [formData.primaryDomainId];
    if (formData.secondaryDomainId) {
      if (selectedDomains.includes(formData.secondaryDomainId)) {
        setError("Secondary domain cannot be the same as primary");
        setIsLoading(false);
        return;
      }
      selectedDomains.push(formData.secondaryDomainId);
    }
    if (formData.tertiaryDomainId) {
      if (selectedDomains.includes(formData.tertiaryDomainId)) {
        setError("Tertiary domain cannot be the same as primary or secondary");
        setIsLoading(false);
        return;
      }
    }

    try {
      const url = mode === "create" 
        ? "/api/admin/challenges" 
        : `/api/admin/challenges/${challenge?.id}`;

      // Clean up the data - remove empty strings for optional fields
      // For TIME grading, auto-set the unit based on format
      const getGradingUnit = () => {
        if (formData.gradingType === "PASS_FAIL") return null;
        if (formData.gradingType === "TIME") {
          // Auto-generate unit label from time format
          switch (formData.timeFormat) {
            case "mm:ss": return "time (mm:ss)";
            case "hh:mm:ss": return "time (hh:mm:ss)";
            default: return "seconds";
          }
        }
        return formData.gradingUnit?.trim() || null;
      };

      const submitData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        instructions: formData.instructions?.trim() || null,
        demoVideoUrl: formData.demoVideoUrl?.trim() || null,
        demoImageUrl: formData.demoImageUrl?.trim() || null,
        gradingUnit: getGradingUnit(),
        weightUnit: formData.gradingType === "WEIGHTED_REPS" ? formData.weightUnit : null,
        timeFormat: formData.gradingType === "TIME" ? formData.timeFormat : null,
        secondaryDomainId: formData.secondaryDomainId || null,
        secondaryXPPercent: formData.secondaryDomainId ? formData.secondaryXPPercent : null,
        tertiaryDomainId: formData.tertiaryDomainId || null,
        tertiaryXPPercent: formData.tertiaryDomainId ? formData.tertiaryXPPercent : null,
        grades: formData.gradingType !== "PASS_FAIL" ? formData.grades : [],
        gymId: formData.gymId || null,
        allowedDivisionIds: formData.allowedDivisionIds,
        // Proof types & activity validation
        proofTypes: formData.proofTypes,
        activityType: hasActivityProof && formData.activityType ? formData.activityType : null,
        minDistance: hasActivityProof ? formData.minDistance : null,
        maxDistance: hasActivityProof ? formData.maxDistance : null,
        minElevationGain: hasActivityProof ? formData.minElevationGain : null,
        requiresGPS: hasActivityProof ? formData.requiresGPS : false,
        requiresHeartRate: hasActivityProof ? formData.requiresHeartRate : false,
      };
      
      // Retry logic for intermittent auth issues
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, {
            method: mode === "create" ? "POST" : "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(submitData),
          });

          let data;
          try {
            data = await response.json();
          } catch {
            // Response wasn't JSON - might be a server error
            if (!response.ok) {
              throw new Error(`Server error (${response.status}) - please try again`);
            }
            data = {};
          }

          if (!response.ok) {
            // If it's an auth error (401) and we have retries left, wait and retry
            if (response.status === 401 && attempt < maxRetries) {
              console.log(`Auth error on attempt ${attempt}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500 * attempt));
              continue;
            }
            
            let errorMessage = "Something went wrong";
            
            if (data.error) {
              errorMessage = data.error;
            }
            
            // Parse field-specific errors from Zod validation
            if (data.details?.fieldErrors) {
              const fieldErrors = Object.entries(data.details.fieldErrors)
                .filter(([, errors]) => (errors as string[]).length > 0)
                .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
                .join("; ");
              if (fieldErrors) {
                errorMessage = fieldErrors;
              }
            }
            
            // Parse form-level errors
            if (data.details?.formErrors?.length > 0) {
              errorMessage = data.details.formErrors.join("; ");
            }
            
            throw new Error(errorMessage);
          }

          // Success! Navigate away
          router.push("/admin/challenges");
          router.refresh();
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Unknown error");
          
          // If it's a network error and we have retries left, retry
          if (attempt < maxRetries && lastError.message.includes("fetch")) {
            console.log(`Network error on attempt ${attempt}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          
          // If it's not the last attempt and it's an "Unauthorized" error, retry
          if (attempt < maxRetries && lastError.message === "Unauthorized") {
            console.log(`Unauthorized on attempt ${attempt}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          
          // Otherwise, throw the error
          throw lastError;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error("Failed after multiple attempts");
    } catch (err) {
      console.error("Challenge form error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const toggleDiscipline = (disciplineId: string) => {
    setFormData(prev => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter(id => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const toggleEquipment = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(equipmentId)
        ? prev.equipmentIds.filter(id => id !== equipmentId)
        : [...prev.equipmentIds, equipmentId],
    }));
  };

  // Group categories by domain for better UX
  const categoriesByDomain = categories.reduce((acc, cat) => {
    if (!acc[cat.domainId]) {
      acc[cat.domainId] = [];
    }
    acc[cat.domainId].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  // Get available ranks based on minRank and maxRank
  const getAvailableRanks = () => {
    const minIdx = RANKS.indexOf(formData.minRank as typeof RANKS[number]);
    const maxIdx = RANKS.indexOf(formData.maxRank as typeof RANKS[number]);
    return RANKS.slice(minIdx, maxIdx + 1);
  };

  // Get or set grade for a division/rank
  const getGrade = (divisionId: string, rank: string) => {
    return formData.grades.find(g => g.divisionId === divisionId && g.rank === rank);
  };

  const setGrade = (divisionId: string, rank: string, targetValue: number) => {
    const existingIdx = formData.grades.findIndex(g => g.divisionId === divisionId && g.rank === rank);
    const newGrades = [...formData.grades];
    
    if (existingIdx >= 0) {
      if (targetValue === 0) {
        // Remove if set to 0
        newGrades.splice(existingIdx, 1);
      } else {
        newGrades[existingIdx] = { ...newGrades[existingIdx], targetValue };
      }
    } else if (targetValue > 0) {
      newGrades.push({ divisionId, rank, targetValue });
    }
    
    setFormData({ ...formData, grades: newGrades });
  };

  const setGradeWeight = (divisionId: string, rank: string, targetWeight: number | null) => {
    const existingIdx = formData.grades.findIndex(g => g.divisionId === divisionId && g.rank === rank);
    const newGrades = [...formData.grades];
    
    if (existingIdx >= 0) {
      newGrades[existingIdx] = { ...newGrades[existingIdx], targetWeight };
      setFormData({ ...formData, grades: newGrades });
    }
  };

  // Handle keyboard navigation in grade matrix (Excel-like behavior)
  const handleGradeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const navigate = (nextRow: number, nextCol: number) => {
      const nextInput = document.querySelector<HTMLInputElement>(
        `[data-grade-row="${nextRow}"][data-grade-col="${nextCol}"]`
      );
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        nextInput.select();
        return true;
      }
      return false;
    };

    switch (e.key) {
      case "Enter":
      case "ArrowDown":
        e.preventDefault();
        // Move to next row, same column
        if (!navigate(rowIndex + 1, colIndex)) {
          // If no next row, wrap to first row of next column
          navigate(0, colIndex + 1);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        // Move to previous row, same column
        if (!navigate(rowIndex - 1, colIndex)) {
          // If no previous row, could wrap to last row of previous column
          // For now, just stay put
        }
        break;
      case "ArrowRight":
        // Only navigate if cursor is at end of input
        if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
          navigate(rowIndex, colIndex + 1);
        }
        break;
      case "ArrowLeft":
        // Only navigate if cursor is at start of input
        if (e.currentTarget.selectionStart === 0) {
          navigate(rowIndex, colIndex - 1);
        }
        break;
    }
  };

  // Generate grades with AI
  const generateGradesWithAI = async () => {
    if (!formData.name.trim() || formData.gradingType === "PASS_FAIL") return;
    
    setIsGeneratingGrades(true);
    setGradeGenerationNotes(null);
    setError(null);
    
    try {
      const primaryDomain = domains.find(d => d.id === formData.primaryDomainId);
      
      let response: Response;
      try {
        response = await fetch("/api/admin/ai/generate-grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            gradingType: formData.gradingType,
            gradingUnit: formData.gradingType === "TIME" 
              ? (formData.timeFormat === "mm:ss" ? "time in mm:ss" : formData.timeFormat === "hh:mm:ss" ? "time in hh:mm:ss" : "seconds")
              : formData.gradingUnit,
            timeFormat: formData.gradingType === "TIME" ? formData.timeFormat : null,
            minRank: formData.minRank,
            maxRank: formData.maxRank,
            primaryDomain: primaryDomain?.name,
            // Only send allowed divisions if restrictions are set, otherwise all divisions
            divisions: (formData.allowedDivisionIds.length > 0
              ? divisions.filter(d => formData.allowedDivisionIds.includes(d.id))
              : divisions
            ).map(d => ({
              id: d.id,
              name: d.name,
              gender: d.gender,
              ageMin: d.ageMin,
              ageMax: d.ageMax,
            })),
          }),
        });
      } catch (networkError) {
        console.error("Network error:", networkError);
        throw new Error("Network error - please check your connection and try again");
      }

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response:", response.status, contentType);
        const text = await response.text();
        console.error("Response body:", text.substring(0, 500));
        throw new Error(`Server error (${response.status}) - the AI service may be temporarily unavailable`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate grades");
      }
      
      if (data.grades && Array.isArray(data.grades)) {
        // Merge AI-generated grades with existing grades (AI grades take precedence)
        const newGrades = [...formData.grades];
        
        for (const grade of data.grades) {
          const existingIdx = newGrades.findIndex(
            g => g.divisionId === grade.divisionId && g.rank === grade.rank
          );
          
          if (existingIdx >= 0) {
            newGrades[existingIdx] = { ...newGrades[existingIdx], targetValue: grade.targetValue };
          } else {
            newGrades.push({
              divisionId: grade.divisionId,
              rank: grade.rank,
              targetValue: grade.targetValue,
            });
          }
        }
        
        setFormData({ ...formData, grades: newGrades });
        
        // Show notes if available
        if (data.notes) {
          setGradeGenerationNotes(data.notes);
        }
      }
    } catch (err) {
      console.error("Error generating grades:", err);
      setError(err instanceof Error ? err.message : "Failed to generate grades");
    } finally {
      setIsGeneratingGrades(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name and description of the challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Salmon Ladder - 5 Rungs"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
              maxLength={100}
              className={formData.name.length > 0 && formData.name.trim().length < 2 ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {formData.name.length > 0 && formData.name.trim().length < 2 && (
              <p className="text-xs text-red-500">Name must be at least 2 characters</p>
            )}
            
            {/* Similar Challenges Warning */}
            {(isSearchingSimilar || similarChallenges.length > 0) && formData.name.trim().length >= 3 && (
              <div className="mt-2 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {isSearchingSimilar ? "Searching for similar challenges..." : "Similar challenges found"}
                    </p>
                    {!isSearchingSimilar && similarChallenges.length > 0 && (
                      <>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Check if any of these match what you're creating to avoid duplicates:
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {similarChallenges.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate">
                                <span className="font-medium text-amber-900 dark:text-amber-100">{c.name}</span>
                                {c.primaryDomain && (
                                  <span className="text-amber-600 dark:text-amber-400 ml-1">
                                    ({c.primaryDomain.icon} {c.primaryDomain.name})
                                  </span>
                                )}
                                {!c.isActive && (
                                  <span className="text-xs text-amber-500 ml-1">(inactive)</span>
                                )}
                              </span>
                              <a
                                href={`/admin/challenges/${c.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Generate Button */}
          <div className="flex items-center gap-2 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAIGenerate}
              disabled={isGenerating || !formData.name.trim() || formData.name.trim().length < 2}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Auto-fill description & instructions based on challenge name
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what this challenge involves..."
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              required
              minLength={10}
              rows={3}
              className={formData.description.length > 0 && formData.description.trim().length < 10 ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {formData.description.length > 0 && formData.description.trim().length < 10 && (
              <p className="text-xs text-red-500">Description must be at least 10 characters ({formData.description.trim().length}/10)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="How to perform and submit this challenge..."
              value={formData.instructions}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, instructions: e.target.value })}
              rows={3}
            />
          </div>

          {/* XP Info - XP is now tier-based globally */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium mb-2">XP Awards (Tier-Based)</p>
            <p className="text-muted-foreground">
              {formData.gradingType === "PASS_FAIL" ? (
                <>Pass/Fail challenges award XP based on their rank range (F: 25, E: 50, D: 75, C: 100, B: 150, A: 200, S: 300).</>
              ) : (
                <>Graded challenges award XP for <strong>each tier</strong> cleared. Athletes can only claim each tier once per challenge. Example: 20 pull-ups (C-rank) = F(25) + E(50) + D(75) + C(100) = <strong>250 XP</strong>.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* XP Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>XP Distribution</CardTitle>
              <CardDescription>
                How XP is distributed across domains. Must sum to 100%.
                {remainingPercent !== 0 && (
                  <span className={remainingPercent > 0 ? "text-amber-500" : "text-destructive"}>
                    {" "}({remainingPercent > 0 ? `${remainingPercent}% remaining` : `${Math.abs(remainingPercent)}% over`})
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggestXPDistribution}
              disabled={isSuggestingXP || !formData.name.trim() || formData.name.trim().length < 2}
              className="gap-2 shrink-0"
            >
              {isSuggestingXP ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suggesting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI Suggest
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Reasoning */}
          {xpReasoning && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
              <p className="font-medium text-primary mb-1">✨ AI Recommendation</p>
              <p className="text-muted-foreground">{xpReasoning}</p>
            </div>
          )}
          
          {/* Primary Domain */}
          <div className="space-y-2">
            <Label>Primary Domain * ({formData.primaryXPPercent}%)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                value={formData.primaryDomainId}
                onValueChange={(val) => setFormData({ ...formData, primaryDomainId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.icon} {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Slider
                value={[formData.primaryXPPercent]}
                onValueChange={(values: number[]) => setFormData({ ...formData, primaryXPPercent: values[0] })}
                min={50}
                max={100}
                step={5}
              />
            </div>
          </div>

          {/* Secondary Domain */}
          <div className="space-y-2">
            <Label>Secondary Domain (Optional) ({formData.secondaryXPPercent || 0}%)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                value={formData.secondaryDomainId || "none"}
                onValueChange={(val) => setFormData({ 
                  ...formData, 
                  secondaryDomainId: val === "none" ? "" : val,
                  secondaryXPPercent: val === "none" ? 0 : (formData.secondaryXPPercent || 25),
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {domains
                    .filter(d => d.id !== formData.primaryDomainId)
                    .map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.icon} {domain.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.secondaryDomainId && (
                <Slider
                  value={[formData.secondaryXPPercent || 0]}
                  onValueChange={(values: number[]) => setFormData({ ...formData, secondaryXPPercent: values[0] })}
                  min={5}
                  max={50}
                  step={5}
                />
              )}
            </div>
          </div>

          {/* Tertiary Domain */}
          {formData.secondaryDomainId && (
            <div className="space-y-2">
              <Label>Tertiary Domain (Optional) ({formData.tertiaryXPPercent || 0}%)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  value={formData.tertiaryDomainId || "none"}
                  onValueChange={(val) => setFormData({ 
                    ...formData, 
                    tertiaryDomainId: val === "none" ? "" : val,
                    tertiaryXPPercent: val === "none" ? 0 : (formData.tertiaryXPPercent || 10),
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {domains
                      .filter(d => d.id !== formData.primaryDomainId && d.id !== formData.secondaryDomainId)
                      .map((domain) => (
                        <SelectItem key={domain.id} value={domain.id}>
                          {domain.icon} {domain.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formData.tertiaryDomainId && (
                  <Slider
                    value={[formData.tertiaryXPPercent || 0]}
                    onValueChange={(values: number[]) => setFormData({ ...formData, tertiaryXPPercent: values[0] })}
                    min={5}
                    max={30}
                    step={5}
                  />
                )}
              </div>
            </div>
          )}

          {/* XP Distribution Preview */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-2">Domain Distribution</p>
            <div className="flex flex-wrap gap-2">
              {formData.primaryDomainId && (
                <Badge variant="secondary">
                  {domains.find(d => d.id === formData.primaryDomainId)?.name}: {formData.primaryXPPercent}%
                </Badge>
              )}
              {formData.secondaryDomainId && formData.secondaryXPPercent && (
                <Badge variant="secondary">
                  {domains.find(d => d.id === formData.secondaryDomainId)?.name}: {formData.secondaryXPPercent}%
                </Badge>
              )}
              {formData.tertiaryDomainId && formData.tertiaryXPPercent && (
                <Badge variant="secondary">
                  {domains.find(d => d.id === formData.tertiaryDomainId)?.name}: {formData.tertiaryXPPercent}%
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories *</CardTitle>
          <CardDescription>
            Select which categories this challenge appears in (at least one required).
            Selected: {formData.categoryIds.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain) => {
              const domainCategories = categoriesByDomain[domain.id] || [];
              if (domainCategories.length === 0) return null;
              
              return (
                <div key={domain.id}>
                  <p className="text-sm font-medium mb-2">{domain.icon} {domain.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {domainCategories.map((cat) => (
                      <Badge
                        key={cat.id}
                        variant={formData.categoryIds.includes(cat.id) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {cat.name}
                        {formData.categoryIds.includes(cat.id) && " ✓"}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {formData.categoryIds.length === 0 && (
            <p className="text-xs text-destructive mt-2">At least one category is required</p>
          )}
        </CardContent>
      </Card>

      {/* Disciplines */}
      <Card>
        <CardHeader>
          <CardTitle>Disciplines</CardTitle>
          <CardDescription>
            Tag this challenge with relevant sports/activities for filtering.
            Selected: {formData.disciplineIds.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {disciplines.length > 8 && (
            <div className="relative max-w-xs">
              <Input
                placeholder="Search disciplines..."
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
              />
              {disciplineFilter && (
                <button
                  type="button"
                  onClick={() => setDisciplineFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm px-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {disciplines
              .filter((disc) =>
                disciplineFilter
                  ? disc.name.toLowerCase().includes(disciplineFilter.toLowerCase())
                  : true
              )
              .map((disc) => (
                <Badge
                  key={disc.id}
                  variant={formData.disciplineIds.includes(disc.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleDiscipline(disc.id)}
                >
                  {disc.icon} {disc.name}
                  {formData.disciplineIds.includes(disc.id) && " ✓"}
                </Badge>
              ))}
            {disciplineFilter && disciplines.filter((disc) =>
              disc.name.toLowerCase().includes(disciplineFilter.toLowerCase())
            ).length === 0 && (
              <p className="text-xs text-muted-foreground">No disciplines match &quot;{disciplineFilter}&quot;</p>
            )}
          </div>
          {disciplines.length === 0 && (
            <p className="text-xs text-muted-foreground">No disciplines created yet</p>
          )}
        </CardContent>
      </Card>

      {/* Equipment Required */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Required</CardTitle>
          <CardDescription>
            Select equipment needed to perform this challenge. Gyms can use this to filter challenges they can support.
            Selected: {formData.equipmentIds.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {equipment.length > 8 && (
            <div className="relative max-w-xs">
              <Input
                placeholder="Search equipment..."
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
              />
              {equipmentFilter && (
                <button
                  type="button"
                  onClick={() => setEquipmentFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm px-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {equipment
              .filter((eq) =>
                equipmentFilter
                  ? eq.name.toLowerCase().includes(equipmentFilter.toLowerCase())
                  : true
              )
              .map((eq) => (
                <Badge
                  key={eq.id}
                  variant={formData.equipmentIds.includes(eq.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleEquipment(eq.id)}
                >
                  {eq.icon} {eq.name}
                  {formData.equipmentIds.includes(eq.id) && " ✓"}
                </Badge>
              ))}
            {equipmentFilter && equipment.filter((eq) =>
              eq.name.toLowerCase().includes(equipmentFilter.toLowerCase())
            ).length === 0 && (
              <p className="text-xs text-muted-foreground">No equipment matches &quot;{equipmentFilter}&quot;</p>
            )}
          </div>
          {equipment.length === 0 && (
            <p className="text-xs text-muted-foreground">No equipment created yet. <a href="/admin/equipment" className="underline">Add equipment</a></p>
          )}
        </CardContent>
      </Card>

      {/* Gym-Specific Challenge */}
      <Card>
        <CardHeader>
          <CardTitle>Gym Restriction</CardTitle>
          <CardDescription>
            Optionally restrict this challenge to a specific gym. If set, only members of that gym can see and attempt this challenge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Gym (Optional)</Label>
            <Select
              value={formData.gymId || "global"}
              onValueChange={(val) => setFormData({ ...formData, gymId: val === "global" ? "" : val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Global (all athletes)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">🌍 Global (all athletes)</SelectItem>
                {gyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    🏢 {gym.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.gymId && (
              <p className="text-xs text-amber-600">
                ⚠️ This challenge will only be visible to members of the selected gym.
              </p>
            )}
            {!formData.gymId && (
              <p className="text-xs text-muted-foreground">
                Global challenges are visible to all athletes.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allowed Divisions */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed Divisions</CardTitle>
          <CardDescription>
            Restrict which age/gender divisions can attempt this challenge. Leave empty to allow all divisions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {divisions.map((division) => {
                const isSelected = formData.allowedDivisionIds.includes(division.id);
                return (
                  <Badge
                    key={division.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3 transition-colors"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        allowedDivisionIds: isSelected
                          ? formData.allowedDivisionIds.filter(id => id !== division.id)
                          : [...formData.allowedDivisionIds, division.id],
                      });
                    }}
                  >
                    {division.name}
                    {division.ageMin !== null && division.ageMax !== null && (
                      <span className="ml-1 text-xs opacity-70">
                        ({division.ageMin}-{division.ageMax})
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
            {formData.allowedDivisionIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                🌍 All divisions can attempt this challenge.
              </p>
            ) : (
              <p className="text-xs text-amber-600">
                ⚠️ Only {formData.allowedDivisionIds.length} selected division(s) can see and attempt this challenge.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grading Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Grading Configuration</CardTitle>
          <CardDescription>
            How this challenge is measured and what ranks it applies to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grading Type */}
          <div className="space-y-2">
            <Label>Grading Type</Label>
            <Select
              value={formData.gradingType}
              onValueChange={(val) => setFormData({ ...formData, gradingType: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grading Unit (only for non-PASS_FAIL and non-TIME) */}
          {formData.gradingType !== "PASS_FAIL" && formData.gradingType !== "TIME" && (
            <div className="space-y-2">
              <Label htmlFor="gradingUnit">Unit of Measurement *</Label>
              <Input
                id="gradingUnit"
                placeholder={
                  formData.gradingType === "REPS" ? "reps" :
                  formData.gradingType === "DISTANCE" ? "meters" :
                  formData.gradingType === "TIMED_REPS" ? "reps in 60s" :
                  formData.gradingType === "WEIGHTED_REPS" ? "reps" : "unit"
                }
                value={formData.gradingUnit}
                onChange={(e) => setFormData({ ...formData, gradingUnit: e.target.value })}
                maxLength={20}
                className={!hasRequiredGradingUnit ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {!hasRequiredGradingUnit ? (
                <p className="text-xs text-red-500">Unit of measurement is required</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  e.g., &quot;reps&quot;, &quot;meters&quot;, &quot;reps in 60s&quot;
                </p>
              )}
            </div>
          )}

          {/* Weight Unit (only for WEIGHTED_REPS) */}
          {formData.gradingType === "WEIGHTED_REPS" && (
            <div className="space-y-2">
              <Label>Weight Unit</Label>
              <Select
                value={formData.weightUnit}
                onValueChange={(val) => setFormData({ ...formData, weightUnit: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Weight unit for grade targets
              </p>
            </div>
          )}

          {/* Time Format (only for TIME grading type) */}
          {formData.gradingType === "TIME" && (
            <div className="space-y-2">
              <Label>Time Input Format</Label>
              <Select
                value={formData.timeFormat}
                onValueChange={(val) => setFormData({ ...formData, timeFormat: val as TimeFormat })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How times are entered and displayed (stored as seconds internally)
              </p>
            </div>
          )}

          {/* Rank Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Rank</Label>
              <Select
                value={formData.minRank}
                onValueChange={(val) => {
                  const maxIdx = RANKS.indexOf(formData.maxRank as typeof RANKS[number]);
                  const newIdx = RANKS.indexOf(val as typeof RANKS[number]);
                  setFormData({ 
                    ...formData, 
                    minRank: val,
                    // Adjust maxRank if needed
                    maxRank: newIdx > maxIdx ? val : formData.maxRank,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}-Rank
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">First rank this challenge is available</p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Rank</Label>
              <Select
                value={formData.maxRank}
                onValueChange={(val) => setFormData({ ...formData, maxRank: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map((rank) => {
                    const minIdx = RANKS.indexOf(formData.minRank as typeof RANKS[number]);
                    const thisIdx = RANKS.indexOf(rank);
                    return (
                      <SelectItem key={rank} value={rank} disabled={thisIdx < minIdx}>
                        {rank}-Rank
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Last rank this challenge is available</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            This challenge is available for ranks: <strong>{getAvailableRanks().join(", ")}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Proof Types & Activity Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Proof Types</CardTitle>
          <CardDescription>
            How athletes can prove they completed this challenge. Select all that apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proof Type Selection */}
          <div className="space-y-3">
            <Label>Accepted Proof Types *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROOF_TYPES.map((type) => {
                const isSelected = formData.proofTypes.includes(type.value);
                return (
                  <div
                    key={type.value}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                    `}
                    onClick={() => {
                      const newProofTypes = isSelected
                        ? formData.proofTypes.filter(t => t !== type.value)
                        : [...formData.proofTypes, type.value];
                      // Ensure at least one type is selected
                      if (newProofTypes.length > 0) {
                        setFormData({ ...formData, proofTypes: newProofTypes });
                      }
                    }}
                  >
                    <div className="text-xl">{type.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{type.label}</span>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {formData.proofTypes.length === 0 && (
              <p className="text-xs text-red-500">At least one proof type is required</p>
            )}
          </div>

          {/* Activity Validation Rules (only when Strava or Garmin selected) */}
          {hasActivityProof && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="font-medium text-sm mb-1">Activity Validation Rules</h4>
                <p className="text-xs text-muted-foreground">
                  Configure requirements for Strava/Garmin activities. Leave blank for no restriction.
                </p>
              </div>

              {/* Activity Type */}
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select
                  value={formData.activityType || "any"}
                  onValueChange={(val) => setFormData({ ...formData, activityType: val === "any" ? "" : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any activity type</SelectItem>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Filter by activity type (Run, Ride, Swim, etc.)</p>
              </div>

              {/* Distance Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minDistance">Minimum Distance (meters)</Label>
                  <Input
                    id="minDistance"
                    type="number"
                    min={0}
                    step={100}
                    placeholder="e.g., 5000"
                    value={formData.minDistance ?? ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      minDistance: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                  />
                  <p className="text-xs text-muted-foreground">5000 = 5K</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDistance">Maximum Distance (meters)</Label>
                  <Input
                    id="maxDistance"
                    type="number"
                    min={0}
                    step={100}
                    placeholder="e.g., 5500"
                    value={formData.maxDistance ?? ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxDistance: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                  />
                  <p className="text-xs text-muted-foreground">For time trials (e.g., 5K = 4900-5200m)</p>
                </div>
              </div>

              {/* Elevation Gain */}
              <div className="space-y-2">
                <Label htmlFor="minElevationGain">Minimum Elevation Gain (meters)</Label>
                <Input
                  id="minElevationGain"
                  type="number"
                  min={0}
                  step={50}
                  placeholder="e.g., 500"
                  value={formData.minElevationGain ?? ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    minElevationGain: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                />
                <p className="text-xs text-muted-foreground">For hill/mountain challenges. 500m = ~1,640ft</p>
              </div>

              {/* GPS & Heart Rate Requirements */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border flex-1">
                  <Switch
                    id="requiresGPS"
                    checked={formData.requiresGPS}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresGPS: checked })}
                  />
                  <div>
                    <Label htmlFor="requiresGPS" className="cursor-pointer">Requires GPS</Label>
                    <p className="text-xs text-muted-foreground">Must be outdoor (no treadmill)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border flex-1">
                  <Switch
                    id="requiresHeartRate"
                    checked={formData.requiresHeartRate}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresHeartRate: checked })}
                  />
                  <div>
                    <Label htmlFor="requiresHeartRate" className="cursor-pointer">Requires Heart Rate</Label>
                    <p className="text-xs text-muted-foreground">Proves genuine effort</p>
                  </div>
                </div>
              </div>

              {/* Preview of Rules */}
              {(formData.activityType || formData.minDistance || formData.maxDistance || formData.minElevationGain || formData.requiresGPS || formData.requiresHeartRate) && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-2">Activity Requirements Summary</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {formData.activityType && <li>• Activity type: <strong>{formData.activityType}</strong></li>}
                    {formData.minDistance && <li>• Min distance: <strong>{(formData.minDistance / 1000).toFixed(1)} km</strong></li>}
                    {formData.maxDistance && <li>• Max distance: <strong>{(formData.maxDistance / 1000).toFixed(1)} km</strong></li>}
                    {formData.minElevationGain && <li>• Min elevation: <strong>{formData.minElevationGain} m</strong></li>}
                    {formData.requiresGPS && <li>• ✅ GPS required (outdoor only)</li>}
                    {formData.requiresHeartRate && <li>• ✅ Heart rate data required</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Matrix (only for non-PASS_FAIL) */}
      {formData.gradingType !== "PASS_FAIL" && divisions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>Grade Requirements by Division</CardTitle>
                <CardDescription>
                  Set the target {formData.gradingType === "TIME" ? "time" : (formData.gradingUnit || "value")} for each division at each rank.
                  Leave blank or 0 if this challenge doesn&apos;t apply to a division/rank.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateGradesWithAI}
                disabled={isGeneratingGrades || !formData.name.trim() || (formData.gradingType !== "TIME" && !formData.gradingUnit)}
                className="shrink-0"
              >
                {isGeneratingGrades ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
            {gradeGenerationNotes && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>AI Notes:</strong> {gradeGenerationNotes}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Division</th>
                    {getAvailableRanks().map(rank => (
                      <th key={rank} className="text-center py-2 px-2 font-medium min-w-[70px]">
                        {rank}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Filter to allowed divisions if any are selected, otherwise show all */}
                  {(formData.allowedDivisionIds.length > 0 
                    ? divisions.filter(d => formData.allowedDivisionIds.includes(d.id))
                    : divisions
                  ).map((division, rowIndex) => (
                    <tr key={division.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium whitespace-nowrap">{division.name}</td>
                      {getAvailableRanks().map((rank, colIndex) => {
                        const grade = getGrade(division.id, rank);
                        return (
                          <td key={rank} className="py-2 px-1">
                            {formData.gradingType === "TIME" ? (
                              <TimeInput
                                value={grade?.targetValue}
                                onChange={(seconds) => setGrade(division.id, rank, seconds)}
                                format={formData.timeFormat}
                                className="w-20 h-8 text-sm"
                                data-grade-row={rowIndex}
                                data-grade-col={colIndex}
                                onKeyDown={(e) => handleGradeKeyDown(e, rowIndex, colIndex)}
                              />
                            ) : formData.gradingType === "WEIGHTED_REPS" ? (
                              <div className="flex flex-col gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-16 h-7 text-center text-xs"
                                  value={grade?.targetValue ?? ""}
                                  onChange={(e) => setGrade(division.id, rank, parseInt(e.target.value) || 0)}
                                  placeholder="reps"
                                  title="Reps"
                                  data-grade-row={rowIndex}
                                  data-grade-col={colIndex}
                                  data-grade-subrow={0}
                                  onKeyDown={(e) => handleGradeKeyDown(e, rowIndex, colIndex)}
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-16 h-7 text-center text-xs"
                                  value={grade?.targetWeight ?? ""}
                                  onChange={(e) => setGradeWeight(division.id, rank, parseInt(e.target.value) || null)}
                                  placeholder={formData.weightUnit}
                                  title={`Weight (${formData.weightUnit})`}
                                  disabled={!grade?.targetValue}
                                  data-grade-row={rowIndex}
                                  data-grade-col={colIndex}
                                  data-grade-subrow={1}
                                  onKeyDown={(e) => handleGradeKeyDown(e, rowIndex, colIndex)}
                                />
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                className="w-16 h-8 text-center text-sm"
                                value={grade?.targetValue ?? ""}
                                onChange={(e) => setGrade(division.id, rank, parseInt(e.target.value) || 0)}
                                placeholder="—"
                                data-grade-row={rowIndex}
                                data-grade-col={colIndex}
                                onKeyDown={(e) => handleGradeKeyDown(e, rowIndex, colIndex)}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {formData.gradingType === "WEIGHTED_REPS" && (
              <p className="text-xs text-muted-foreground mt-3">
                💡 Enter target reps (top) and weight in {formData.weightUnit} (bottom) for each tier.
              </p>
            )}
            {formData.allowedDivisionIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                💡 Only showing divisions selected in "Allowed Divisions" above.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {formData.gradingType !== "PASS_FAIL" && divisions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No divisions created yet. <a href="/admin/divisions" className="underline">Create divisions</a> to set up graded requirements.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Demo Media */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Media</CardTitle>
          <CardDescription>Video or image showing how to perform the challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Video - Upload or External URL */}
          <div className="space-y-3">
            <Label>Demo Video</Label>
            <Tabs 
              defaultValue={formData.demoVideoUrl && isEmbeddableVideoUrl(formData.demoVideoUrl) ? "external" : "upload"}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="external" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  YouTube / Vimeo
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-4 space-y-2">
                <VideoUpload
                  value={formData.demoVideoUrl && !isEmbeddableVideoUrl(formData.demoVideoUrl) ? formData.demoVideoUrl : null}
                  onUpload={(url) => setFormData({ ...formData, demoVideoUrl: url })}
                  onRemove={() => setFormData({ ...formData, demoVideoUrl: "" })}
                  maxDurationSeconds={60}
                  maxSizeMB={50}
                  enableCompression={true}
                  compressionThresholdMB={10}
                />
                <p className="text-xs text-muted-foreground">Upload a short demo video (max 60 seconds). Large videos will be compressed automatically.</p>
              </TabsContent>
              <TabsContent value="external" className="mt-4 space-y-3">
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  value={formData.demoVideoUrl && isEmbeddableVideoUrl(formData.demoVideoUrl) ? formData.demoVideoUrl : ""}
                  onChange={(e) => setFormData({ ...formData, demoVideoUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Paste a YouTube or Vimeo URL. The video will be embedded on the challenge page.</p>
                {formData.demoVideoUrl && isEmbeddableVideoUrl(formData.demoVideoUrl) && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <VideoEmbed url={formData.demoVideoUrl} className="max-w-md" />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Demo Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Demo Image (Optional)</Label>
              {formData.demoVideoUrl && isEmbeddableVideoUrl(formData.demoVideoUrl) && !formData.demoImageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isExtractingThumbnail}
                  onClick={async () => {
                    setIsExtractingThumbnail(true);
                    try {
                      const { platform } = parseVideoUrl(formData.demoVideoUrl);
                      let thumbnailUrl: string | null = null;
                      
                      if (platform === "youtube") {
                        thumbnailUrl = getVideoThumbnailUrl(formData.demoVideoUrl);
                      } else if (platform === "vimeo") {
                        thumbnailUrl = await fetchVimeoThumbnail(formData.demoVideoUrl);
                      }
                      
                      if (thumbnailUrl) {
                        setFormData({ ...formData, demoImageUrl: thumbnailUrl });
                      }
                    } catch (err) {
                      console.error("Failed to extract thumbnail:", err);
                    } finally {
                      setIsExtractingThumbnail(false);
                    }
                  }}
                  className="gap-2"
                >
                  {isExtractingThumbnail ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-3 w-3" />
                      Use Video Thumbnail
                    </>
                  )}
                </Button>
              )}
            </div>
            <ImageUpload
              currentImageUrl={formData.demoImageUrl || null}
              onUpload={(url) => setFormData({ ...formData, demoImageUrl: url })}
              onRemove={() => setFormData({ ...formData, demoImageUrl: "" })}
              uploadEndpoint="/api/upload/image"
              aspectRatio={16 / 9}
            />
            <p className="text-xs text-muted-foreground">Fallback image if video can't be shown. Will be cropped to 16:9.</p>
          </div>
        </CardContent>
      </Card>

      {/* Status & Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
              <span className="text-xs text-muted-foreground">
                Inactive challenges are hidden from athletes
              </span>
            </div>
          </div>

          {/* Validation Errors Summary */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Please fix the following issues:</p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading || !isFormValid} className="min-w-[140px]">
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Challenge"
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/challenges")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
