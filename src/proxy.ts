import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that don't require authentication at all
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)", // Webhooks must be public
  "/challenges(.*)",
  "/disciplines(.*)",
  "/domains(.*)",
  "/feed(.*)",
  "/gyms(.*)",
  "/gym/(.*)",
]);

// API routes - Clerk should attach auth context but NOT enforce/redirect
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
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
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
