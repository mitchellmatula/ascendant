import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DivisionForm } from "@/components/admin/division-form";

interface EditDivisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDivisionPage({ params }: EditDivisionPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  const division = await db.division.findUnique({
    where: { id },
  });

  if (!division) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Division</h1>
        <p className="text-muted-foreground">Update {division.name}</p>
      </div>

      <DivisionForm division={division} mode="edit" />
    </div>
  );
}
