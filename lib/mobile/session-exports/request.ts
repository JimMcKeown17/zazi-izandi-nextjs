import type { SessionExportKind } from "./transport";
import { sessionExportConfig } from "./transport";

export type SessionExportFilters = {
  startDate: string;
  endDate: string;
  schoolId: string | null;
  schoolType: "ecd" | "primary" | null;
};

export function buildSessionExportRequest(
  kind: SessionExportKind,
  token: string,
  filters: SessionExportFilters
): { path: string; init: RequestInit } {
  const query = new URLSearchParams({
    start_date: filters.startDate,
    end_date: filters.endDate,
  });
  if (filters.schoolId) query.set("school_id", filters.schoolId);
  if (filters.schoolType) query.set("school_type", filters.schoolType);
  return {
    path: `/api/mobile/exports/sessions/${sessionExportConfig(kind).djangoSlug}/?${query.toString()}`,
    init: {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  };
}
