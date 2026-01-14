import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DisciplineForm } from "@/components/admin/discipline-form";

interface EditDisciplinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDisciplinePage({ params }: EditDisciplinePageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  const discipline = await db.discipline.findUnique({
    where: { id },
  });

  if (!discipline) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Discipline</h1>
        <p className="text-muted-foreground">Update {discipline.name}</p>
      </div>

      <DisciplineForm discipline={discipline} mode="edit" />
    </div>
  );
}
