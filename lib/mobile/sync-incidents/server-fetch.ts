import "server-only";

import { djangoFetch } from "@/lib/django-fetch";
import type { SyncIncidentPageAuthorizationFailure } from "./load-page";
import { buildSyncIncidentsRequest } from "./request";
import { decodeMobileSyncIncidentsResponse } from "./response";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResult,
} from "./types";

export async function fetchMobileSyncIncidentsWithToken(
  token: string,
  filters: MobileSyncIncidentFilters
): Promise<MobileSyncIncidentsResult | SyncIncidentPageAuthorizationFailure> {
  const request = buildSyncIncidentsRequest(token, filters);
  let response: Response;
  try {
    response = await djangoFetch(request.path, request.init);
  } catch {
    console.error("[mobile/api] Django sync-incident request failed");
    return {
      ok: false,
      status: 502,
      kind: "unavailable",
      message: "Sync incident alerts are temporarily unavailable.",
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      status: 401,
      kind: "not_authenticated",
      message: "Your session has expired. Refresh and sign in again.",
    };
  }
  return decodeMobileSyncIncidentsResponse(response, filters);
}
