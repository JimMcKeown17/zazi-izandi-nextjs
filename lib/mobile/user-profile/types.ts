import type {
  MobileRolloutWave,
  MobileUserAuthState,
  MobileUserDataExpectation,
} from "../user-health/types";

export interface MobileUserProfileWindowedActivity {
  clock_entries: number;
  sessions: number;
  app_assessments: number;
  last_clock_in_at: string | null;
  last_session_at: string | null;
  last_app_assessment_at: string | null;
  last_activity_at: string | null;
}

export interface MobileUserProfileIdentity {
  display_name: string;
  employment_status: string | null;
  current_school_id: string | null;
  current_school: string;
  school_type: string | null;
  data_expectation: MobileUserDataExpectation;
}

export type MobileUserProfileWave = MobileRolloutWave;

export interface MobileUserProfileAppDevice {
  registered: boolean;
  platform: "ios" | "android" | null;
  app_version: string | null;
  last_seen_at: string | null;
}

export interface MobileUserProfileData {
  classes: number;
  children: number;
  groups: number;
  grouped_children: number;
  imported_assessments: number;
  children_assessed: number;
}

export interface MobileUserProfileLifetimeTotals {
  clock_entries: number;
  clock_days: number;
  clock_minutes_completed: number;
  sessions: number;
  app_assessments: number;
}

export interface MobileUserProfileLifetime {
  first_ever_activity_at: string | null;
  last_ever_activity_at: string | null;
  first_app_open_at: string | null;
  last_app_open_at: string | null;
  totals: MobileUserProfileLifetimeTotals;
}

export interface MobileUserProfileWeeklyRow {
  week_start: string;
  clock_days: number;
  clock_minutes_completed: number;
  sessions: number;
  app_assessments: number;
}

export interface MobileUserProfileRecentWeekdaySessions {
  dates: string[];
  cells: number[];
}

export interface MobileUserProfileRecentSession {
  session_date: string;
  started_at: string | null;
  duration_seconds: number | null;
  group_name: string | null;
  letters_focused: string[] | null;
  blend_categories: string[] | null;
  present_attendees: number;
  notes: string | null;
}

export interface MobileUserProfileClockEntry {
  local_date: string;
  sign_in_time: string;
  sign_out_time: string | null;
  duration_minutes: number | null;
  auto_clocked_out: boolean;
  is_active: boolean;
}

export interface MobileUserProfileAuth {
  state: MobileUserAuthState;
  created_at: string;
  last_sign_in_at: string | null;
  provisioning_cutoff_at: string | null;
  authenticated_after_provisioning: boolean | null;
}

export interface MobileUserProfileResponse {
  generated_at: string;
  user_id: string;
  days: number;
  windowed_activity: MobileUserProfileWindowedActivity;
  identity: MobileUserProfileIdentity | null;
  wave: MobileUserProfileWave | null;
  app_device: MobileUserProfileAppDevice;
  ever_registered_device: boolean;
  data: MobileUserProfileData;
  lifetime: MobileUserProfileLifetime;
  weekly: MobileUserProfileWeeklyRow[];
  recent_weekday_sessions: MobileUserProfileRecentWeekdaySessions;
  recent_sessions: MobileUserProfileRecentSession[];
  clock_entries: MobileUserProfileClockEntry[];
  auth: MobileUserProfileAuth;
  email: string | null;
}
