import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Role hierarchy — higher number = more access
// Assign roles in Clerk Dashboard → User → Metadata:
//   publicMetadata: { "role": "funder" }
// Roles: funder | junior_staff | senior_staff | admin
// Guest = not signed in
type Role = "funder" | "junior_staff" | "senior_staff" | "admin";

const ROLE_LEVELS: Record<Role, number> = {
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4,
};

// Route → minimum role required to access it
// Easy to adjust — add or remove entries here to change access control
const PROTECTED_ROUTES: Record<string, Role> = {
  "/schools": "funder",
};

// IMPORTANT: For sessionClaims.metadata.role to work, add a custom claim in
// Clerk Dashboard → Configure → Sessions → Customize session token:
//   { "metadata": "{{user.public_metadata}}" }

const isProtectedRoute = createRouteMatcher(["/schools(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Public routes pass through immediately
  if (!isProtectedRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  // Not signed in → redirect to login
  if (!userId) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role against the minimum required for this route
  const userRole = (
    sessionClaims?.metadata as { role?: Role } | undefined
  )?.role;

  const pathname = req.nextUrl.pathname;

  for (const [route, minRole] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      const userLevel = userRole ? (ROLE_LEVELS[userRole] ?? 0) : 0;
      const requiredLevel = ROLE_LEVELS[minRole];
      if (userLevel < requiredLevel) {
        return NextResponse.redirect(
          new URL("/login?error=insufficient_role", req.url)
        );
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
