"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";
import { formatLevel, getRankColor } from "@/lib/levels";

interface MobileMenuProps {
  showAdminLink: boolean;
  primeLevel: { letter: string; sublevel: number } | null;
}

export function MobileMenu({ showAdminLink, primeLevel }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
        </nav>
      </div>
    </>
  );
}
