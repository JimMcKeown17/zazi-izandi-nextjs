import type {
  MobileEAHeatmapRow,
  MobileSessionSchoolSummary,
  SessionHeatmapDisplayRow,
  SessionSchoolDisplayRow,
} from "./types";

export interface SchoolTypeDisplay {
  label: string;
  kind: "ecd" | "primary" | "other" | "unknown";
}

export interface EmploymentStatusDisplay {
  label: string;
  kind: "active" | "inactive" | "resigned" | "other" | "unknown";
}

export function getEmploymentStatusDisplay(
  employmentStatus: string | null | undefined
): EmploymentStatusDisplay | null {
  if (employmentStatus === undefined) return null;
  if (employmentStatus === null) {
    return { label: "Status unknown", kind: "unknown" };
  }

  const trimmed = employmentStatus.trim();
  const normalized = trimmed.toLowerCase();
  if (!normalized) return { label: "Status unknown", kind: "unknown" };
  if (normalized === "active") return { label: "Active", kind: "active" };
  if (normalized === "inactive") {
    return { label: "Inactive", kind: "inactive" };
  }
  if (normalized === "resigned") {
    return { label: "Resigned", kind: "resigned" };
  }

  return { label: trimmed, kind: "other" };
}

export function getSchoolTypeDisplay(
  schoolType: string | null
): SchoolTypeDisplay {
  if (schoolType === null) return { label: "—", kind: "unknown" };

  const trimmed = schoolType.trim();
  const normalized = trimmed.toLowerCase();
  if (normalized === "ecd") return { label: "ECD", kind: "ecd" };
  if (normalized === "primary" || normalized === "primary school") {
    return { label: "Primary", kind: "primary" };
  }

  return { label: trimmed || "—", kind: trimmed ? "other" : "unknown" };
}

export function toHeatmapDisplayRows(
  rows: MobileEAHeatmapRow[]
): SessionHeatmapDisplayRow[] {
  return rows.map((row) => ({
    row_id: row.user_id,
    ea_name: row.ea_name,
    school: row.current_school,
    employment_status: row.employment_status,
    cells: row.cells,
    total_sessions: row.total_sessions,
  }));
}

export function shouldShowOtherTrend<T extends { other?: number }>(
  data: readonly T[]
): boolean {
  return data.some((point) => (point.other ?? 0) > 0);
}

export function toSchoolSummaryDisplayRows(
  rows: MobileSessionSchoolSummary[]
): SessionSchoolDisplayRow[] {
  return rows.map((row) => ({
    row_id: row.school_id ?? "unattributed",
    school_name: row.current_school,
    school_type: row.school_type,
    total_sessions: row.total_sessions,
    sessions_this_week: row.sessions_this_week,
    active_eas: row.active_eas,
    active_days: row.active_days,
    avg_sessions_per_day_per_ea: row.avg_sessions_per_day_per_ea,
  }));
}
