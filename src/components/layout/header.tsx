import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();
  const showAdminLink = user && isAdmin(user.role);

  return (
    <header className="flex justify-between items-center px-6 h-16 border-b border-border bg-background">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-primary">
          Ascendant
        </Link>
        <SignedIn>
          <nav className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/domains" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Domains
            </Link>
            {showAdminLink && (
              <Link 
                href="/admin" 
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Admin
              </Link>
            )}
          </nav>
        </SignedIn>
      </div>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="bg-primary text-primary-foreground rounded-lg font-medium text-sm h-10 px-4 cursor-pointer hover:opacity-90 transition-opacity">
              Get Started
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
          />
        </SignedIn>
      </div>
    </header>
  );
}
