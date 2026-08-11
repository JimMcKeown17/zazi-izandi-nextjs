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
