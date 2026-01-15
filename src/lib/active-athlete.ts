import { cookies } from "next/headers";

const ACTIVE_ATHLETE_COOKIE = "ascendant-active-athlete";

/**
 * Get the active athlete ID from cookies (server-side)
 */
export async function getActiveAthleteId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ATHLETE_COOKIE)?.value ?? null;
}

/**
 * Set the active athlete ID in cookies (server-side)
 */
export async function setActiveAthleteId(athleteId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ATHLETE_COOKIE, athleteId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

/**
 * Clear the active athlete cookie (server-side)
 */
export async function clearActiveAthleteId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ATHLETE_COOKIE);
}

/**
 * Cookie name for client-side access
 */
export const COOKIE_NAME = ACTIVE_ATHLETE_COOKIE;
