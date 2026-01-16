import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BreakthroughForm } from "./breakthrough-form";

export default async function NewBreakthroughPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const domains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const divisions = await db.division.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Add Breakthrough Rule</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Create a new breakthrough requirement for rank advancement
        </p>
      </div>

      <BreakthroughForm domains={domains} divisions={divisions} />
    </div>
  );
}
