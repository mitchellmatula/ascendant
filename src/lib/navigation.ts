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
  { href: "/domains", label: "Ranks", icon: "🎯" },
  // { href: "/progress", label: "Progress", icon: "📈" }, // Coming soon
];
