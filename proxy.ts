import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

import type { Role } from "@/lib/mobile/capabilities";
import { isPublicEaSetPasswordRoute } from "@/lib/routes/public-routes";

const STAFF_ROLES: Role[] = ["junior_staff", "senior_staff", "admin"];

const PROTECTED_ROUTES: Record<string, Role[]> = {
  "/pm": ["funder", ...STAFF_ROLES],
  "/schools": ["funder", ...STAFF_ROLES],
  "/my-kids": ["ea", ...STAFF_ROLES],
  "/my-classroom": ["teacher"],
  "/mobile-app": [...STAFF_ROLES, "zz_data_manager"],
};

function protectedRouteFor(pathname: string): [string, Role[]] | undefined {
  return Object.entries(PROTECTED_ROUTES).find(([route]) =>
    pathname.startsWith(route)
  );
}

const staffProxy = clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  const protectedRoute = protectedRouteFor(pathname);
  if (!protectedRoute) return;

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
  const [, allowedRoles] = protectedRoute;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return NextResponse.redirect(
      new URL("/login?error=insufficient_role", req.url)
    );
  }
});

export default function proxy(request:NextRequest, event:NextFetchEvent) {
  const pathname=request.nextUrl.pathname;
  if (isPublicEaSetPasswordRoute(pathname) || [
    "/api/mobile/password-setup/redeem", "/api/mobile/password-setup/submit",
    "/api/mobile/password-setup/discard", "/api/mobile/password-completion",
  ].includes(pathname)) return NextResponse.next();
  return staffProxy(request,event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
