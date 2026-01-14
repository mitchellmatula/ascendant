import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DomainForm } from "@/components/admin/domain-form";

interface EditDomainPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDomainPage({ params }: EditDomainPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  const domain = await db.domain.findUnique({
    where: { id },
  });

  if (!domain) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Domain</h1>
        <p className="text-muted-foreground">Update {domain.name}</p>
      </div>

      <DomainForm domain={domain} mode="edit" />
    </div>
  );
}
