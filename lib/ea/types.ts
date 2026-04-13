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

// --- Phase 1C: Group Detail types ---

export interface EaChildAlignment {
  flag_teaching_known: boolean;
  flag_skipping_needed: boolean;
  teaching_known_letters: string[];
  letters_skipped: string[];
  alignment_score: number;
}

export interface EaChild {
  participant_id: number;
  name: string;
  sessions_attended: number;
  sessions_total: number;
  attendance_rate: number;
  last_attended: string | null;
  alignment: EaChildAlignment | null;
}

export interface EaLetterMastery {
  letter: string;
  children_mastered: number;
  children_total: number;
  mastery_pct: number;
  sessions_taught: number;
}

export interface EaSessionAttendee {
  participant_id: number;
  name: string;
  present: boolean;
}

export interface EaSession {
  session_id: number;
  date: string | null;
  letters_taught: string[];
  attendance_count: number;
  attendance_total: number;
  notes: string;
  attendees: EaSessionAttendee[];
}

export interface EaGroupProgress {
  current_letter: string;
  progress_index: number;
  progress_pct: number;
}

export interface EaGroupDetail {
  class_id: number | null;
  group_name: string;
  school_name: string;
  grade: string;
  phase: "letters" | "blending";
  language: string;
  progress: EaGroupProgress;
  avg_sessions_per_week: number;
  sessions_this_week: number;
  total_sessions: number;
  flags: EaFlag[];
  children: EaChild[];
  recent_sessions: EaSession[];
  letter_mastery: EaLetterMastery[];
}
