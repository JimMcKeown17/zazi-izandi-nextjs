import "server-only";

import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/django-fetch";
import {
  requireMobileSessionsSession,
  requireMobileTimeEntriesSession,
  requireMobileUserHealthSession,
} from "./auth";
import {
  buildSessionsActivityRequest,
  type MobileSessionsActivityFilters,
} from "./request";
import {
  decodeMobileSessionsActivityResponse,
  type MobileSessionsActivityResult,
} from "./response";
import {
  buildTimeEntriesActivityRequest,
  type MobileTimeEntriesFilters,
} from "./time-entries/request";
import {
  decodeMobileTimeEntriesActivityResponse,
  type MobileTimeEntriesActivityResult,
} from "./time-entries/response";
import {
  buildUserHealthRequest,
  type MobileUserHealthFilters,
} from "./user-health/request";
import {
  decodeMobileUserHealthResponse,
  type MobileUserHealthResult,
} from "./user-health/response";

export async function getMobileSessionsActivity(
  filters: MobileSessionsActivityFilters
): Promise<MobileSessionsActivityResult> {
  const session = await requireMobileSessionsSession();
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const request = buildSessionsActivityRequest(token, filters);
  let response: Response;
  try {
    response = await djangoFetch(request.path, request.init);
  } catch (error) {
    console.error("[mobile/api] Failed to reach Django sessions report:", error);
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report service is currently unavailable.",
    };
  }

  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/login?error=insufficient_role");
  return decodeMobileSessionsActivityResponse(response);
}

export async function getMobileTimeEntriesActivity(
  filters: MobileTimeEntriesFilters
): Promise<MobileTimeEntriesActivityResult> {
  const session = await requireMobileTimeEntriesSession();
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const request = buildTimeEntriesActivityRequest(token, filters);
  let response: Response;
  try {
    response = await djangoFetch(request.path, request.init);
  } catch (error) {
    console.error("[mobile/api] Failed to reach Django clock report:", error);
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report service is currently unavailable.",
    };
  }

  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/login?error=insufficient_role");
  return decodeMobileTimeEntriesActivityResponse(response);
}

export async function getMobileUserHealth(
  filters: MobileUserHealthFilters
): Promise<MobileUserHealthResult> {
  const session = await requireMobileUserHealthSession();
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const request = buildUserHealthRequest(token, filters);
  let response: Response;
  try {
    response = await djangoFetch(request.path, request.init);
  } catch (error) {
    console.error("[mobile/api] Failed to reach Django user-health report:", error);
    return {
      ok: false,
      status: 502,
      message: "The onboarding health service is currently unavailable.",
    };
  }

  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/login?error=insufficient_role");
  return decodeMobileUserHealthResponse(response);
}
