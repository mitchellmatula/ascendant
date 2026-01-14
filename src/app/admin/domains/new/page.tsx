import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DomainForm } from "@/components/admin/domain-form";

export default async function NewDomainPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Domain</h1>
        <p className="text-muted-foreground">Add a new training domain</p>
      </div>

      <DomainForm mode="create" />
    </div>
  );
}
