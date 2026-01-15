import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddChildForm } from "./add-child-form";

export default async function AddChildPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch disciplines for the form
  const disciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Add Child</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Create a new athlete profile for your child
        </p>
      </div>

      <AddChildForm disciplines={disciplines} />
    </div>
  );
}
