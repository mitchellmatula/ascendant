"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, UserPlus, ExternalLink, Ban, CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Role = "ATHLETE" | "PARENT" | "COACH" | "GYM_ADMIN" | "SYSTEM_ADMIN";
type AccountType = "ATHLETE" | "PARENT";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "ATHLETE", label: "Athlete", description: "Standard user" },
  { value: "PARENT", label: "Parent", description: "Manages child athletes" },
  { value: "COACH", label: "Coach", description: "Can review submissions" },
  { value: "GYM_ADMIN", label: "Gym Admin", description: "Gym management + review" },
  { value: "SYSTEM_ADMIN", label: "System Admin", description: "Full access" },
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "ATHLETE", label: "Athlete" },
  { value: "PARENT", label: "Parent" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface AthleteProfile {
  id?: string;
  displayName: string;
  dateOfBirth: Date | undefined;
  gender: string;
  avatarUrl: string | null;
  disciplineIds: string[];
  avatarFile?: File | null;
}

interface GymMembership {
  id: string;
  role: string;
  gym: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UserData {
  id: string;
  email: string;
  clerkId: string;
  role: Role;
  accountType: AccountType;
  createdAt: string;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspendReason: string | null;
  canReview: boolean;
  reviewBannedAt: string | null;
  reviewBannedBy: string | null;
  reviewBanReason: string | null;
  reviewCount: number;
  reviewAccuracy: number | null;
  athlete: {
    id: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
    avatarUrl: string | null;
    isMinor: boolean;
    disciplines: {
      discipline: Discipline;
    }[];
  } | null;
  managedAthletes: {
    id: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
    avatarUrl: string | null;
    isMinor: boolean;
    disciplines: {
      discipline: Discipline;
    }[];
  }[];
  gymMemberships: GymMembership[];
  ownedGyms: { id: string; name: string; slug: string }[];
}

interface UserFormProps {
  user: UserData;
  disciplines: Discipline[];
  isCurrentUser: boolean;
}

export function UserForm({ user, disciplines, isCurrentUser }: UserFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  
  // Review ban state
  const [isReviewBanning, setIsReviewBanning] = useState(false);
  const [reviewBanReason, setReviewBanReason] = useState("");
  const [showReviewBanDialog, setShowReviewBanDialog] = useState(false);
  const [canReviewState, setCanReviewState] = useState(user.canReview);

  // User fields
  const [role, setRole] = useState<Role>(user.role);
  const [accountType, setAccountType] = useState<AccountType>(user.accountType);

  // Athlete profile (for ATHLETE account type)
  const [athlete, setAthlete] = useState<AthleteProfile | null>(
    user.athlete
      ? {
          id: user.athlete.id,
          displayName: user.athlete.displayName,
          dateOfBirth: new Date(user.athlete.dateOfBirth),
          gender: user.athlete.gender,
          avatarUrl: user.athlete.avatarUrl,
          disciplineIds: user.athlete.disciplines.map((d) => d.discipline.id),
        }
      : null
  );

  // Managed athletes (for PARENT account type)
  const [managedAthletes, setManagedAthletes] = useState<AthleteProfile[]>(
    user.managedAthletes.map((a) => ({
      id: a.id,
      displayName: a.displayName,
      dateOfBirth: new Date(a.dateOfBirth),
      gender: a.gender,
      avatarUrl: a.avatarUrl,
      disciplineIds: a.disciplines.map((d) => d.discipline.id),
    }))
  );

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const res = await fetch(
        `/api/upload/avatar?filename=${encodeURIComponent(file.name)}`,
        { method: "POST", body: file }
      );
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Avatar upload failed:", e);
    }
    return null;
  };

  const toggleDiscipline = (disciplineId: string, profile: "athlete" | number) => {
    if (profile === "athlete" && athlete) {
      setAthlete({
        ...athlete,
        disciplineIds: athlete.disciplineIds.includes(disciplineId)
          ? athlete.disciplineIds.filter((id) => id !== disciplineId)
          : [...athlete.disciplineIds, disciplineId],
      });
    } else if (typeof profile === "number") {
      setManagedAthletes((prev) =>
        prev.map((a, i) =>
          i === profile
            ? {
                ...a,
                disciplineIds: a.disciplineIds.includes(disciplineId)
                  ? a.disciplineIds.filter((id) => id !== disciplineId)
                  : [...a.disciplineIds, disciplineId],
              }
            : a
        )
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Upload any new avatar files
      let athleteAvatarUrl = athlete?.avatarUrl;
      if (athlete?.avatarFile) {
        athleteAvatarUrl = await uploadAvatar(athlete.avatarFile);
      }

      const updatedManagedAthletes = await Promise.all(
        managedAthletes.map(async (a) => ({
          ...(a.id && { id: a.id }), // Only include id if it exists (for updates)
          displayName: a.displayName,
          dateOfBirth: a.dateOfBirth?.toISOString(),
          gender: a.gender,
          avatarUrl: a.avatarFile ? await uploadAvatar(a.avatarFile) : a.avatarUrl,
          disciplineIds: a.disciplineIds,
        }))
      );

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          accountType,
          athlete: athlete
            ? {
                ...(athlete.id && { id: athlete.id }), // Only include id if it exists (for updates)
                displayName: athlete.displayName,
                dateOfBirth: athlete.dateOfBirth?.toISOString(),
                gender: athlete.gender,
                avatarUrl: athleteAvatarUrl,
                disciplineIds: athlete.disciplineIds,
              }
            : undefined,
          managedAthletes: updatedManagedAthletes,
        }),
      });

      if (response.ok) {
        router.push("/admin/users");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update user");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/users");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
      setIsDeleting(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert("Please provide a reason for suspension");
      return;
    }

    setIsSuspending(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason.trim() }),
      });

      if (response.ok) {
        setShowSuspendDialog(false);
        setSuspendReason("");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to suspend user");
      }
    } catch (error) {
      console.error("Error suspending user:", error);
      alert("Failed to suspend user");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    setIsSuspending(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to unsuspend user");
      }
    } catch (error) {
      console.error("Error unsuspending user:", error);
      alert("Failed to unsuspend user");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReviewBan = async () => {
    if (!reviewBanReason.trim()) {
      alert("Please provide a reason for banning review privileges");
      return;
    }

    setIsReviewBanning(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/review-ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban", reason: reviewBanReason.trim() }),
      });

      if (response.ok) {
        setShowReviewBanDialog(false);
        setReviewBanReason("");
        setCanReviewState(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to ban review privileges");
      }
    } catch (error) {
      console.error("Error banning review:", error);
      alert("Failed to ban review privileges");
    } finally {
      setIsReviewBanning(false);
    }
  };

  const handleReviewUnban = async () => {
    setIsReviewBanning(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/review-ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });

      if (response.ok) {
        setCanReviewState(true);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to restore review privileges");
      }
    } catch (error) {
      console.error("Error restoring review:", error);
      alert("Failed to restore review privileges");
    } finally {
      setIsReviewBanning(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            Email: {user.email} • Joined{" "}
            {new Date(user.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as Role)}
                disabled={isCurrentUser}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCurrentUser && (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as AccountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((at) => (
                    <SelectItem key={at.value} value={at.value}>
                      {at.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clerk ID for debugging */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Clerk ID:</span>{" "}
              <code className="bg-muted px-1 rounded">{user.clerkId}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Status / Suspension */}
      <Card className={user.suspendedAt ? "border-destructive" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Account Status</CardTitle>
              {user.suspendedAt ? (
                <Badge variant="destructive" className="gap-1">
                  <Ban className="w-3 h-3" />
                  Suspended
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            {user.suspendedAt
              ? `Suspended on ${new Date(user.suspendedAt).toLocaleDateString()}`
              : "This account is in good standing"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.suspendedAt ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Suspension Reason:</p>
                    <p className="text-sm text-muted-foreground">{user.suspendReason || "No reason provided"}</p>
                  </div>
                </div>
              </div>
              
              {!isCurrentUser && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isSuspending}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Unsuspend Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unsuspend Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will restore the user's access to the platform. They will be able to log in and use all features again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnsuspend}>
                        Unsuspend
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!isCurrentUser && (
                <>
                  {showSuspendDialog ? (
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                      <Label htmlFor="suspendReason">Reason for suspension *</Label>
                      <Textarea
                        id="suspendReason"
                        placeholder="Explain why this account is being suspended..."
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleSuspend}
                          disabled={isSuspending || !suspendReason.trim()}
                        >
                          {isSuspending ? "Suspending..." : "Confirm Suspension"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowSuspendDialog(false);
                            setSuspendReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSuspendDialog(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend Account
                    </Button>
                  )}
                </>
              )}
              {isCurrentUser && (
                <p className="text-sm text-muted-foreground">
                  You cannot suspend your own account.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Permissions */}
      <Card className={!canReviewState ? "border-orange-500/50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Review Permissions</CardTitle>
              {canReviewState ? (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <Eye className="w-3 h-3" />
                  Can Review
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">
                  <EyeOff className="w-3 h-3" />
                  Review Banned
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Control whether this user can review other athletes' submissions in the social feed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canReviewState ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-300">Review privileges revoked</p>
                    <p className="text-sm text-muted-foreground">
                      {user.reviewBanReason || "No reason provided"}
                    </p>
                    {user.reviewBannedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Banned on {new Date(user.reviewBannedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isReviewBanning}>
                    <Eye className="w-4 h-4 mr-2" />
                    Restore Review Privileges
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore Review Privileges?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will allow {isCurrentUser ? "you" : "the user"} to review other athletes' submissions again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReviewUnban}>
                      Restore
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Total reviews given:</span> {user.reviewCount}
                </p>
                {user.reviewAccuracy !== null && (
                  <p>
                    <span className="font-medium">Review accuracy:</span> {(user.reviewAccuracy * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              
              {!isCurrentUser && (
                <>
                  {showReviewBanDialog ? (
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                      <Label htmlFor="reviewBanReason">Reason for revoking review privileges *</Label>
                      <Textarea
                        id="reviewBanReason"
                        placeholder="Explain why this user's review privileges are being revoked (e.g., trolling, inaccurate reviews)..."
                        value={reviewBanReason}
                        onChange={(e) => setReviewBanReason(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={handleReviewBan}
                          disabled={isReviewBanning || !reviewBanReason.trim()}
                        >
                          {isReviewBanning ? "Revoking..." : "Confirm Revocation"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowReviewBanDialog(false);
                            setReviewBanReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReviewBanDialog(true)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Revoke Review Privileges
                    </Button>
                  )}
                </>
              )}
              {isCurrentUser && (
                <p className="text-sm text-muted-foreground">
                  You cannot modify your own review permissions.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gym Memberships (Read-only) */}
      {(user.gymMemberships.length > 0 || user.ownedGyms.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Gym Affiliations</CardTitle>
            <CardDescription>Gyms this user is associated with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.ownedGyms.map((gym) => (
                <div
                  key={gym.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <span>{gym.name}</span>
                  <Badge variant="default">Owner</Badge>
                </div>
              ))}
              {user.gymMemberships
                .filter((m) => !user.ownedGyms.find((g) => g.id === m.gym.id))
                .map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <span>{membership.gym.name}</span>
                    <Badge variant="outline">{membership.role}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Athlete Profile (User's own profile - available for any account type) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personal Athlete Profile</CardTitle>
              <CardDescription>
                {athlete 
                  ? "This user competes as an athlete themselves" 
                  : "This user does not have their own athlete profile"}
              </CardDescription>
            </div>
            {athlete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/athletes/${athlete.id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Progress
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {athlete ? (
              <>
                <div className="flex justify-center">
                  <AvatarUpload
                    currentImageUrl={athlete.avatarUrl}
                    onImageSelect={(file) =>
                      setAthlete({ ...athlete, avatarFile: file })
                    }
                    size="lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={athlete.displayName}
                    onChange={(e) =>
                      setAthlete({ ...athlete, displayName: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <DatePicker
                      value={athlete.dateOfBirth}
                      onChange={(date) =>
                        setAthlete({ ...athlete, dateOfBirth: date })
                      }
                      placeholder="Select date"
                      toYear={new Date().getFullYear()}
                      fromYear={1940}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={athlete.gender}
                      onValueChange={(v) => setAthlete({ ...athlete, gender: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {disciplines.length > 0 && (
                  <div className="space-y-2">
                    <Label>Primary Disciplines</Label>
                    <div className="flex flex-wrap gap-2">
                      {disciplines.map((disc) => (
                        <Badge
                          key={disc.id}
                          variant={
                            athlete.disciplineIds.includes(disc.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-primary/80"
                          onClick={() => toggleDiscipline(disc.id, "athlete")}
                        >
                          {disc.icon} {disc.name}
                          {athlete.disciplineIds.includes(disc.id) && " ✓"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-muted-foreground text-sm">
                  This user has not created an athlete profile yet.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAthlete({
                      id: "",
                      displayName: "",
                      dateOfBirth: undefined,
                      gender: "",
                      avatarUrl: null,
                      disciplineIds: [],
                    })
                  }
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Athlete Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Managed Athletes (Child profiles this user manages) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Managed Athletes (Children)</CardTitle>
              <CardDescription>
                {managedAthletes.length} child athlete
                {managedAthletes.length !== 1 ? "s" : ""} managed by this user
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setManagedAthletes((prev) => [
                  ...prev,
                  {
                    id: "",
                    displayName: "",
                    dateOfBirth: undefined,
                    gender: "",
                    avatarUrl: null,
                    disciplineIds: [],
                  },
                ])
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {managedAthletes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No managed athletes. Click "Add Child" to add one.
            </p>
          ) : (
            managedAthletes.map((child, index) => (
              <div
                key={child.id || `new-${index}`}
                className="p-4 border rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {child.displayName || `Child ${index + 1}`}
                    </h4>
                    {child.id && (
                      <Badge variant="secondary" className="text-xs">
                        Minor
                      </Badge>
                    )}
                    {!child.id && (
                      <Badge variant="outline" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {child.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/athletes/${child.id}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Child?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {child.id
                              ? "This will remove this child from the parent's management. The athlete profile will remain but will no longer be managed by this user."
                              : "This will remove this unsaved child entry."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              setManagedAthletes((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex justify-center">
                  <AvatarUpload
                    currentImageUrl={child.avatarUrl}
                    onImageSelect={(file) =>
                      setManagedAthletes((prev) =>
                        prev.map((a, i) =>
                          i === index ? { ...a, avatarFile: file } : a
                        )
                      )
                    }
                    size="md"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={child.displayName}
                    onChange={(e) =>
                      setManagedAthletes((prev) =>
                        prev.map((a, i) =>
                          i === index ? { ...a, displayName: e.target.value } : a
                        )
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <DatePicker
                      value={child.dateOfBirth}
                      onChange={(date) =>
                        setManagedAthletes((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, dateOfBirth: date } : a
                          )
                        )
                      }
                      placeholder="Select date"
                      toYear={new Date().getFullYear()}
                      fromYear={2000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={child.gender}
                      onValueChange={(v) =>
                        setManagedAthletes((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, gender: v } : a
                          )
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {disciplines.length > 0 && (
                  <div className="space-y-2">
                    <Label>Primary Disciplines</Label>
                    <div className="flex flex-wrap gap-2">
                      {disciplines.map((disc) => (
                        <Badge
                          key={disc.id}
                          variant={
                            child.disciplineIds.includes(disc.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-primary/80"
                          onClick={() => toggleDiscipline(disc.id, index)}
                        >
                          {disc.icon} {disc.name}
                          {child.disciplineIds.includes(disc.id) && " ✓"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/users")}
          >
            Cancel
          </Button>
        </div>

        {!isCurrentUser && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the user account and all associated
                  athlete profiles. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
}
