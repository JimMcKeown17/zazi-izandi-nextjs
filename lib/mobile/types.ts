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
