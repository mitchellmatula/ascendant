import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsNav } from "./settings-nav";

const SETTINGS_NAV = [
  { href: "/settings", label: "Profile", icon: "👤" },
  { href: "/settings/children", label: "Manage Children", icon: "👨‍👩‍👧‍👦", parentOnly: true },
  { href: "/settings/connections", label: "Connections", icon: "🔗" },
  // { href: "/settings/notifications", label: "Notifications", icon: "🔔" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const isParent = user.accountType === "PARENT";
  const navItems = SETTINGS_NAV.filter(item => !item.parentOnly || isParent);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar navigation */}
        <SettingsNav items={navItems} />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
