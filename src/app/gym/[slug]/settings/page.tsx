import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { GymSettingsForm } from "./gym-settings-form";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GymSettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Include inactive gyms so owner can reactivate
  const gym = await db.gym.findUnique({
    where: { slug },
    include: {
      classes: {
        where: { isActive: true },
        select: { id: true, name: true },
      },
    },
  });

  if (!gym) notFound();

  // Only owner can access settings
  if (gym.ownerId !== user.id) {
    redirect(`/gym/${slug}`);
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/gym/${slug}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Gym Settings</h1>
          <p className="text-sm text-muted-foreground">{gym.name}</p>
        </div>
      </div>

      <GymSettingsForm 
        gym={{
          id: gym.id,
          slug: gym.slug,
          name: gym.name,
          isActive: gym.isActive,
        }}
        classes={gym.classes}
      />
    </div>
  );
}
