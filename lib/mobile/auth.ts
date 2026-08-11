import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { hasCapability, type Role } from "./capabilities";

export async function requireMobileSessionsSession() {
  const session = await auth();
  if (!session.userId) redirect("/login");

  const role = (
    session.sessionClaims?.metadata as { role?: unknown } | undefined
  )?.role;
  if (!hasCapability(role, "mobile.sessions.read")) {
    redirect("/login?error=insufficient_role");
  }

  return {
    userId: session.userId,
    role: role as Role,
    getToken: session.getToken,
  };
}
