"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Domain {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface DomainFilterProps {
  domains: Domain[];
  selectedDomainId?: string;
}

export function DomainFilter({ domains, selectedDomainId }: DomainFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("domain");
    } else {
      params.set("domain", value);
    }
    router.push(`/admin/categories?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Filter by domain:</span>
      <Select value={selectedDomainId ?? "all"} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All domains" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All domains</SelectItem>
          {domains.map((domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              <span className="flex items-center gap-2">
                <span>{domain.icon || "🎯"}</span>
                <span>{domain.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
