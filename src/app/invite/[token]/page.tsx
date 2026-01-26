import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, CheckCircle2, Clock, MapPin, Shield, UserCheck, Users } from "lucide-react";
import { InviteRedeemButton } from "./invite-redeem-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

const roleDescriptions = {
  MEMBER: "You'll be able to browse and track your progress at this gym.",
  COACH: "You'll be able to grade athlete submissions and manage classes.",
  MANAGER: "You'll be able to manage gym settings, equipment, and members.",
};

const roleIcons = {
  MEMBER: Users,
  COACH: UserCheck,
  MANAGER: Shield,
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const user = await getCurrentUser();

  const invite = await db.gymInvite.findUnique({
    where: { token },
    include: {
      gym: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          city: true,
          state: true,
          description: true,
        },
      },
    },
  });

  if (!invite) notFound();

  const now = new Date();
  const isExpired = invite.expiresAt < now;
  const isMaxedOut = invite.maxUses !== null && invite.useCount >= invite.maxUses;
  const isValid = invite.isActive && !isExpired && !isMaxedOut;

  // Check if user already redeemed or is a member
  let existingMembership = null;
  let alreadyUsed = false;

  if (user) {
    existingMembership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: invite.gymId,
          userId: user.id,
        },
      },
    });

    const usage = await db.gymInviteUsage.findUnique({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: user.id,
        },
      },
    });
    alreadyUsed = !!usage;
  }

  const RoleIcon = roleIcons[invite.role as keyof typeof roleIcons] || Users;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {invite.gym.logoUrl ? (
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarImage src={invite.gym.logoUrl} alt={invite.gym.name} />
              <AvatarFallback className="text-2xl">
                {invite.gym.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {invite.gym.name.charAt(0)}
              </span>
            </div>
          )}

          <CardTitle className="text-2xl">Join {invite.gym.name}</CardTitle>
          
          {invite.gym.city && invite.gym.state && (
            <CardDescription className="flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />
              {invite.gym.city}, {invite.gym.state}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role badge */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <RoleIcon className="h-4 w-4 mr-1" />
              {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()} Access
            </Badge>
          </div>

          {/* Role description */}
          <p className="text-center text-muted-foreground text-sm">
            {roleDescriptions[invite.role as keyof typeof roleDescriptions]}
          </p>

          {/* Status messages */}
          {!isValid && (
            <div className="rounded-lg bg-destructive/10 p-4 text-center">
              <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
              {!invite.isActive && (
                <p className="text-sm text-destructive">This invite has been revoked.</p>
              )}
              {isExpired && invite.isActive && (
                <p className="text-sm text-destructive">This invite has expired.</p>
              )}
              {isMaxedOut && invite.isActive && !isExpired && (
                <p className="text-sm text-destructive">This invite has reached its usage limit.</p>
              )}
            </div>
          )}

          {isValid && existingMembership?.isActive && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-2" />
              <p className="text-sm">You&apos;re already a member of this gym!</p>
              <Button variant="link" asChild className="mt-2">
                <Link href={`/gym/${invite.gym.slug}`}>View Gym</Link>
              </Button>
            </div>
          )}

          {isValid && alreadyUsed && !existingMembership?.isActive && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                You&apos;ve already used this invite.
              </p>
            </div>
          )}

          {/* Expiration info */}
          {isValid && !existingMembership?.isActive && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Expires {new Date(invite.expiresAt).toLocaleDateString()}
            </div>
          )}

          {/* Action buttons */}
          {!user ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Sign in or create an account to join this gym.
              </p>
              <div className="flex gap-2">
                <SignInButton mode="modal" forceRedirectUrl={`/invite/${token}`}>
                  <Button className="flex-1">Sign In</Button>
                </SignInButton>
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/sign-up?redirect=/invite/${token}`}>Create Account</Link>
                </Button>
              </div>
            </div>
          ) : isValid && !existingMembership?.isActive && !alreadyUsed ? (
            <InviteRedeemButton token={token} gymSlug={invite.gym.slug} />
          ) : (
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
