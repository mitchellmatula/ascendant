import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { Building2, MapPin, Users, Search } from "lucide-react";

interface GymsPageProps {
  searchParams: Promise<{ q?: string; discipline?: string }>;
}

export default async function GymsPage({ searchParams }: GymsPageProps) {
  const { q, discipline } = await searchParams;

  // Get all disciplines for filtering
  const disciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Build where clause for search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    isActive: true,
  };

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { state: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }

  if (discipline) {
    whereClause.disciplines = {
      some: { discipline: { slug: discipline } },
    };
  }

  // Get gyms with member counts
  const gyms = await db.gym.findMany({
    where: whereClause,
    include: {
      disciplines: { include: { discipline: true } },
      _count: { select: { members: { where: { isActive: true } } } },
    },
    orderBy: [{ isVerified: "desc" }, { name: "asc" }],
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Find a Gym</h1>
        <p className="text-muted-foreground">
          Discover gyms in your area and join their community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <form className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search by name or location..."
              defaultValue={q || ""}
              className="pl-10"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            Search
          </button>
        </form>

        {/* Discipline Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gyms"
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              !discipline
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            All
          </Link>
          {disciplines.map((d) => (
            <Link
              key={d.id}
              href={`/gyms?discipline=${d.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                discipline === d.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {d.icon} {d.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
      {gyms.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No gyms found</p>
            <p className="text-muted-foreground text-sm">
              {q || discipline
                ? "Try adjusting your search or filters"
                : "Be the first to register your gym!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {gyms.map((gym) => (
            <Link key={gym.id} href={`/gym/${gym.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    {gym.logoUrl ? (
                      <Image
                        src={gym.logoUrl}
                        alt={gym.name}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover w-16 h-16 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{gym.name}</CardTitle>
                        {gym.isVerified && (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      {(gym.city || gym.state) && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[gym.city, gym.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <Users className="w-3.5 h-3.5" />
                        {gym._count.members} member{gym._count.members !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {gym.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {gym.description}
                    </p>
                  )}
                  {gym.disciplines.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {gym.disciplines.map((d) => (
                        <Badge
                          key={d.discipline.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {d.discipline.icon} {d.discipline.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* CTA for gym owners */}
      <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Own a gym?</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Register your gym to connect with athletes in your area
          </p>
          <Link
            href="/onboarding/gym"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Building2 className="w-4 h-4" />
            Register Your Gym
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
