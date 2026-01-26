import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Link2, Clock, Shield, UserCheck, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { CreateInviteForm } from "./create-invite-form";
import { InviteActions } from "./invite-actions";

interface InvitesPageProps {
  params: Promise<{ slug: string }>;
}

const roleIcons = {
  MEMBER: Users,
  COACH: UserCheck,
  MANAGER: Shield,
};

export default async function InvitesPage({ params }: InvitesPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const gym = await db.gym.findUnique({
    where: { slug, isActive: true },
  });

  if (!gym) notFound();

  // Check if user is owner or manager
  const isOwner = gym.ownerId === user.id;
  const membership = await db.gymMember.findUnique({
    where: { gymId_userId: { gymId: gym.id, userId: user.id } },
  });
  const isManager = membership?.role === "MANAGER";
  const canManage = isOwner || isManager;

  if (!canManage) {
    redirect(`/gym/${slug}`);
  }

  const invites = await db.gymInvite.findMany({
    where: { gymId: gym.id },
    include: {
      createdBy: {
        select: {
          id: true,
          athlete: { select: { displayName: true } },
        },
      },
      usages: {
        include: {
          user: {
            select: {
              athlete: { select: { displayName: true } },
            },
          },
        },
        orderBy: { usedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const activeInvites = invites.filter(
    (i) => i.isActive && i.expiresAt > now && (i.maxUses === null || i.useCount < i.maxUses)
  );
  const inactiveInvites = invites.filter(
    (i) => !i.isActive || i.expiresAt <= now || (i.maxUses !== null && i.useCount >= i.maxUses)
  );

  return (
    <div className="container max-w-2xl py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/gym/${slug}/members`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Invite Links</h1>
          <p className="text-sm text-muted-foreground">{gym.name}</p>
        </div>
      </div>

      {/* Create invite form */}
      <CreateInviteForm gymSlug={slug} isOwner={isOwner} />

      {/* Active Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Active Invites ({activeInvites.length})
          </CardTitle>
          <CardDescription>
            Share these links to invite people to your gym.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active invites. Create one above to get started.
            </p>
          ) : (
            activeInvites.map((invite) => {
              const RoleIcon = roleIcons[invite.role as keyof typeof roleIcons] || Users;
              const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${invite.token}`;

              return (
                <div
                  key={invite.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
                        </Badge>
                        {invite.useCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {invite.useCount} used
                            {invite.maxUses && ` / ${invite.maxUses}`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <InviteActions
                      inviteId={invite.id}
                      inviteUrl={inviteUrl}
                      gymSlug={slug}
                      isActive={invite.isActive}
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-muted rounded-md p-2">
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <code className="text-xs truncate flex-1">{inviteUrl}</code>
                  </div>

                  {invite.usages.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Recent: </span>
                      {invite.usages.map((u, i) => (
                        <span key={u.id}>
                          {u.user.athlete?.displayName || "Unknown"}
                          {i < invite.usages.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Inactive Invites */}
      {inactiveInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Expired / Revoked ({inactiveInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inactiveInvites.map((invite) => {
              const RoleIcon = roleIcons[invite.role as keyof typeof roleIcons] || Users;
              const isExpired = invite.expiresAt <= now;
              const isMaxedOut = invite.maxUses !== null && invite.useCount >= invite.maxUses;

              return (
                <div
                  key={invite.id}
                  className="border rounded-lg p-3 opacity-60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {invite.useCount} used
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!invite.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Revoked
                        </Badge>
                      )}
                      {invite.isActive && isExpired && (
                        <Badge variant="secondary" className="text-xs">
                          Expired
                        </Badge>
                      )}
                      {invite.isActive && !isExpired && isMaxedOut && (
                        <Badge variant="secondary" className="text-xs">
                          Maxed Out
                        </Badge>
                      )}
                      <InviteActions
                        inviteId={invite.id}
                        inviteUrl=""
                        gymSlug={slug}
                        isActive={false}
                        showReactivate={!invite.isActive}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
