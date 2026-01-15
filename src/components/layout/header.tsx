import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { getCurrentUser, isAdmin, getActiveAthlete, getAllAthletes } from "@/lib/auth";
import { MobileMenu } from "./mobile-menu";
import { AthleteSwitcher } from "./athlete-switcher";
import { UserMenu } from "./user-menu";
import { NAV_ITEMS } from "@/lib/navigation";
import { db } from "@/lib/db";
import { calculatePrime, formatLevel, getRankColor } from "@/lib/levels";

export async function Header() {
  const user = await getCurrentUser();
  const showAdminLink = user && isAdmin(user.role);
  
  // Get the active athlete (respects switcher selection)
  const activeAthlete = user ? await getActiveAthlete(user) : null;
  const allAthletes = user ? getAllAthletes(user) : [];
  const isParent = user?.accountType === "PARENT";
  const hasMultipleAthletes = allAthletes.length > 1;
  
  // Get Prime levels for all athletes (for the switcher display)
  let athletesWithLevels: Array<{
    id: string;
    displayName: string;
    level: { letter: string; sublevel: number } | null;
    isOwnProfile: boolean;
  }> = [];
  
  if (user && allAthletes.length > 0) {
    const athleteIds = allAthletes.map((a) => a.id);
    const domainLevels = await db.domainLevel.findMany({
      where: { athleteId: { in: athleteIds } },
    });
    
    // Group domain levels by athlete
    const levelsByAthlete = new Map<string, typeof domainLevels>();
    for (const level of domainLevels) {
      const existing = levelsByAthlete.get(level.athleteId) ?? [];
      existing.push(level);
      levelsByAthlete.set(level.athleteId, existing);
    }
    
    athletesWithLevels = allAthletes.map((athlete) => {
      const levels = levelsByAthlete.get(athlete.id) ?? [];
      const prime = levels.length > 0 ? calculatePrime(levels) : { letter: "F", sublevel: 0 };
      return {
        id: athlete.id,
        displayName: athlete.displayName,
        level: prime,
        isOwnProfile: athlete.id === user.athlete?.id,
      };
    });
  }
  
  // Get active athlete's Prime level for the badge
  let primeLevel: { letter: string; sublevel: number } | null = null;
  if (activeAthlete) {
    const activeLevelData = athletesWithLevels.find((a) => a.id === activeAthlete.id);
    primeLevel = activeLevelData?.level ?? { letter: "F", sublevel: 0 };
  }

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-4 md:px-6 h-14 md:h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 md:gap-6">
        <Link href="/" className="text-lg md:text-xl font-bold text-primary">
          Ascendant
        </Link>
        {/* Desktop navigation */}
        <SignedIn>
          <nav className="hidden md:flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
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
      <div className="flex items-center gap-3 md:gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="bg-primary text-primary-foreground rounded-lg font-medium text-sm h-9 md:h-10 px-3 md:px-4 cursor-pointer hover:opacity-90 transition-opacity">
              Get Started
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          {/* Athlete Switcher - always show for users who can add children */}
          {activeAthlete && (
            <div className="hidden sm:block">
              <AthleteSwitcher
                athletes={athletesWithLevels}
                activeAthleteId={activeAthlete.id}
                showAddChild={true}
              />
            </div>
          )}
          {/* Prime Level Badge */}
          {primeLevel && (
            <Link 
              href="/domains" 
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-sm font-bold transition-opacity hover:opacity-80"
              style={{ 
                backgroundColor: `${getRankColor(primeLevel.letter)}20`,
                color: getRankColor(primeLevel.letter),
              }}
              title={activeAthlete ? `${activeAthlete.displayName}'s Prime Level` : "Your Prime Level"}
            >
              <span className="text-xs">⭐</span>
              <span>{formatLevel(primeLevel.letter, primeLevel.sublevel)}</span>
            </Link>
          )}
          <UserMenu />
          {/* Mobile hamburger menu */}
          <MobileMenu 
            showAdminLink={showAdminLink ?? false} 
            primeLevel={primeLevel}
            athletes={athletesWithLevels}
            activeAthleteId={activeAthlete?.id ?? null}
            isParent={isParent}
          />
        </SignedIn>
      </div>
    </header>
  );
}
