import "server-only";

import { djangoFetch } from "@/lib/django-fetch";
import type { SyncIncidentPageAuthorizationFailure } from "./load-page";
import {
  buildSyncIncidentsRequest,
  buildSyncIncidentsV2Request,
} from "./request";
import {
  decodeMobileSyncIncidentsResponse,
  decodeMobileSyncIncidentsV2Response,
} from "./response";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResult,
} from "./types";

type SyncIncidentRequestBuilder = typeof buildSyncIncidentsRequest;
type SyncIncidentResponseDecoder = typeof decodeMobileSyncIncidentsResponse;

async function fetchVersionedMobileSyncIncidentsWithToken(
  token: string,
  filters: MobileSyncIncidentFilters,
  buildRequest: SyncIncidentRequestBuilder,
  decodeResponse: SyncIncidentResponseDecoder
): Promise<MobileSyncIncidentsResult | SyncIncidentPageAuthorizationFailure> {
  const request = buildRequest(token, filters);
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
  return decodeResponse(response, filters);
}

export async function fetchMobileSyncIncidentsWithToken(
  token: string,
  filters: MobileSyncIncidentFilters
): Promise<MobileSyncIncidentsResult | SyncIncidentPageAuthorizationFailure> {
  return fetchVersionedMobileSyncIncidentsWithToken(
    token,
    filters,
    buildSyncIncidentsRequest,
    decodeMobileSyncIncidentsResponse
  );
}

export async function fetchMobileSyncIncidentsV2WithToken(
  token: string,
  filters: MobileSyncIncidentFilters
): Promise<MobileSyncIncidentsResult | SyncIncidentPageAuthorizationFailure> {
  return fetchVersionedMobileSyncIncidentsWithToken(
    token,
    filters,
    buildSyncIncidentsV2Request,
    decodeMobileSyncIncidentsV2Response
  );
}
