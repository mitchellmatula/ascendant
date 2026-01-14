import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CategoryForm } from "@/components/admin/category-form";

interface NewCategoryPageProps {
  searchParams: Promise<{ domain?: string }>;
}

export default async function NewCategoryPage({ searchParams }: NewCategoryPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { domain: defaultDomainId } = await searchParams;

  // Get all domains for the selector
  const domains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true, color: true },
  });

  if (domains.length === 0) {
    redirect("/admin/domains?error=no-domains");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Category</h1>
        <p className="text-muted-foreground">Add a new category to organize challenges</p>
      </div>

      <CategoryForm 
        domains={domains} 
        defaultDomainId={defaultDomainId} 
        mode="create" 
      />
    </div>
  );
}
