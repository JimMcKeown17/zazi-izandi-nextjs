export interface MobileEAHeatmapRow {
  user_id: string;
  ea_name: string;
  current_school_id: string | null;
  current_school: string;
  employment_status: string | null;
  cells: number[];
  total_sessions: number;
  present_attendees: number;
  days_worked: number;
  avg_per_day_worked: number;
}

export interface SessionHeatmapDisplayRow {
  row_id: string;
  ea_name: string;
  school: string;
  employment_status: string | null;
  cells: number[];
  total_sessions: number;
}

export interface MobileSessionTrendPoint {
  date: string;
  primary: number;
  ecd: number;
  other: number;
  total: number;
}

export interface MobileSchoolOption {
  id: string;
  name: string;
  school_type: string | null;
}

export interface MobileSessionDistributionBucket {
  range: string;
  ea_count: number;
}

export interface MobileSessionSchoolSummary {
  school_id: string | null;
  current_school: string;
  school_type: string | null;
  total_sessions: number;
  sessions_this_week: number;
  active_eas: number;
  active_days: number;
  avg_sessions_per_day_per_ea: number;
  present_attendees: number;
}

export interface SessionSchoolDisplayRow {
  row_id: string;
  school_name: string;
  school_type: string | null;
  total_sessions: number;
  sessions_this_week: number;
  active_eas: number;
  active_days: number;
  avg_sessions_per_day_per_ea: number;
}

export interface MobileSessionsActivityResponse {
  generated_at: string;
  days: number;
  applied_filters: {
    school_id: string | null;
    school_type?: "ecd" | "primary" | null;
  };
  school_options: MobileSchoolOption[];
  daily_trend: MobileSessionTrendPoint[];
  ea_heatmap: {
    dates: string[];
    eas: MobileEAHeatmapRow[];
  };
  distribution: MobileSessionDistributionBucket[];
  school_summary: MobileSessionSchoolSummary[];
}

export const SESSION_REVIEW_REASON_CODE =
  "same_school_child_not_assigned_to_actor" as const;

export interface MobileSessionReviewFlag {
  session_id: string;
  child_id: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  submitting_ea_name: string;
  school_id: string;
  school_name: string;
  child_first_name: string;
  child_last_name: string;
  reason_code: typeof SESSION_REVIEW_REASON_CODE;
  created_at: string;
  last_observed_at: string;
}

export interface MobileSessionReviewFlagsResponse {
  count: number;
  flags: MobileSessionReviewFlag[];
}
