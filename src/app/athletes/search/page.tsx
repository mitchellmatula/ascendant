import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AthleteSearchContent } from "@/components/feed/athlete-search";

function SearchSkeleton() {
  return (
    <>
      <Skeleton className="w-full h-12 mb-6" />
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
    </>
  );
}

export default function AthleteSearchPage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Find Athletes</h1>
      <Suspense fallback={<SearchSkeleton />}>
        <AthleteSearchContent />
      </Suspense>
    </div>
  );
}
