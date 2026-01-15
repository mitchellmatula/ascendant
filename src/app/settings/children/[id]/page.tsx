import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "../../profile-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id: athleteId } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  // Verify this is a managed child
  const isManagedChild = user.managedAthletes.some((a) => a.id === athleteId);
  if (!isManagedChild) {
    notFound();
  }

  // Fetch full athlete data
  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    include: {
      disciplines: {
        include: {
          discipline: true,
        },
      },
    },
  });

  if (!athlete) {
    notFound();
  }

  // Get all disciplines
  const disciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/children">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Children
          </Button>
        </Link>
      </div>

      <ProfileForm 
        athlete={athlete} 
        disciplines={disciplines}
        isOwnProfile={false}
      />
    </div>
  );
}
