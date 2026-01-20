/**
 * Fetch wrapper that handles Clerk session refresh on 401 errors
 * 
 * When a 401 is received, it attempts to refresh the Clerk session
 * using the Clerk client library, then retries the original request.
 */

// Track if we're currently refreshing to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 5000; // 5 seconds between proactive refreshes

async function refreshClerkSession(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Access the Clerk instance from window (set by ClerkProvider)
      const clerk = (window as unknown as { Clerk?: { session?: { getToken: (options?: { skipCache?: boolean }) => Promise<string | null> } } }).Clerk;
      
      if (clerk?.session) {
        // Force a fresh token by skipping the cache
        const token = await clerk.session.getToken({ skipCache: true });
        if (token) {
          lastRefreshTime = Date.now();
          // Small delay to ensure cookies are updated
          await new Promise((resolve) => setTimeout(resolve, 50));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Failed to refresh Clerk session:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Proactively refresh token before making request if it's been a while
async function ensureFreshToken(): Promise<void> {
  const timeSinceRefresh = Date.now() - lastRefreshTime;
  if (timeSinceRefresh > 30000) { // If more than 30 seconds since last refresh
    await refreshClerkSession();
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Ensure credentials are included
  const options: RequestInit = {
    ...init,
    credentials: "include",
  };

  // Proactively refresh if needed (only if not in cooldown)
  const timeSinceRefresh = Date.now() - lastRefreshTime;
  if (timeSinceRefresh > REFRESH_COOLDOWN) {
    await ensureFreshToken();
  }

  // Make the initial request
  let response = await fetch(input, options);

  // If we get a 401, try to refresh the session and retry once
  if (response.status === 401) {
    const refreshed = await refreshClerkSession();
    
    if (refreshed) {
      // Retry the original request
      response = await fetch(input, options);
    }
  }

  return response;
}
