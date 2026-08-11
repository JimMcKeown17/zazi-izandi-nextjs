import type { MobileSchoolOption } from "../types";

export interface MobileTimeEntrySummary {
  total_entries: number;
  completed_entries: number;
  active_entries: number;
  automatic_clock_outs: number;
  eas_with_entries: number;
  completed_duration_minutes: number;
}
export interface MobileTimeEntryRow {
  id: string;
  user_id: string;
  ea_name: string;
  employment_status: string | null;
  current_school_id: string | null;
  current_school: string;
  local_date: string;
  sign_in_time: string;
  sign_out_time: string | null;
  duration_minutes: number | null;
  auto_clocked_out: boolean;
  is_active: boolean;
}

export interface MobileTimeEntriesActivityResponse {
  generated_at: string;
  days: number;
  applied_filters: {
    school_id: string | null;
  };
  school_options: MobileSchoolOption[];
  summary: MobileTimeEntrySummary;
  entries: MobileTimeEntryRow[];
}
