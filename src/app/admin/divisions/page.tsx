import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DivisionActions } from "./division-actions";

export default async function DivisionsPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const divisions = await db.division.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { rankRequirements: true },
      },
    },
  });

  const formatAgeRange = (ageMin: number | null, ageMax: number | null) => {
    if (ageMin === null && ageMax === null) return "All ages";
    if (ageMin !== null && ageMax === null) return `${ageMin}+`;
    if (ageMin === null && ageMax !== null) return `Under ${ageMax + 1}`;
    return `${ageMin}-${ageMax}`;
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return "Any";
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Divisions</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage age and gender divisions for competition
          </p>
        </div>
        <Link href="/admin/divisions/new">
          <Button size="lg" className="w-full sm:w-auto">
            + Add Division
          </Button>
        </Link>
      </div>

      {divisions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No divisions have been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Divisions define age and gender categories like "Youth Male 8-10" or "Adult Female".
            </p>
            <Link href="/admin/divisions/new">
              <Button>Create Your First Division</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {divisions.map((division) => (
            <Card key={division.id} className="overflow-hidden">
              <div className="flex items-center p-4 gap-4">
                {/* Gender icon */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 bg-muted">
                  {division.gender === "male" && "♂️"}
                  {division.gender === "female" && "♀️"}
                  {!division.gender && "👤"}
                </div>

                {/* Name & Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{division.name}</h3>
                    {!division.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      <strong>Gender:</strong> {formatGender(division.gender)}
                    </span>
                    <span>
                      <strong>Age:</strong> {formatAgeRange(division.ageMin, division.ageMax)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {division._count.rankRequirements} rank requirement{division._count.rankRequirements === 1 ? "" : "s"}
                  </p>
                </div>

                {/* Actions */}
                <DivisionActions division={division} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {divisions.length > 0 && divisions.length < 8 && (
        <Card className="bg-muted/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: A typical setup includes divisions for different age groups and genders, 
              e.g., <strong>Youth Male 8-10</strong>, <strong>Teen Female 14-15</strong>, <strong>Adult Male 18+</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
