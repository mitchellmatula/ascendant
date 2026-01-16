"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "../../../../prisma/generated/prisma/client";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "ATHLETE", label: "Athlete", description: "Standard user" },
  { value: "PARENT", label: "Parent", description: "Manages child athletes" },
  { value: "COACH", label: "Coach", description: "Can review submissions" },
  { value: "GYM_ADMIN", label: "Gym Admin", description: "Gym management + review" },
  { value: "SYSTEM_ADMIN", label: "System Admin", description: "Full access" },
];

interface UserRoleSelectProps {
  userId: string;
  currentRole: Role;
  isCurrentUser: boolean;
}

export function UserRoleSelect({ userId, currentRole, isCurrentUser }: UserRoleSelectProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<Role>(currentRole);

  const handleRoleChange = async (newRole: Role) => {
    if (newRole === role) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setRole(newRole);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select
      value={role}
      onValueChange={(value) => handleRoleChange(value as Role)}
      disabled={isLoading || isCurrentUser}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            <div>
              <span>{r.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
