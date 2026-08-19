export interface MobileSessionsActivityFilters {
  days: number;
  schoolId?: string | null;
}

export interface MobileSessionsActivityRequest {
  path: string;
  init: RequestInit;
}

export function buildSessionsActivityRequest(
  clerkSessionToken: string,
  filters: MobileSessionsActivityFilters
): MobileSessionsActivityRequest {
  if (!Number.isInteger(filters.days) || filters.days < 1 || filters.days > 90) {
    throw new RangeError("days must be an integer between 1 and 90");
  }
  if (!clerkSessionToken) {
    throw new Error("A Clerk session token is required");
  }

  const query = new URLSearchParams({ days: String(filters.days) });
  if (filters.schoolId) query.set("school_id", filters.schoolId);

  return {
    path: `/api/mobile/sessions-activity/?${query.toString()}`,
    init: {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${clerkSessionToken}`,
      },
    },
  };
}

export interface MobileSessionReviewFlagsFilters {
  limit?: number;
  schoolId?: string | null;
}

export function buildSessionReviewFlagsRequest(
  clerkSessionToken: string,
  filters: MobileSessionReviewFlagsFilters = {}
): MobileSessionsActivityRequest {
  const limit = filters.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("limit must be an integer between 1 and 100");
  }
  if (!clerkSessionToken) {
    throw new Error("A Clerk session token is required");
  }

  const query = new URLSearchParams({ limit: String(limit) });
  if (filters.schoolId) query.set("school_id", filters.schoolId);

  return {
    path: `/api/mobile/session-review-flags/?${query.toString()}`,
    init: {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${clerkSessionToken}`,
      },
    },
  };
}
