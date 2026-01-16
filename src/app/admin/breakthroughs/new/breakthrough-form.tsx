"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Domain {
  id: string;
  name: string;
  icon: string | null;
}

interface Division {
  id: string;
  name: string;
}

interface BreakthroughFormProps {
  domains: Domain[];
  divisions: Division[];
}

const RANKS = ["F", "E", "D", "C", "B", "A", "S"];
const RANK_TRANSITIONS = [
  { from: "F", to: "E" },
  { from: "E", to: "D" },
  { from: "D", to: "C" },
  { from: "C", to: "B" },
  { from: "B", to: "A" },
  { from: "A", to: "S" },
];

export function BreakthroughForm({ domains, divisions }: BreakthroughFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [domainId, setDomainId] = useState("");
  const [transition, setTransition] = useState("");
  const [tierRequired, setTierRequired] = useState("");
  const [challengeCount, setChallengeCount] = useState("3");
  const [hasDivisionOverride, setHasDivisionOverride] = useState(false);
  const [divisionId, setDivisionId] = useState("");
  const [applyToAllDomains, setApplyToAllDomains] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transition || !tierRequired || !challengeCount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!applyToAllDomains && !domainId) {
      toast.error("Please select a domain or apply to all domains");
      return;
    }

    if (hasDivisionOverride && !divisionId) {
      toast.error("Please select a division for the override");
      return;
    }

    const [fromRank, toRank] = transition.split("-");

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/breakthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          domainId: applyToAllDomains ? null : domainId,
          applyToAllDomains,
          fromRank,
          toRank,
          tierRequired,
          challengeCount: parseInt(challengeCount, 10),
          divisionId: hasDivisionOverride ? divisionId : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create rule");
      }

      toast.success("Breakthrough rule created");
      router.push("/admin/breakthroughs");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create rule");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="applyToAll" 
                checked={applyToAllDomains}
                onCheckedChange={(checked) => setApplyToAllDomains(checked as boolean)}
              />
              <Label htmlFor="applyToAll" className="font-normal">
                Apply to all domains
              </Label>
            </div>
            
            {!applyToAllDomains && (
              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.icon} {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Rank Transition */}
          <div className="space-y-2">
            <Label htmlFor="transition">Rank Transition *</Label>
            <Select value={transition} onValueChange={setTransition}>
              <SelectTrigger>
                <SelectValue placeholder="Select transition" />
              </SelectTrigger>
              <SelectContent>
                {RANK_TRANSITIONS.map((t) => (
                  <SelectItem key={`${t.from}-${t.to}`} value={`${t.from}-${t.to}`}>
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{t.from}</span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-bold">{t.to}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The rank breakthrough this rule applies to
            </p>
          </div>

          {/* Tier Required */}
          <div className="space-y-2">
            <Label htmlFor="tierRequired">Tier Required *</Label>
            <Select value={tierRequired} onValueChange={setTierRequired}>
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {RANKS.map((rank) => (
                  <SelectItem key={rank} value={rank}>
                    {rank}-tier
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Athletes must achieve this tier or higher on challenges
            </p>
          </div>

          {/* Challenge Count */}
          <div className="space-y-2">
            <Label htmlFor="challengeCount">Challenge Count *</Label>
            <Input
              id="challengeCount"
              type="number"
              min="1"
              max="100"
              value={challengeCount}
              onChange={(e) => setChallengeCount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Number of unique challenges required at the tier
            </p>
          </div>

          {/* Division Override */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasDivisionOverride" 
                checked={hasDivisionOverride}
                onCheckedChange={(checked) => setHasDivisionOverride(checked as boolean)}
              />
              <Label htmlFor="hasDivisionOverride" className="font-normal">
                This is a division-specific override
              </Label>
            </div>
            
            {hasDivisionOverride && (
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This rule will only apply to athletes in this division
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link href="/admin/breakthroughs" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
