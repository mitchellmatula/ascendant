"use client";

import { UserButton } from "@clerk/nextjs";
import { Settings, Users } from "lucide-react";

export function UserMenu() {
  return (
    <UserButton afterSignOutUrl="/">
      <UserButton.MenuItems>
        <UserButton.Link
          label="Settings"
          labelIcon={<Settings className="h-4 w-4" />}
          href="/settings"
        />
        <UserButton.Link
          label="Manage Children"
          labelIcon={<Users className="h-4 w-4" />}
          href="/settings/children"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
