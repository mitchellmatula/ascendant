"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";
import { formatLevel, getRankColor } from "@/lib/levels";
import { Check, ChevronDown, UserPlus } from "lucide-react";

interface AthleteOption {
  id: string;
  displayName: string;
  level: { letter: string; sublevel: number } | null;
  isOwnProfile: boolean;
}

interface MobileMenuProps {
  showAdminLink: boolean;
  showCoachLink?: boolean;
  primeLevel: { letter: string; sublevel: number } | null;
  athletes?: AthleteOption[];
  activeAthleteId?: string | null;
  isParent?: boolean;
}

export function MobileMenu({ 
  showAdminLink, 
  showCoachLink = false,
  primeLevel,
  athletes = [],
  activeAthleteId = null,
  isParent = false,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAthleteList, setShowAthleteList] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  const activeAthlete = athletes.find((a) => a.id === activeAthleteId);
  const hasMultipleAthletes = athletes.length > 1;

  const handleSwitchAthlete = async (athleteId: string) => {
    if (athleteId === activeAthleteId) {
      setShowAthleteList(false);
      return;
    }

    try {
      const response = await fetch("/api/athletes/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId }),
      });

      if (response.ok) {
        setShowAthleteList(false);
        setIsOpen(false);
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      console.error("Failed to switch athlete:", error);
    }
  };

  return (
    <>
      {/* Hamburger button - only on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5"
        aria-label="Toggle menu"
      >
        <span
          className={cn(
            "w-5 h-0.5 bg-foreground transition-all duration-200",
            isOpen && "rotate-45 translate-y-2"
          )}
        />
        <span
          className={cn(
            "w-5 h-0.5 bg-foreground transition-all duration-200",
            isOpen && "opacity-0"
          )}
        />
        <span
          className={cn(
            "w-5 h-0.5 bg-foreground transition-all duration-200",
            isOpen && "-rotate-45 -translate-y-2"
          )}
        />
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 top-14 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={cn(
          "fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-64 bg-background border-l border-border z-50 md:hidden transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <nav className="flex flex-col p-4">
          {/* Athlete Switcher - show for any user with athlete profile */}
          {activeAthlete && (
            <div className="mb-4">
              <button
                onClick={() => setShowAthleteList(!showAthleteList)}
                disabled={isPending}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-muted text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Viewing as:</span>
                  <span className="font-medium">{activeAthlete.displayName}</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showAthleteList && "rotate-180"
                )} />
              </button>
              
              {showAthleteList && (
                <div className="mt-1 border border-border rounded-lg overflow-hidden">
                  {athletes.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleSwitchAthlete(athlete.id)}
                      disabled={isPending}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                        athlete.id === activeAthleteId 
                          ? "bg-primary/10" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {athlete.isOwnProfile && <span className="text-xs">🏃</span>}
                        <span className={athlete.id === activeAthleteId ? "font-medium" : ""}>
                          {athlete.displayName}
                        </span>
                        {athlete.isOwnProfile && (
                          <span className="text-xs text-muted-foreground">(me)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {athlete.level && (
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${getRankColor(athlete.level.letter)}20`,
                              color: getRankColor(athlete.level.letter),
                            }}
                          >
                            {formatLevel(athlete.level.letter, athlete.level.sublevel)}
                          </span>
                        )}
                        {athlete.id === activeAthleteId && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                  
                  {/* Always show Add Child option */}
                  <>
                    <div className="h-px bg-border" />
                    <Link
                      href="/athletes/add"
                      onClick={() => {
                        setShowAthleteList(false);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Child
                    </Link>
                  </>
                </div>
              )}
            </div>
          )}

          {/* Prime Level at top of mobile menu */}
          {primeLevel && (
            <Link
              href="/domains"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-base font-bold"
              style={{ 
                backgroundColor: `${getRankColor(primeLevel.letter)}20`,
                color: getRankColor(primeLevel.letter),
              }}
            >
              <span>⭐</span>
              <span>Prime: {formatLevel(primeLevel.letter, primeLevel.sublevel)}</span>
            </Link>
          )}
          
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          {showAdminLink && (
            <>
              <div className="h-px bg-border my-4" />
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary text-primary-foreground"
                    : "text-primary hover:text-primary/80 hover:bg-muted"
                )}
              >
                <span>⚙️</span>
                <span>Admin Panel</span>
              </Link>
            </>
          )}
          
          {showCoachLink && (
            <>
              {!showAdminLink && <div className="h-px bg-border my-4" />}
              <Link
                href="/coach"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors",
                  pathname.startsWith("/coach")
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-600 dark:text-emerald-400 hover:bg-muted"
                )}
              >
                <span>🎓</span>
                <span>Coach Dashboard</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  );
}
