/**
 * Shared navigation configuration
 * Used by both desktop and mobile menus
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/challenges", label: "Challenges", icon: "🏆" },
  { href: "/classes", label: "Classes", icon: "🎓" },
  { href: "/gyms", label: "Gyms", icon: "🏋️" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🥇" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/support", label: "Support", icon: "❓" },
];
