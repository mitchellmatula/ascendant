import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ChallengeForm } from "@/components/admin/challenge-form";

export default async function NewChallengePage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  // Fetch all domains, categories, disciplines, equipment, divisions, and gyms for the form
  const [domains, categories, disciplines, equipment, divisions, gyms] = await Promise.all([
    db.domain.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, domainId: true },
    }),
    db.discipline.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    db.equipment.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    db.division.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, gender: true, ageMin: true, ageMax: true },
    }),
    db.gym.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Redirect if no domains or categories exist
  if (domains.length === 0) {
    redirect("/admin/domains?error=no-domains");
  }
  if (categories.length === 0) {
    redirect("/admin/categories?error=no-categories");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Challenge</h1>
        <p className="text-muted-foreground">Add a new challenge for athletes to complete</p>
      </div>

      <ChallengeForm 
        domains={domains} 
        categories={categories} 
        disciplines={disciplines}
        equipment={equipment}
        divisions={divisions}
        gyms={gyms}
        mode="create" 
      />
    </div>
  );
}
