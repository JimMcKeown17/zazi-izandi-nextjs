export type TeacherMetadata = {
  role: "teacher";
  teacher_id?: string;
  teacher_name?: string;
  teampact_user_ids: number[];
};

export interface ClassroomLetterCell {
  letter: string;
  children_mastered: number;
  children_total: number;
  mastery_pct: number;
  sessions_taught: number;
}

export interface ClassroomChild {
  participant_id: number;
  name: string;
  letters_total_correct: number | null;
  sessions_attended: number;
  sessions_total: number;
  attendance_rate: number;
}

export interface ClassroomAlignment {
  score: number;
  letters_on_target: number;
  letters_skipped: number;
  letters_teaching_known: number;
  flag_skipping_needed: boolean;
  flag_teaching_known: boolean;
}

export interface ClassroomSummary {
  teacher_display_name: string;
  school_name: string;
  grade: string;
  language: string;
  children_count: number;
  assessed_count: number;
  benchmark_threshold: number;
  pct_hitting_benchmark: number;
  pct_zero_letter: number;
  avg_lpm: number;
  letter_sequence: string[];
  letter_grid: ClassroomLetterCell[];
  children: ClassroomChild[];
  alignment: ClassroomAlignment | null;
  total_sessions: number;
  avg_attendance: number;
  last_session_date: string | null;
  assessment_cycle: "baseline" | "midline" | "endline";
  assessment_date_label: string;
}
