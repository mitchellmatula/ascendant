"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";

export function ChallengeSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const currentSearch = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(currentSearch);

  const updateSearch = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (query) {
      params.set("q", query);
      params.delete("page"); // Reset to page 1 on new search
    } else {
      params.delete("q");
    }
    
    const queryString = params.toString();
    startTransition(() => {
      router.push(`/challenges${queryString ? `?${queryString}` : ""}`);
    });
  }, [router, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue("");
    updateSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search challenges..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button type="submit" disabled={isPending} className="shrink-0">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Search"
        )}
      </Button>
    </form>
  );
}
