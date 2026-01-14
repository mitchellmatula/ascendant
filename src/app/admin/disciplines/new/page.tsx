import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DisciplineForm } from "@/components/admin/discipline-form";

export default async function NewDisciplinePage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Discipline</h1>
        <p className="text-muted-foreground">Add a new sport or training discipline</p>
      </div>

      <DisciplineForm mode="create" />
    </div>
  );
}
