import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import type { Role, Athlete } from "../../prisma/generated/prisma/client";
import { getActiveAthleteId } from "./active-athlete";

// Type for user with athlete relations
type UserWithAthletes = {
  id: string;
  athlete: Athlete | null;
  managedAthletes: Athlete[];
  [key: string]: unknown;
};

/**
 * Get the current user from the database, creating if needed
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return null;
  }

  // Try to find existing user
  let user = await db.user.findUnique({
    where: { clerkId },
    include: {
      athlete: true,
      managedAthletes: true,
    },
  });

  // If user doesn't exist, create them (handles case where webhook didn't fire)
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
    
    user = await db.user.create({
      data: {
        clerkId,
        email,
      },
      include: {
        athlete: true,
        managedAthletes: true,
      },
    });
  }

  return user;
}

/**
 * Get the current user or throw an error
 */
export async function requireUser() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Check if user has one of the specified roles
 */
export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user can auto-approve submissions
 * Coaches, Gym Admins, and System Admins can auto-approve
 */
export function canAutoApprove(role: Role): boolean {
  return hasRole(role, ["COACH", "GYM_ADMIN", "SYSTEM_ADMIN"]);
}

/**
 * Check if user has admin access
 */
export function isAdmin(role: Role): boolean {
  return hasRole(role, ["GYM_ADMIN", "SYSTEM_ADMIN"]);
}

/**
 * Check if user is a system admin
 */
export function isSystemAdmin(role: Role): boolean {
  return role === "SYSTEM_ADMIN";
}

/**
 * Get the active athlete for a user.
 * Respects the stored cookie selection, falling back to:
 * 1. User's own athlete profile
 * 2. First managed athlete
 * Returns null if no athlete available.
 */
export async function getActiveAthlete(user: UserWithAthletes): Promise<Athlete | null> {
  // Collect all athletes this user has access to
  const allAthletes: Athlete[] = [];
  if (user.athlete) {
    allAthletes.push(user.athlete);
  }
  allAthletes.push(...user.managedAthletes);

  if (allAthletes.length === 0) {
    return null;
  }

  // Check if there's a stored active athlete
  const storedAthleteId = await getActiveAthleteId();
  
  if (storedAthleteId) {
    const storedAthlete = allAthletes.find((a) => a.id === storedAthleteId);
    if (storedAthlete) {
      return storedAthlete;
    }
  }

  // Fall back to user's own athlete, then first managed athlete
  return user.athlete ?? user.managedAthletes[0] ?? null;
}

/**
 * Get all athletes accessible to a user (own profile + managed children)
 */
export function getAllAthletes(user: UserWithAthletes): Athlete[] {
  const athletes: Athlete[] = [];
  if (user.athlete) {
    athletes.push(user.athlete);
  }
  athletes.push(...user.managedAthletes);
  return athletes;
}
