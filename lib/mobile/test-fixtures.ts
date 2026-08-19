import type { MobileSessionsActivityResponse } from "./types";

export const VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD = {
  generated_at: "2026-08-10T22:50:00.000Z",
  days: 2,
  applied_filters: { school_id: null },
  school_options: [
    {
      id: "a0c54f15-e176-42c5-ad0e-300947557005",
      name: "Charles Duna Primary",
      school_type: "Primary School",
    },
  ],
  daily_trend: [
    {
      date: "2026-08-09",
      primary: 0,
      ecd: 0,
      other: 0,
      total: 0,
    },
    {
      date: "2026-08-10",
      primary: 3,
      ecd: 0,
      other: 0,
      total: 3,
    },
  ],
  ea_heatmap: {
    dates: ["2026-08-10"],
    eas: [
      {
        user_id: "3eb26195-c9b4-41a2-a01d-3b341a28177e",
        ea_name: "Asemahle Mancayi",
        current_school_id: "a0c54f15-e176-42c5-ad0e-300947557005",
        current_school: "Charles Duna Primary",
        employment_status: "active",
        cells: [3],
        total_sessions: 3,
        present_attendees: 5,
        days_worked: 1,
        avg_per_day_worked: 3,
      },
    ],
  },
  distribution: [
    { range: "0", ea_count: 0 },
    { range: "1", ea_count: 0 },
    { range: "2", ea_count: 0 },
    { range: "3", ea_count: 1 },
    { range: "4", ea_count: 0 },
    { range: "5+", ea_count: 0 },
  ],
  school_summary: [
    {
      school_id: "a0c54f15-e176-42c5-ad0e-300947557005",
      current_school: "Charles Duna Primary",
      school_type: "Primary School",
      total_sessions: 3,
      sessions_this_week: 3,
      active_eas: 1,
      active_days: 1,
      avg_sessions_per_day_per_ea: 3,
      present_attendees: 5,
    },
  ],
} as const satisfies MobileSessionsActivityResponse;

export const VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD = {
  count: 1,
  flags: [
    {
      session_date: "2026-08-19",
      started_at: "2026-08-19T08:00:00.000Z",
      ended_at: "2026-08-19T08:30:00.000Z",
      submitting_ea_name: "Amahle Nkosi",
      school_id: "a0c54f15-e176-42c5-ad0e-300947557005",
      school_name: "Charles Duna Primary",
      child_first_name: "Sipho",
      child_last_name: "Dlamini",
      reason_code: "same_school_child_not_assigned_to_actor",
      created_at: "2026-08-19T08:31:00.000Z",
      last_observed_at: "2026-08-19T08:31:00.000Z",
    },
  ],
} as const;
