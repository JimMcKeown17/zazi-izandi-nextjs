import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  hasCapability,
  type MobileCapability,
  type Role,
} from "./capabilities";

const getMobileSession = cache(async () => {
  const session = await auth();
  if (!session.userId) redirect("/login");

  const role = (
    session.sessionClaims?.metadata as { role?: unknown } | undefined
  )?.role;

  return {
    userId: session.userId,
    role,
    getToken: session.getToken,
  };
});

export async function requireMobileCapability(
  capability: MobileCapability
) {
  const session = await getMobileSession();
  if (!hasCapability(session.role, capability)) {
    redirect("/login?error=insufficient_role");
  }

  return {
    userId: session.userId,
    role: session.role as Role,
    getToken: session.getToken,
  };
}

export async function requireMobileReportingSession() {
  const session = await getMobileSession();
  const canReadAnyReport = (
    [
      "mobile.sessions.read",
      "mobile.time_entries.read",
      "mobile.user_health.read",
      "mobile.sync_incidents.read",
    ] as const
  ).some((capability) => hasCapability(session.role, capability));

  if (!canReadAnyReport) {
    redirect("/login?error=insufficient_role");
  }

  return {
    userId: session.userId,
    role: session.role as Role,
    getToken: session.getToken,
  };
}

export function requireMobileSessionsSession() {
  return requireMobileCapability("mobile.sessions.read");
}

export function requireMobileTimeEntriesSession() {
  return requireMobileCapability("mobile.time_entries.read");
}

export function requireMobileUserHealthSession() {
  return requireMobileCapability("mobile.user_health.read");
}

export function requireMobileSyncIncidentsSession() {
  return requireMobileCapability("mobile.sync_incidents.read");
}
