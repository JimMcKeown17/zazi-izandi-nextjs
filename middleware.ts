import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Assign roles in Clerk Dashboard → User → Metadata:
//   publicMetadata: { "role": "funder" }
type Role = "ea" | "teacher" | "funder" | "junior_staff" | "senior_staff" | "admin";

const STAFF_ROLES: Role[] = ["junior_staff", "senior_staff", "admin"];

// Route prefix → which roles can access it
const PROTECTED_ROUTES: Record<string, Role[]> = {
  "/pm":           ["funder",  ...STAFF_ROLES],
  "/schools":      ["funder",  ...STAFF_ROLES],
  "/my-kids":      ["ea",      ...STAFF_ROLES],
  "/my-classroom": ["teacher"],
};

// IMPORTANT: For sessionClaims.metadata.role to work, add a custom claim in
// Clerk Dashboard → Configure → Sessions → Customize session token:
//   { "metadata": "{{user.public_metadata}}" }

const isProtectedRoute = createRouteMatcher([
  "/schools(.*)",
  "/pm(.*)",
  "/my-kids(.*)",
  "/my-classroom(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "redirect_url",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (
    sessionClaims?.metadata as { role?: Role } | undefined
  )?.role;

  const pathname = req.nextUrl.pathname;

  for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
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
