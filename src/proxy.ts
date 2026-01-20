import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that don't require authentication at all
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)", // Webhooks must be public
  "/api/clerk(.*)",
  "/challenges(.*)",
  "/disciplines(.*)",
  "/domains(.*)",
  "/feed(.*)",
  "/gyms(.*)",
  "/gym/(.*)",
  "/athletes/(.*)",
  "/_next(.*)",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
]);

// API routes - Clerk should attach auth context but NOT enforce/redirect
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

// Protected page routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
  "/my-submissions(.*)",
  "/classes(.*)",
  "/coach(.*)",
  "/admin(.*)",
]);

// Next.js 16 uses proxy.ts with named export 'proxy'
const proxy = clerkMiddleware(async (auth, request) => {
  // For API routes, don't call protect() - let the route handler check auth
  // But Clerk still attaches the auth context so auth() works in the handler
  if (isApiRoute(request)) {
    return;
  }

  // For public page routes, don't enforce auth
  if (isPublicRoute(request)) {
    return;
  }

  // For protected page routes, redirect to sign-in if not authenticated
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
