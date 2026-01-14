import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CategoryForm } from "@/components/admin/category-form";

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  
  const category = await db.category.findUnique({
    where: { id },
  });

  if (!category) {
    notFound();
  }

  // Get all domains for the selector
  const domains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true, color: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Category</h1>
        <p className="text-muted-foreground">Update {category.name}</p>
      </div>

      <CategoryForm 
        category={category} 
        domains={domains} 
        mode="edit" 
      />
    </div>
  );
}
