import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DivisionForm } from "@/components/admin/division-form";

export default async function NewDivisionPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Division</h1>
        <p className="text-muted-foreground">Add a new age/gender division</p>
      </div>

      <DivisionForm mode="create" />
    </div>
  );
}
