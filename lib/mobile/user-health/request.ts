export interface MobileUserHealthFilters {
  days: number;
  schoolId?: string | null;
}
export function buildUserHealthRequest(
  clerkSessionToken: string,
  filters: MobileUserHealthFilters
): { path: string; init: RequestInit } {
  if (!clerkSessionToken) throw new Error("A Clerk session token is required");
  if (!Number.isInteger(filters.days) || filters.days < 1 || filters.days > 90) {
    throw new RangeError("days must be an integer between 1 and 90");
  }

  const query = new URLSearchParams({ days: String(filters.days) });
  if (filters.schoolId) query.set("school_id", filters.schoolId);

  return {
    path: `/api/mobile/user-health/?${query.toString()}`,
    init: {
      cache: "no-store",
      headers: { Authorization: `Bearer ${clerkSessionToken}` },
    },
  };
}
