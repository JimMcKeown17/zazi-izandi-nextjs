import {
  mobileSyncIncidentsSchema,
  mobileSyncIncidentsV2Schema,
  responseMatchesRequest,
} from "./schema";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResult,
} from "./types";

export async function decodeMobileSyncIncidentsResponse(
  response: Response,
  requestedFilters: MobileSyncIncidentFilters
): Promise<MobileSyncIncidentsResult> {
  return decodeVersionedMobileSyncIncidentsResponse(
    response,
    requestedFilters,
    mobileSyncIncidentsSchema
  );
}

async function decodeVersionedMobileSyncIncidentsResponse(
  response: Response,
  requestedFilters: MobileSyncIncidentFilters,
  schema:
    | typeof mobileSyncIncidentsSchema
    | typeof mobileSyncIncidentsV2Schema
): Promise<MobileSyncIncidentsResult> {
  if (!response.ok) {
    if (response.status === 400) {
      return {
        ok: false,
        status: 400,
        kind: "invalid_filters",
        message: "The selected sync-incident filters are invalid.",
      };
    }
    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        kind: "not_authorized",
        message: "Sync incident alerts are not available for this role.",
      };
    }
    if (response.status === 409) {
      return {
        ok: false,
        status: 409,
        kind: "stale_cursor",
        message: "The alert list changed. Refreshing from the first page is required.",
      };
    }
    return {
      ok: false,
      status: response.status,
      kind: "unavailable",
      message: "Sync incident alerts are temporarily unavailable.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      kind: "unavailable",
      message: "Sync incident alerts are temporarily unavailable.",
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success || !responseMatchesRequest(parsed.data, requestedFilters)) {
    return {
      ok: false,
      status: 502,
      kind: "unavailable",
      message: "Sync incident alerts are temporarily unavailable.",
    };
  }

  return { ok: true, data: parsed.data };
}

export async function decodeMobileSyncIncidentsV2Response(
  response: Response,
  requestedFilters: MobileSyncIncidentFilters
): Promise<MobileSyncIncidentsResult> {
  return decodeVersionedMobileSyncIncidentsResponse(
    response,
    requestedFilters,
    mobileSyncIncidentsV2Schema
  );
}
