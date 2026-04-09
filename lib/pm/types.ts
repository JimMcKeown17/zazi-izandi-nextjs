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
  avg_sessions_per_day_worked: number;
  pct_eas_on_track: number;
  avg_sessions_per_programme_day: number;
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

export interface PMNavItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
}

// ─── Sessions Activity API Response ───────────────────────────

export interface SessionsActivityResponse {
  generated_at: string;
  days: number;
  daily_trend: SessionTimeSeriesPoint[];
  ea_heatmap: {
    dates: string[];
    eas: EAHeatmapRow[];
  };
  distribution: SessionDistributionBucket[];
  school_summary: SessionSchoolSummary[];
}

export interface EAHeatmapRow {
  ea_name: string;
  school: string;
  cells: number[];
  total_sessions?: number;
  days_worked?: number;
  avg_per_day_worked?: number | null;
}

export interface SessionDistributionBucket {
  range: string;
  ea_count: number;
}

export interface SessionSchoolSummary {
  school_name: string;
  school_type: string;
  total_sessions: number;
  sessions_this_week: number;
  active_eas: number;
  active_days: number;
  avg_sessions_per_day_per_ea: number;
}

// ─── Groups 2026 API Response ─────────────────────────────────

export interface Groups2026Response {
  generated_at: string;
  summary: {
    total_groups: number;
    letters_groups: number;
    blending_groups: number;
    total_children: number;
    total_sessions_this_week: number;
  };
  groups: GroupSummary[];
}

export interface GroupSummary {
  program_name: string;
  class_name: string;
  ea_name: string;
  language: string;
  grade: string;
  phase: "letters" | "blending";
  blending_start_date: string | null;
  children_count: number;
  children_names: string[];
  current_letter: string;
  progress_index: number;
  progress_pct: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_week: number;
  last_session_date: string | null;
  flags: {
    same_letter_group: boolean;
    moving_too_fast: boolean;
    ghost_group: boolean;
    stagnation: boolean;
    curriculum_gaps: boolean;
    teaching_known?: boolean;
    skipping_needed?: boolean;
  };
  // Alignment aggregates (from ChildLetterAlignment2026)
  alignment_avg_score?: number | null;
  children_with_skips?: number;
  children_assessed?: number;
  children_total?: number;
}

// ─── Flag Evidence API Response ───────────────────────────────

export interface FlagEvidenceResponse {
  program_name: string;
  class_name: string;
  language: string;
  sessions: FlagEvidenceSession[];
  all_letters_taught: string[];
  letter_sequence: string[];
  gaps: string[];
  transitions: FlagEvidenceTransition[];
  transition_summary: {
    total: number;
    no_review: number;
    pct_no_review: number;
  };
  stagnation: {
    recent_weeks: { sessions: number; max_progress_index: number; max_letter: string };
    prior_weeks: { sessions: number; max_progress_index: number; max_letter: string };
    is_stagnant: boolean;
  };
}

export interface FlagEvidenceSession {
  date: string;
  session_id: number;
  letters_taught: string[];
  max_progress_index: number;
}

export interface FlagEvidenceTransition {
  from_date: string;
  to_date: string;
  from_letters: string[];
  to_letters: string[];
  overlap: boolean;
}

// ─── Letter Alignment API Response ──────────────────────────

export interface ChildLetterAlignment {
  participant_id: number;
  assessment_date: string | null;
  letters_mastered: string[];
  letters_needed: string[];
  letters_taught: string[];
  letters_skipped: string[];
  teaching_known_letters: string[];
  alignment_score: number;
  flag_skipping_needed: boolean;
  flag_teaching_known: boolean;
}

export interface LetterAlignmentGroupSummary {
  program_name: string;
  class_name: string;
  language: string;
  letter_sequence: string[];
  letters_taught: string[];
  current_teaching_index: number;
  children_assessed: number;
  children_total: number;
  alignment_avg_score: number;
  flag_teaching_known: boolean;
  flag_skipping_needed: boolean;
}

export interface LetterAlignmentResponse {
  group_summary: LetterAlignmentGroupSummary;
  children: ChildLetterAlignment[];
}

// ─── Assessments Summary API Response ──────────────────────────

export interface AssessmentsSummaryResponse {
  generated_at: string;
  available_grades: string[];
  selected_grade: string;
  overview: {
    total_assessed: number;
    avg_lcpm: number;
    avg_wcpm: number;
    avg_nonwords: number;
    pct_zero_letters: number;
    pct_at_benchmark: number;
    stop_rule_rate: number;
    completion_rate: number;
  };
  by_cohort: AssessmentCohortRow[];
  by_language: AssessmentLanguageRow[];
  score_distribution: ScoreDistributionBucket[];
  by_school: AssessmentSchoolRow[];
}

export interface AssessmentCohortRow {
  cohort: string;
  count: number;
  avg_lcpm: number;
  pct_zero: number;
  pct_at_benchmark: number;
}

export interface AssessmentLanguageRow {
  language: string;
  count: number;
  avg_lcpm: number;
}

export interface ScoreDistributionBucket {
  bucket: number;
  count: number;
}

export interface AssessmentSchoolRow {
  school: string;
  cohort: string;
  count: number;
  avg_lcpm: number;
  pct_zero: number;
  pct_at_benchmark: number;
}

// ─── Mentor Visits Summary API Response ────────────────────────

export interface MentorVisitsSummaryResponse {
  generated_at: string;
  overview: {
    total_visits: number;
    unique_mentors: number;
    schools_visited: number;
    eas_observed: number;
  };
  compliance: Record<string, { yes: number; no: number; not_observed: number }>;
  quality_ratings: Record<string, Record<string, number>>;
  visits_over_time: VisitsTimeSeriesPoint[];
  by_mentor: MentorRow[];
  flagged_eas: FlaggedEARow[];
  coverage: CoverageData;
}

export interface VisitsTimeSeriesPoint {
  week_start: string;
  visits: number;
}

export interface MentorRow {
  mentor: string;
  visits: number;
  schools_visited: number;
  avg_quality_score: number | null;
}

export interface FlaggedEARow {
  ea_name: string;
  school: string;
  mentor: string;
  issue: string;
  visit_date: string | null;
}

export interface CoverageData {
  schools_visited_14d: number;
  total_schools: number;
  coverage_rate: number;
  gaps: CoverageGap[];
}

export interface CoverageGap {
  school: string;
  last_visit: string | null;
  days_since: number | null;
}

// ─── EA Performance API Response ──────────────────────────────

export interface EAPerformanceResponse {
  generated_at: string;
  summary: {
    total_eas: number;
    avg_sessions_per_programme_day: number;
    avg_alignment_score: number;
    quadrant_counts: {
      top_right: number;
      top_left: number;
      bottom_right: number;
      bottom_left: number;
    };
  };
  eas: EAPerformanceItem[];
}

export interface EAPerformanceItem {
  ea_name: string;
  school: string;
  sessions_per_programme_day: number;
  alignment_avg_score: number | null;
  total_sessions: number;
  groups_count: number;
  letters_groups_count: number;
  blending_groups_count: number;
  children_count: number;
  active_flags_count: number;
  groups: EAGroupDetail[];
}

export interface EAGroupDetail {
  class_name: string;
  phase: "letters" | "blending";
  children_count: number;
  avg_sessions_per_week: number;
  alignment_avg_score: number | null;
  flags: string[];
}
