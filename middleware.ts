// middleware.ts (in your project root or src/ folder)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/analytics(.*)', // Protects /analytics and any sub-routes
  // Add any other routes you want to protect here
]);

export default clerkMiddleware(async(auth, req) => {
  // Log to see if the middleware is running for the path
  console.log(`[Middleware] Path: ${req.nextUrl.pathname}`);

  if (isProtectedRoute(req)) {
    // Log if the path is identified as protected
    console.log(`[Middleware] Protected route accessed: ${req.nextUrl.pathname}. Applying auth().protect().`);
    await auth.protect() // auth().protect() will handle redirection if not authenticated
  }

  // If it's not a protected route, allow the request to proceed
  // For public routes, you don't need to do anything specific here unless you have other logic.
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!.*\\..*|_next).*)',
    '/', // Also include the root route if it's not caught by the above
    '/(api|trpc)(.*)', // Match API routes
  ],
};