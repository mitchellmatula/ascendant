import { db } from "@/lib/db";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pencil, Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRoleSelect } from "./user-role-select";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isSystemAdmin(currentUser.role)) {
    redirect("/admin");
  }

  const users = await db.user.findMany({
    include: {
      athlete: true,
      managedAthletes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {users.length} user{users.length !== 1 ? "s" : ""} registered
        </p>
      </div>

      {/* Desktop table view - wrapped in Card */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Athletes</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={`border-b last:border-0 ${user.suspendedAt ? "bg-destructive/5" : ""}`}>
                    <td className="py-4">
                      <div>
                        <p className="font-medium">
                          {user.athlete?.displayName || user.email || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-4">
                      {user.suspendedAt ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="w-3 h-3" />
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="py-4">
                      <UserRoleSelect
                        userId={user.id}
                        currentRole={user.role}
                        isCurrentUser={user.id === currentUser.id}
                      />
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {user.athlete ? (
                        <span>Self</span>
                      ) : user.managedAthletes.length > 0 ? (
                        <span>{user.managedAthletes.length} managed</span>
                      ) : (
                        <span className="text-yellow-500">No profile</span>
                      )}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/users/${user.id}`}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No users found.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mobile card view - full width, no wrapper card */}
      <div className="lg:hidden space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className={`p-4 rounded-lg border bg-card ${user.suspendedAt ? "border-destructive bg-destructive/5" : "border-border"}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {user.athlete?.displayName || user.email || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {user.email}
                </p>
              </div>
              {user.suspendedAt ? (
                <Badge variant="destructive" className="gap-1 shrink-0">
                  <Ban className="w-3 h-3" />
                  Suspended
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                  Active
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs mb-1">Role</p>
                <UserRoleSelect
                  userId={user.id}
                  currentRole={user.role}
                  isCurrentUser={user.id === currentUser.id}
                />
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs mb-1">Athletes</p>
                <p className="text-sm">
                  {user.athlete ? (
                    "Self"
                  ) : user.managedAthletes.length > 0 ? (
                    `${user.managedAthletes.length} managed`
                  ) : (
                    <span className="text-yellow-500">None</span>
                  )}
                </p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/users/${user.id}`}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Link>
              </Button>
            </p>
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No users found.
          </p>
        )}
      </div>
    </div>
  );
}
