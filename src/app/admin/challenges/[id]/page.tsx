import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ChallengeForm } from "@/components/admin/challenge-form";

interface EditChallengePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChallengePage({ params }: EditChallengePageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;

  // Fetch challenge and form data in parallel
  const [challenge, domains, categories, disciplines, equipment, divisions, gyms] = await Promise.all([
    db.challenge.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, domainId: true } },
          },
        },
        disciplines: {
          include: {
            discipline: { select: { id: true, name: true, icon: true, color: true } },
          },
        },
        equipment: {
          include: {
            equipment: { select: { id: true, name: true, icon: true } },
          },
        },
        grades: {
          select: { divisionId: true, rank: true, targetValue: true, targetWeight: true, description: true, bonusXP: true },
        },
        allowedDivisions: {
          include: {
            division: { select: { id: true, name: true, gender: true, ageMin: true, ageMax: true } },
          },
        },
      },
    }),
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

  if (!challenge) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Challenge</h1>
        <p className="text-muted-foreground">Update {challenge.name}</p>
      </div>

      <ChallengeForm 
        challenge={challenge}
        domains={domains} 
        categories={categories} 
        disciplines={disciplines}
        equipment={equipment}
        divisions={divisions}
        gyms={gyms}
        mode="edit" 
      />
    </div>
  );
}
