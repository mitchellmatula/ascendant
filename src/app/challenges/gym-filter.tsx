"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";

interface Gym {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

interface GymFilterProps {
  gyms: Gym[];
  currentGymSlug?: string;
}

export function GymFilter({ gyms, currentGymSlug }: GymFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateGymFilter = useCallback((gymSlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (gymSlug && gymSlug !== "all") {
      params.set("gym", gymSlug);
      params.delete("page"); // Reset to page 1 on filter change
    } else {
      params.delete("gym");
      params.delete("equipment"); // Also clear equipment filter when removing gym
    }
    
    const queryString = params.toString();
    startTransition(() => {
      router.push(`/challenges${queryString ? `?${queryString}` : ""}`);
    });
  }, [router, searchParams]);

  if (gyms.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentGymSlug || "all"}
        onValueChange={updateGymFilter}
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          {isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder="Filter by gym" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>All Gyms</span>
            </div>
          </SelectItem>
          {gyms.map((gym) => (
            <SelectItem key={gym.id} value={gym.slug}>
              <div className="flex items-center gap-2">
                {gym.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gym.logoUrl}
                    alt=""
                    className="w-4 h-4 rounded object-cover"
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                )}
                <span>{gym.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
