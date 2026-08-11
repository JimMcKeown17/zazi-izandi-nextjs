export interface MobileTimeEntriesFilters {
  days: number;
  schoolId?: string | null;
}
interface MobileTimeEntriesRequest {
  path: string;
  init: RequestInit;
}

function validateFilters(filters: MobileTimeEntriesFilters) {
  if (!Number.isInteger(filters.days) || filters.days < 1 || filters.days > 90) {
    throw new RangeError("days must be an integer between 1 and 90");
  }
}

function buildQuery(filters: MobileTimeEntriesFilters): string {
  validateFilters(filters);
  const query = new URLSearchParams({ days: String(filters.days) });
  if (filters.schoolId) query.set("school_id", filters.schoolId);
  return query.toString();
}

export function buildTimeEntriesActivityRequest(
  clerkSessionToken: string,
  filters: MobileTimeEntriesFilters
): MobileTimeEntriesRequest {
  if (!clerkSessionToken) throw new Error("A Clerk session token is required");

  return {
    path: `/api/mobile/time-entries/?${buildQuery(filters)}`,
    init: {
      cache: "no-store",
      headers: { Authorization: `Bearer ${clerkSessionToken}` },
    },
  };
}

export function buildTimeEntriesExportRequest(
  clerkSessionToken: string,
  filters: MobileTimeEntriesFilters
): MobileTimeEntriesRequest {
  if (!clerkSessionToken) throw new Error("A Clerk session token is required");

  return {
    path: `/api/mobile/exports/time-entries/?${buildQuery(filters)}`,
    init: {
      cache: "no-store",
      headers: { Authorization: `Bearer ${clerkSessionToken}` },
    },
  };
}
