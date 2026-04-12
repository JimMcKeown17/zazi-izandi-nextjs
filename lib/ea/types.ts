export type EaMetadata = {
  role?: string;
  teampact_user_id?: number;
  teampact_user_name?: string;
};

export type EaFlag =
  | "moving_too_fast"
  | "stagnation"
  | "curriculum_gaps"
  | "ghost_group";

export interface EaGroupBase {
  class_id: number | null;
  group_name: string;
  school_name: string;
  grade: string;
  phase: "letters" | "blending";
  children_count: number;
  sessions_this_week: number;
  total_sessions: number;
  last_session_date: string | null;
  avg_sessions_per_week: number;
  flags: EaFlag[];
  language: string;
}

export interface EaLetterGroup extends EaGroupBase {
  phase: "letters";
  current_letter: string;
  progress_index: number;
  progress_pct: number;
}

export interface EaBlendingGroup extends EaGroupBase {
  phase: "blending";
  blending_start_date: string | null;
}

export type EaGroup = EaLetterGroup | EaBlendingGroup;

export interface EaOverviewResponse {
  ea_name: string;
  primary_school: string;
  teampact_user_id: number;
  last_updated: string | null;
  groups: EaGroup[];
}
