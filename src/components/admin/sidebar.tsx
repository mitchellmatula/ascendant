"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "../../../prisma/generated/prisma/client";

interface AdminSidebarProps {
  userRole: Role;
}

const navItems = [
  {
    title: "Overview",
    href: "/admin",
    icon: "📊",
  },
  {
    title: "Domains",
    href: "/admin/domains",
    icon: "🎯",
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: "📁",
  },
  {
    title: "Challenges",
    href: "/admin/challenges",
    icon: "🏆",
  },
  {
    title: "Divisions",
    href: "/admin/divisions",
    icon: "👥",
  },
  {
    title: "XP Thresholds",
    href: "/admin/xp-thresholds",
    icon: "⚡",
  },
  {
    title: "Rank Requirements",
    href: "/admin/rank-requirements",
    icon: "📋",
  },
  {
    title: "Submissions",
    href: "/admin/submissions",
    icon: "📤",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: "👤",
    systemAdminOnly: true,
  },
];

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => {
    if (item.systemAdminOnly && userRole !== "SYSTEM_ADMIN") {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-64 border-r border-border bg-card min-h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Admin Panel</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {userRole === "SYSTEM_ADMIN" ? "System Admin" : "Gym Admin"}
        </p>
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span>←</span>
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
