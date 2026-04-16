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
  letters_total_correct: number | null;
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
  children_count: number;
  flags: EaFlag[];
  children: EaChild[];
  recent_sessions: EaSession[];
  letter_mastery: EaLetterMastery[];
}

// --- AI Assistant types (matches Django ai_assistant serializers) ---

export interface EaSkippedLetter {
  letter: string;
  baseline_pct: number;
  sessions_taught: number;
}

export type EaAlignmentBand = "red" | "amber" | "green";

export interface EaAiSnapshotGroup {
  class_id: number;
  group_name_clean: string;
  grade: string;
  phase: "letters" | "blending";
  language: string;
  current_letter: string;
  progress_pct: number;
  letters_skipped: EaSkippedLetter[];
  letters_needed_next_3: string[];
  letters_still_needed: string[];
  avg_alignment_score: number | null;
  alignment_band: EaAlignmentBand | null;
  sessions_this_week: number;
  avg_sessions_per_week: number;
  last_session_date: string | null;
  days_since_last_session: number | null;
  flags: EaFlag[];
  children_count: number;
  last_3_sessions: Array<{
    date: string | null;
    letters_taught: string[];
    attendance_rate: number;
  }>;
  children_first_names: string[];
}

export interface EaAiSnapshot {
  ea: {
    name: string;
    primary_school: string;
    teampact_user_id: number;
  };
  today: {
    date_iso: string;
    day_of_week: string;
    last_updated_from_django: string | null;
  };
  groups: EaAiSnapshotGroup[];
  programme_position_summary: string;
}

export interface DailyBrief {
  brief_id: number;
  date: string;
  generation_index: number;
  model: string;
  content: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd_cents: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd_cents: number | null;
  tool_calls: unknown | null;
  created_at: string;
}

export interface AiUsageCounter {
  date: string;
  briefs_today: number;
  chat_messages_today: number;
  brief_cap: number;
  chat_cap: number;
}
