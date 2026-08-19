import "server-only";

import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/django-fetch";
import {
  requireMobileSessionsSession,
  requireMobileReassignSession,
  requireMobileSyncIncidentsSession,
  requireMobileTimeEntriesSession,
  requireMobileUserHealthSession,
} from "./auth";
import {
  buildMobileReassignCreateJobRequest,
  buildMobileReassignExecuteRequest,
  buildMobileReassignJobStatusRequest,
  buildMobileReassignRosterRequest,
} from "./reassign/request";
import {
  decodeMobileReassignJobResponse,
  decodeMobileReassignRosterResponse,
} from "./reassign/response";
import type {
  MobileHandoverJobResponse,
  MobileReassignCreateJobInput,
  MobileReassignResult,
  MobileReassignRosterPreview,
  MobileReassignScope,
} from "./reassign/types";
import {
  buildSessionReviewFlagsRequest,
  buildSessionsActivityRequest,
  type MobileSessionReviewFlagsFilters,
  type MobileSessionsActivityFilters,
} from "./request";
import {
  decodeMobileSessionReviewFlagsResponse,
  decodeMobileSessionsActivityResponse,
  SESSION_REVIEW_ALERTS_UNAVAILABLE,
  type MobileSessionReviewFlagsResult,
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
import {
  buildUserProfileRequest,
  validateProfileUserId,
} from "./user-profile/request";
import {
  decodeMobileUserProfileResponse,
  type MobileUserProfileResult,
} from "./user-profile/response";
import { fetchMobileSyncIncidentsWithToken } from "./sync-incidents/server-fetch";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResult,
} from "./sync-incidents/types";

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

export async function getMobileSessionReviewFlags(
  filters: MobileSessionReviewFlagsFilters = {}
): Promise<MobileSessionReviewFlagsResult> {
  const session = await requireMobileSessionsSession();
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const request = buildSessionReviewFlagsRequest(token, filters);
  let response: Response;
  try {
    response = await djangoFetch(request.path, request.init);
  } catch (error) {
    console.error(
      "[mobile/api] Failed to reach Django session review flags:",
      error
    );
    return {
      ok: false,
      status: 502,
      message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
    };
  }

  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/login?error=insufficient_role");
  return decodeMobileSessionReviewFlagsResponse(response);
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

export async function getMobileSyncIncidents(
  filters: MobileSyncIncidentFilters
): Promise<MobileSyncIncidentsResult> {
  const session = await requireMobileSyncIncidentsSession();
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const result = await fetchMobileSyncIncidentsWithToken(token, filters);
  if (!result.ok && result.kind === "not_authenticated") {
    redirect("/login?error=session_expired");
  }
  return result;
}

export async function getMobileUserProfile(
  userId: string
): Promise<MobileUserProfileResult> {
  const session = await requireMobileUserHealthSession();
  const validatedUserId = validateProfileUserId(userId);
  if (validatedUserId === null) {
    return { ok: false, status: 404, notFound: true };
  }

  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const request = buildUserProfileRequest(token, validatedUserId);
  let response: Response;
  try {
    response = await djangoFetch(request.path, request.init);
  } catch (error) {
    console.error("[mobile/api] Failed to reach Django user profile:", error);
    return {
      ok: false,
      status: 502,
      message: "The user profile service is currently unavailable.",
    };
  }

  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/login?error=insufficient_role");
  return decodeMobileUserProfileResponse(response);
}

async function withMobileReassignRequest<T>(
  buildRequest: (token: string) => { path: string; init: RequestInit },
  decode: (response: Response) => Promise<MobileReassignResult<T>>
): Promise<MobileReassignResult<T>> {
  const session = await requireMobileReassignSession();
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  let response: Response;
  try {
    const request = buildRequest(token);
    response = await djangoFetch(request.path, request.init);
  } catch (error) {
    console.error("[mobile/api] Django roster-handover request failed:", error);
    return {
      ok: false,
      status: 502,
      code: "mobile_handover_unavailable",
      message: "The roster handover service is currently unavailable.",
    };
  }
  if (response.status === 401) redirect("/login?error=session_expired");
  if (response.status === 403) redirect("/login?error=insufficient_role");
  return decode(response);
}

export function getMobileReassignRoster(input: {
  fromEa: string;
  scope?: MobileReassignScope;
  scopeClassId?: string | null;
}): Promise<MobileReassignResult<MobileReassignRosterPreview>> {
  return withMobileReassignRequest(
    (token) => buildMobileReassignRosterRequest(token, input),
    decodeMobileReassignRosterResponse
  );
}

export function createMobileReassignJob(
  input: MobileReassignCreateJobInput
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return withMobileReassignRequest(
    (token) => buildMobileReassignCreateJobRequest(token, input),
    decodeMobileReassignJobResponse
  );
}

export function executeMobileReassignJob(
  jobId: string
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return withMobileReassignRequest(
    (token) => buildMobileReassignExecuteRequest(token, jobId),
    decodeMobileReassignJobResponse
  );
}

export function getMobileReassignJob(
  jobId: string
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return withMobileReassignRequest(
    (token) => buildMobileReassignJobStatusRequest(token, jobId),
    decodeMobileReassignJobResponse
  );
}
