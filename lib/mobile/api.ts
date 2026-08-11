import "server-only";

import { redirect } from "next/navigation";

import { djangoFetch } from "@/lib/django-fetch";
import { requireMobileSessionsSession } from "./auth";
import {
  buildSessionsActivityRequest,
  type MobileSessionsActivityFilters,
} from "./request";
import { mobileSessionsActivitySchema } from "./schema";
import type { MobileSessionsActivityResponse } from "./types";

export type MobileSessionsActivityResult =
  | { ok: true; data: MobileSessionsActivityResponse }
  | { ok: false; status: number; message: string };

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
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 400
          ? "The selected report filters are invalid."
          : "The mobile-app report service could not return session data.",
    };
  }

  const parsed = mobileSessionsActivitySchema.safeParse(await response.json());
  if (!parsed.success) {
    console.error(
      "[mobile/api] Django returned an invalid sessions report contract:",
      parsed.error.issues.map(({ path, message }) => ({ path, message }))
    );
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report returned an unexpected data format.",
    };
  }

  return { ok: true, data: parsed.data };
}
