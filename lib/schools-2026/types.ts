import type { GroupSummary } from "@/lib/pm/types";

// ─── Enriched school data (schools-2026 + groups-2026 + sessions merged) ──

export interface EnrichedSchool2026 {
  school_name: string;
  school_type: string;
  ea_count: number;
  children_count: number;
  groups_count: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  latitude: number | null;
  longitude: number | null;

  // Computed from groups-2026
  eas: EADetail[];
  total_flags: number;
  flag_breakdown: FlagBreakdown;

  // Key metrics (school-level averages)
  weighted_dosage: number;          // = avg_sessions_per_group_per_week (per school)
  avg_per_day_worked: number | null; // from sessions-activity school_summary
}

export interface EADetail {
  name: string;
  user_id?: number | null;
  is_active?: boolean;
  groups_count: number;
  children_count: number;
  sessions_this_week: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  flags_count: number;
  has_flags: boolean;
  groups: EAGroupDetail[];

  // Per-EA computed metrics
  avg_per_day_worked: number | null;     // from heatmap: sessions / days_worked (recent)
  avg_per_programme_day: number | null;  // total_sessions / programme_work_days
  weighted_dosage: number;               // = avg_sessions_per_group_per_week
}

export interface EAGroupDetail {
  class_name: string;
  grade: string;
  phase: "letters" | "blending";
  current_letter: string;
  progress_pct: number;
  avg_sessions_per_week: number;
  flags: GroupSummary["flags"];
}

export interface FlagBreakdown {
  same_letter_group: number;
  moving_too_fast: number;
  ghost_group: number;
  stagnation: number;
  curriculum_gaps: number;
}
