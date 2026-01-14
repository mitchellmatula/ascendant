import { db } from "@/lib/db";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { UserForm } from "@/components/admin/user-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isSystemAdmin(currentUser.role)) {
    redirect("/admin");
  }

  const { id } = await params;

  const [user, disciplines] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        athlete: {
          include: {
            disciplines: {
              include: {
                discipline: {
                  select: { id: true, name: true, icon: true },
                },
              },
            },
          },
        },
        managedAthletes: {
          include: {
            disciplines: {
              include: {
                discipline: {
                  select: { id: true, name: true, icon: true },
                },
              },
            },
          },
        },
        gymMemberships: {
          include: {
            gym: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        ownedGyms: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    db.discipline.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  if (!user) {
    notFound();
  }

  // Transform dates to strings for the client component
  const userData = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    reviewBannedAt: user.reviewBannedAt?.toISOString() ?? null,
    athlete: user.athlete
      ? {
          ...user.athlete,
          dateOfBirth: user.athlete.dateOfBirth.toISOString(),
          createdAt: user.athlete.createdAt.toISOString(),
          updatedAt: user.athlete.updatedAt.toISOString(),
        }
      : null,
    managedAthletes: user.managedAthletes.map((a) => ({
      ...a,
      dateOfBirth: a.dateOfBirth.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Users
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">Edit User</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {user.email}
        </p>
      </div>

      <UserForm
        user={userData}
        disciplines={disciplines}
        isCurrentUser={user.id === currentUser.id}
      />
    </div>
  );
}
