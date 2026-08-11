import "server-only";

import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/django-fetch";
import { requireMobileSessionsSession } from "./auth";
import {
  buildSessionsActivityRequest,
  type MobileSessionsActivityFilters,
} from "./request";
import {
  decodeMobileSessionsActivityResponse,
  type MobileSessionsActivityResult,
} from "./response";

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
