import type { MobileSyncIncidentFilters } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DESCRIPTOR_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ASCII_PATTERN = /^[\x20-\x7e]+$/;

export function validateSyncIncidentFilters(
  filters: MobileSyncIncidentFilters,
  options: { requireCursor?: boolean } = {}
): MobileSyncIncidentFilters {
  if (!Number.isInteger(filters.days) || filters.days < 1 || filters.days > 90) {
    throw new RangeError("days must be an integer between 1 and 90");
  }
  if (
    !Number.isInteger(filters.limit) ||
    filters.limit < 1 ||
    filters.limit > 100
  ) {
    throw new RangeError("limit must be an integer between 1 and 100");
  }
  if (filters.schoolId != null && !UUID_PATTERN.test(filters.schoolId)) {
    throw new TypeError("schoolId must be a canonical UUID");
  }
  if (
    filters.incidentKind != null &&
    !["support_root", "integrity_aggregate", "queue_overflow"].includes(
      filters.incidentKind
    )
  ) {
    throw new TypeError("incidentKind is invalid");
  }
  if (
    filters.descriptorKey != null &&
    !DESCRIPTOR_PATTERN.test(filters.descriptorKey)
  ) {
    throw new TypeError("descriptorKey is invalid");
  }
  if (options.requireCursor && filters.cursor == null) {
    throw new TypeError("cursor is required");
  }
  if (
    filters.cursor != null &&
    (filters.cursor.length < 1 ||
      filters.cursor.length > 2048 ||
      !ASCII_PATTERN.test(filters.cursor))
  ) {
    throw new TypeError("cursor must be a bounded ASCII string");
  }

  return {
    days: filters.days,
    schoolId: filters.schoolId ?? null,
    incidentKind: filters.incidentKind ?? null,
    descriptorKey: filters.descriptorKey ?? null,
    limit: filters.limit,
    cursor: filters.cursor ?? null,
  };
}

function buildVersionedSyncIncidentsRequest(
  clerkSessionToken: string,
  filters: MobileSyncIncidentFilters,
  endpoint: "/api/mobile/sync-incidents/" | "/api/mobile/sync-incidents/v2/"
): { path: string; init: RequestInit } {
  if (!clerkSessionToken) throw new Error("A Clerk session token is required");

  const validated = validateSyncIncidentFilters(filters);
  const query = new URLSearchParams({
    days: String(validated.days),
    limit: String(validated.limit),
  });
  if (validated.schoolId) query.set("school_id", validated.schoolId);
  if (validated.incidentKind) {
    query.set("incident_kind", validated.incidentKind);
  }
  if (validated.descriptorKey) {
    query.set("descriptor_key", validated.descriptorKey);
  }
  if (validated.cursor) query.set("cursor", validated.cursor);

  return {
    path: `${endpoint}?${query.toString()}`,
    init: {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      headers: { Authorization: `Bearer ${clerkSessionToken}` },
    },
  };
}

export function buildSyncIncidentsRequest(
  clerkSessionToken: string,
  filters: MobileSyncIncidentFilters
): { path: string; init: RequestInit } {
  return buildVersionedSyncIncidentsRequest(
    clerkSessionToken,
    filters,
    "/api/mobile/sync-incidents/"
  );
}

export function buildSyncIncidentsV2Request(
  clerkSessionToken: string,
  filters: MobileSyncIncidentFilters
): { path: string; init: RequestInit } {
  return buildVersionedSyncIncidentsRequest(
    clerkSessionToken,
    filters,
    "/api/mobile/sync-incidents/v2/"
  );
}
