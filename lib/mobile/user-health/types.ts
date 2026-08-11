import type { MobileSchoolOption } from "../types";

export type MobileUserAuthState =
  | "ready"
  | "unconfirmed"
  | "banned"
  | "missing_email";

export type MobileUserDataExpectation =
  | "seeded"
  | "self_setup"
  | "unknown";

export interface MobileUserHealthRow {
  user_id: string;
  display_name: string;
  email: string | null;
  employment_status: string | null;
  current_school_id: string | null;
  current_school: string;
  auth: {
    state: MobileUserAuthState;
    created_at: string;
    last_sign_in_at: string | null;
  };
  app_device: {
    registered: boolean;
    platform: "ios" | "android" | null;
    app_version: string | null;
    last_seen_at: string | null;
  };
  data: {
    expectation: MobileUserDataExpectation;
    classes: number;
    children: number;
    groups: number;
    grouped_children: number;
    imported_assessments: number;
  };
  activity: {
    clock_entries: number;
    sessions: number;
    app_assessments: number;
    last_clock_in_at: string | null;
    last_session_at: string | null;
    last_app_assessment_at: string | null;
    last_activity_at: string | null;
  };
}
export interface MobileUserHealthResponse {
  generated_at: string;
  days: number;
  applied_filters: {
    school_id: string | null;
  };
  school_options: MobileSchoolOption[];
  summary: {
    total_users: number;
    auth_ready: number;
    signed_in_ever: number;
    registered_devices: number;
    seeded_expected: number;
    seeded_data_ready: number;
    active_in_window: number;
    needs_attention: number;
  };
  users: MobileUserHealthRow[];
}
