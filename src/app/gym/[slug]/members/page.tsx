import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Crown, Shield, UserCheck, Eye, EyeOff, Link2 } from "lucide-react";
import Link from "next/link";
import { MemberActions } from "./member-actions";

interface MembersPageProps {
  params: Promise<{ slug: string }>;
}

const roleIcons = {
  OWNER: Crown,
  MANAGER: Shield,
  COACH: UserCheck,
  MEMBER: Users,
};

const roleOrder = ["OWNER", "MANAGER", "COACH", "MEMBER"] as const;

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const gym = await db.gym.findUnique({
    where: { slug, isActive: true },
    include: {
      owner: {
        select: { id: true },
      },
    },
  });

  if (!gym) notFound();

  // Check if user is owner or manager
  const userMembership = await db.gymMember.findUnique({
    where: {
      gymId_userId: {
        gymId: gym.id,
        userId: user.id,
      },
    },
  });

  const isOwner = gym.ownerId === user.id;
  const isManager = userMembership?.role === "MANAGER";
  const canManage = isOwner || isManager;

  if (!canManage) {
    redirect(`/gym/${slug}`);
  }

  // Get ALL members (not just public ones)
  const members = await db.gymMember.findMany({
    where: { gymId: gym.id, isActive: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          athlete: { 
            select: { 
              displayName: true, 
              avatarUrl: true,
              isPublicProfile: true,
            } 
          },
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  // Group members by role
  const membersByRole = roleOrder.reduce((acc, role) => {
    acc[role] = members.filter(m => {
      if (role === "OWNER") {
        return m.userId === gym.ownerId;
      }
      return m.role === role && m.userId !== gym.ownerId;
    });
    return acc;
  }, {} as Record<string, typeof members>);

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/gym/${slug}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Manage Members</h1>
            <p className="text-sm text-muted-foreground">{gym.name}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/gym/${slug}/invites`}>
            <Link2 className="w-4 h-4 mr-2" />
            Invite Links
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Members
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {roleOrder.map((role) => {
            const roleMembers = membersByRole[role];
            if (roleMembers.length === 0) return null;

            const RoleIcon = roleIcons[role];

            return (
              <div key={role}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <RoleIcon className="w-4 h-4" />
                  <span className="uppercase tracking-wide font-medium">
                    {role === "OWNER" ? "Owner" : `${role.toLowerCase()}s`}
                  </span>
                  <span className="text-muted-foreground/60">({roleMembers.length})</span>
                </div>
                <div className="space-y-2">
                  {roleMembers.map((member) => {
                    const displayName = member.user.athlete?.displayName || member.user.email;
                    const isOwnerMember = member.userId === gym.ownerId;
                    
                    return (
                      <div 
                        key={member.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <Avatar className="w-10 h-10">
                          {member.user.athlete?.avatarUrl && (
                            <AvatarImage src={member.user.athlete.avatarUrl} />
                          )}
                          <AvatarFallback>
                            {displayName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {displayName}
                            </span>
                            {isOwnerMember && (
                              <Badge variant="default" className="text-xs shrink-0">
                                <Crown className="w-3 h-3 mr-1" />
                                Owner
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              {member.isPublicMember && member.user.athlete?.isPublicProfile ? (
                                <>
                                  <Eye className="w-3 h-3" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  Private
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Actions - only show if user can manage and member is not owner */}
                        {!isOwnerMember && (
                          <MemberActions
                            memberId={member.id}
                            memberName={displayName}
                            currentRole={member.role}
                            gymSlug={slug}
                            isOwner={isOwner}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No members yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Crown className="w-4 h-4 mt-0.5 text-amber-500" />
              <div>
                <span className="font-medium text-foreground">Owner</span> – Full control, cannot be changed
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-blue-500" />
              <div>
                <span className="font-medium text-foreground">Manager</span> – Edit gym settings, manage members
              </div>
            </div>
            <div className="flex items-start gap-2">
              <UserCheck className="w-4 h-4 mt-0.5 text-green-500" />
              <div>
                <span className="font-medium text-foreground">Coach</span> – Review member submissions
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Member</span> – View gym content
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
