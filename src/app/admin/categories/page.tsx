import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryActions } from "./category-actions";
import { DomainFilter } from "./domain-filter";

interface CategoriesPageProps {
  searchParams: Promise<{ domain?: string }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { domain: domainId } = await searchParams;

  // Get all domains for the filter
  const domains = await db.domain.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true, color: true },
  });

  // Get categories, optionally filtered by domain
  const categories = await db.category.findMany({
    where: domainId ? { domainId } : undefined,
    orderBy: [{ domain: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      domain: {
        select: { id: true, name: true, icon: true, color: true },
      },
      _count: {
        select: { challenges: true },
      },
    },
  });

  const selectedDomain = domainId ? domains.find((d) => d.id === domainId) : null;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {selectedDomain 
              ? `Categories in ${selectedDomain.name}` 
              : "Manage categories across all domains"}
          </p>
        </div>
        <Link href={`/admin/categories/new${domainId ? `?domain=${domainId}` : ""}`}>
          <Button size="lg" className="w-full sm:w-auto">
            + Add Category
          </Button>
        </Link>
      </div>

      {/* Domain filter */}
      <DomainFilter domains={domains} selectedDomainId={domainId} />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {selectedDomain 
                ? `No categories in ${selectedDomain.name} yet.`
                : "No categories have been created yet."}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Categories organize challenges within each domain (e.g., Balance, Climbing, Grip Strength).
            </p>
            <Link href={`/admin/categories/new${domainId ? `?domain=${domainId}` : ""}`}>
              <Button>Create Your First Category</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <div className="flex items-center p-4 gap-4">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{ 
                    backgroundColor: category.domain.color 
                      ? `${category.domain.color}20` 
                      : undefined 
                  }}
                >
                  {category.icon || "📦"}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{category.name}</h3>
                    {!category.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {category.description || "No description"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: category.domain.color 
                          ? `${category.domain.color}20` 
                          : undefined 
                      }}
                    >
                      {category.domain.icon} {category.domain.name}
                    </span>
                    <span>•</span>
                    <span>{category._count.challenges} challenge{category._count.challenges !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Actions */}
                <CategoryActions category={category} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
