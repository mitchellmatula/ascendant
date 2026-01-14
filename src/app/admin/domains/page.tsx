import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DomainActions } from "./domain-actions";

export default async function DomainsPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const domains = await db.domain.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { categories: true },
      },
    },
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Domains</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage the core training domains
          </p>
        </div>
        <Link href="/admin/domains/new">
          <Button size="lg" className="w-full sm:w-auto">
            + Add Domain
          </Button>
        </Link>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No domains have been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Domains are the core training categories like Strength, Skill, Endurance, and Speed.
            </p>
            <Link href="/admin/domains/new">
              <Button>Create Your First Domain</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <Card key={domain.id} className="overflow-hidden">
              <div className="flex items-center p-4 gap-4">
                {/* Icon & Color indicator */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: domain.color ? `${domain.color}20` : undefined }}
                >
                  {domain.icon || "🎯"}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{domain.name}</h3>
                    {!domain.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {domain.description || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {domain._count.categories} categor{domain._count.categories === 1 ? "y" : "ies"}
                  </p>
                </div>

                {/* Color swatch */}
                <div
                  className="w-4 h-12 rounded shrink-0 hidden sm:block"
                  style={{ backgroundColor: domain.color || "#3b82f6" }}
                />

                {/* Actions */}
                <DomainActions domain={domain} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {domains.length > 0 && domains.length < 4 && (
        <Card className="bg-muted/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: The recommended setup is 4 domains: <strong>Strength</strong>, <strong>Skill</strong>, <strong>Endurance</strong>, and <strong>Speed</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
