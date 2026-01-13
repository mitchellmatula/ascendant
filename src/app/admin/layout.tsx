import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has admin access
  if (!isAdmin(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminSidebar userRole={user.role} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
