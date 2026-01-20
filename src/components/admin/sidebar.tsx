"use client";

import { useState } from "react";
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
    title: "Submissions",
    href: "/admin/submissions",
    icon: "📝",
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
    title: "Disciplines",
    href: "/admin/disciplines",
    icon: "🥷",
  },
  {
    title: "Equipment",
    href: "/admin/equipment",
    icon: "🏋️",
  },
  {
    title: "Equipment Packages",
    href: "/admin/equipment-packages",
    icon: "📦",
  },
  {
    title: "Breakthroughs",
    href: "/admin/breakthroughs",
    icon: "✨",
  },
  {
    title: "Gyms",
    href: "/admin/gyms",
    icon: "🏢",
  },
  {
    title: "Classes",
    href: "/admin/classes",
    icon: "🎓",
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
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (item.systemAdminOnly && userRole !== "SYSTEM_ADMIN") {
      return false;
    }
    return true;
  });

  // Find current page title for mobile header
  const currentPage = filteredItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href))
  );

  return (
    <>
      {/* Mobile header bar with menu toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div>
          <h2 className="font-semibold text-lg">Admin Panel</h2>
          <p className="text-xs text-muted-foreground">
            {currentPage?.title || "Overview"}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          aria-label="Toggle admin menu"
        >
          <span className="text-xl">{isOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - fixed on mobile, static on desktop */}
      <aside
        className={cn(
          "bg-card border-r border-border min-h-full z-50 flex flex-col",
          // Mobile: off-canvas drawer from left
          "fixed lg:static top-0 left-0 h-full w-64 transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Admin Panel</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {userRole === "SYSTEM_ADMIN" ? "System Admin" : "Gym Admin"}
              </p>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-base lg:text-sm transition-colors min-h-[44px]",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-lg lg:text-base">{item.icon}</span>
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-border">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-base lg:text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px]"
          >
            <span>←</span>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
