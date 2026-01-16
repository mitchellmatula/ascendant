import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRankColor, getRankLabel } from "@/lib/levels";
import { BreakthroughActions } from "./breakthrough-actions";
import { Sparkles, ArrowRight } from "lucide-react";

export default async function BreakthroughsPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  // Get all breakthrough rules with domain info
  const rules = await db.breakthroughRule.findMany({
    include: {
      domain: true,
      division: true,
    },
    orderBy: [
      { domain: { sortOrder: "asc" } },
      { fromRank: "asc" },
    ],
  });

  // Get all domains for grouping
  const domains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Group rules by domain
  const rulesByDomain = domains.map((domain) => ({
    domain,
    rules: rules.filter((r) => r.domainId === domain.id && r.divisionId === null),
    divisionOverrides: rules.filter((r) => r.domainId === domain.id && r.divisionId !== null),
  }));

  // Standard rank transitions
  const rankTransitions = [
    { from: "F", to: "E" },
    { from: "E", to: "D" },
    { from: "D", to: "C" },
    { from: "C", to: "B" },
    { from: "B", to: "A" },
    { from: "A", to: "S" },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" />
            Breakthrough Rules
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Configure requirements for rank advancement
          </p>
        </div>
        <Link href="/admin/breakthroughs/new">
          <Button size="lg" className="w-full sm:w-auto">
            + Add Custom Rule
          </Button>
        </Link>
      </div>

      {/* Explanation Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>How Breakthroughs Work:</strong> When an athlete reaches sublevel 9 of their current rank 
            (e.g., F9), they must complete the breakthrough requirements to advance to the next rank letter. 
            This ensures athletes have proven mastery at higher tiers before progressing.
          </p>
        </CardContent>
      </Card>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No domains have been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Create domains first, then run the seed to set up default breakthrough rules.
            </p>
            <Link href="/admin/domains/new">
              <Button>Create Domains</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {rulesByDomain.map(({ domain, rules, divisionOverrides }) => (
            <Card key={domain.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{domain.icon || "🎯"}</span>
                  {domain.name}
                </CardTitle>
                <CardDescription>
                  {rules.length} rule{rules.length !== 1 ? "s" : ""} configured
                  {divisionOverrides.length > 0 && ` + ${divisionOverrides.length} division override${divisionOverrides.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No breakthrough rules configured for this domain.{" "}
                    <Link href="/admin/breakthroughs/new" className="text-primary hover:underline">
                      Add rules
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-3 py-1">
                      <div className="col-span-3">Transition</div>
                      <div className="col-span-3">Tier Required</div>
                      <div className="col-span-3">Challenges</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {rankTransitions.map((transition) => {
                      const rule = rules.find(
                        (r) => r.fromRank === transition.from && r.toRank === transition.to
                      );
                      
                      return (
                        <div
                          key={`${transition.from}-${transition.to}`}
                          className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg ${
                            rule ? "bg-muted/50" : "bg-muted/20 opacity-50"
                          }`}
                        >
                          {/* Transition */}
                          <div className="col-span-3 flex items-center gap-1">
                            <span
                              className="font-bold text-lg"
                              style={{ color: getRankColor(transition.from) }}
                            >
                              {transition.from}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span
                              className="font-bold text-lg"
                              style={{ color: getRankColor(transition.to) }}
                            >
                              {transition.to}
                            </span>
                          </div>
                          
                          {/* Tier Required */}
                          <div className="col-span-3">
                            {rule ? (
                              <span
                                className="font-semibold"
                                style={{ color: getRankColor(rule.tierRequired) }}
                              >
                                {rule.tierRequired}-tier or higher
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          
                          {/* Challenge Count */}
                          <div className="col-span-3">
                            {rule ? (
                              <span className="font-medium">
                                {rule.challengeCount} challenge{rule.challengeCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          
                          {/* Status */}
                          <div className="col-span-2">
                            {rule ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                rule.isActive 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}>
                                {rule.isActive ? "Active" : "Inactive"}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not set</span>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="col-span-1 flex justify-end">
                            {rule && <BreakthroughActions rule={rule} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Division Overrides */}
                {divisionOverrides.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Division-Specific Overrides
                    </h4>
                    <div className="space-y-1">
                      {divisionOverrides.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{rule.division?.name}</span>
                            <span className="text-muted-foreground">
                              {rule.fromRank} → {rule.toRank}
                            </span>
                            <span style={{ color: getRankColor(rule.tierRequired) }}>
                              {rule.tierRequired}-tier
                            </span>
                            <span>× {rule.challengeCount}</span>
                          </div>
                          <BreakthroughActions rule={rule} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Text */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <h4 className="font-medium mb-2">Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Tier Required</strong>: The minimum tier an athlete must achieve on challenges (e.g., E-tier means E, D, C, B, A, or S all count)</li>
            <li>• <strong>Challenge Count</strong>: How many unique challenges at the required tier they need</li>
            <li>• <strong>Division Overrides</strong>: You can set different requirements for specific age/gender divisions</li>
            <li>• Run <code className="bg-muted px-1 rounded">npx prisma db seed</code> to reset to default rules</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
