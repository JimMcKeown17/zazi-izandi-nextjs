// ─── Programme Overview API Response ───────────────────────────

export interface ProgrammeOverviewResponse {
  generated_at: string;
  programme: {
    year: number;
    start_date: string;
    end_date: string;
    current_week: number;
    total_weeks: number;
    teaching_start_date: string;
    teaching_week: number;
    teaching_total_weeks: number;
  };
  targets: ProgrammeTargets;
  kpis: ProgrammeKPIs;
  health: HealthSignal;
  data_health: DataHealth;
  sessions_time_series: SessionTimeSeriesPoint[];
  dosage_distribution: DosageBucket[];
}

export interface ProgrammeTargets {
  dosage: number;
  on_track_pct: number;
  flag_resolution_pct: number;
  assessment_coverage_pct: number;
  mentor_coverage_days: number;
}

export interface ProgrammeKPIs {
  total_schools: number;
  total_schools_primary: number;
  total_schools_ecd: number;
  total_eas: number;
  total_children: number;
  weighted_dosage: number;
  on_track_group_rate: number;
  total_sessions_this_week: number;
  total_sessions_this_month: number;
  total_sessions_all_time: number;
  active_flags: number;
  flags_delta_week: number;
  flag_resolution_rate_14d: number;
  flag_lifecycle: {
    new: number;
    acknowledged: number;
    in_progress: number;
    resolved_this_week: number;
  };
}

export interface HealthSignal {
  score: number;
  status: "healthy" | "needs_attention" | "action_required";
  components: {
    dosage: number;
    on_track: number;
    flags: number;
    resolution: number;
  };
}

export interface DataHealth {
  freshness_hours: number;
  last_sync: string;
  join_match_rate: number;
}

export interface SessionTimeSeriesPoint {
  date: string;
  primary: number;
  ecd: number;
  total: number;
}

export interface DosageBucket {
  range: string;
  count: number;
}

export interface SchoolPerformanceRow {
  school_name: string;
  school_type: string;
  ea_count: number;
  children_count: number;
  groups_count: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  flags_count: number;
}

export interface SchoolDetailResponse {
  school_name: string;
  school_type: string;
  ea_count: number;
  children_count: number;
  groups_count: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  eas: EASummary[];
  flags: SchoolFlag[];
  recent_sessions: RecentSessionDay[];
}

export interface EASummary {
  name: string;
  groups_count: number;
  children_count: number;
  total_sessions: number;
  sessions_this_week: number;
  avg_sessions_per_group_per_week: number;
  flags_count: number;
}

export interface SchoolFlag {
  flag_type: string;
  entity: string;
  detail: string;
  status: string;
}

export interface RecentSessionDay {
  date: string;
  session_count: number;
}

export interface PMNavItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
}
