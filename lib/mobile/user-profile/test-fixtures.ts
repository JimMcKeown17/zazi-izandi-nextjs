import type { MobileUserProfileResponse } from "./types";

export const PROFILE_GENERATED_AT = "2026-08-16T22:30:00+00:00";

const SAST_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addCalendarDays(date: string, days: number): string {
  return toIsoDate(new Date(Date.parse(date) + days * MS_PER_DAY));
}

function getSastCalendarDate(timestamp: string): string {
  return SAST_DATE_FORMAT.format(new Date(timestamp));
}

function deriveWeeklyRows(generatedAt: string) {
  const generatedDate = getSastCalendarDate(generatedAt);
  const generatedDay = new Date(`${generatedDate}T00:00:00Z`).getUTCDay();
  const currentMonday = addCalendarDays(
    generatedDate,
    -((generatedDay + 6) % 7)
  );

  return Array.from({ length: 26 }, (_, index) => ({
    week_start: addCalendarDays(currentMonday, (index - 25) * 7),
    clock_days: index === 25 ? 3 : index === 24 ? 2 : 0,
    clock_minutes_completed: index === 25 ? 180 : index === 24 ? 95 : 0,
    sessions: index === 25 ? 4 : index === 24 ? 3 : 0,
    app_assessments: index === 25 ? 5 : index === 24 ? 1 : 0,
  }));
}

function deriveRecentWeekdays(generatedAt: string): string[] {
  let cursor = getSastCalendarDate(generatedAt);
  const dates: string[] = [];
  while (dates.length < 10) {
    const day = new Date(`${cursor}T00:00:00Z`).getUTCDay();
    if (day >= 1 && day <= 5) dates.unshift(cursor);
    cursor = addCalendarDays(cursor, -1);
  }
  return dates;
}

const weekly = deriveWeeklyRows(PROFILE_GENERATED_AT);
const recentWeekdays = deriveRecentWeekdays(PROFILE_GENERATED_AT);

export const VALID_MOBILE_USER_PROFILE_PAYLOAD = {
  generated_at: PROFILE_GENERATED_AT,
  user_id: "3eb26195-c9b4-41a2-a01d-3b341a28177e",
  days: 30,
  windowed_activity: {
    clock_entries: 3,
    sessions: 3,
    app_assessments: 2,
    last_clock_in_at: "2026-08-16T20:00:00+00:00",
    last_session_at: "2026-08-16T09:00:00+00:00",
    last_app_assessment_at: "2026-08-16T21:00:00+00:00",
    last_activity_at: "2026-08-16T21:00:00+00:00",
  },
  identity: {
    display_name: "Asemahle M",
    employment_status: "active",
    current_school_id: "a0c54f15-e176-42c5-ad0e-300947557005",
    current_school: "Charles Duna Primary",
    school_type: "Primary School",
    data_expectation: "seeded",
  },
  wave: {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "ZZ Primary 2026",
    launch_date: "2026-08-08",
  },
  app_device: {
    registered: true,
    platform: "android",
    app_version: "1.1.1",
    last_seen_at: "2026-08-16T20:30:00+00:00",
  },
  ever_registered_device: true,
  data: {
    classes: 1,
    children: 3,
    groups: 1,
    grouped_children: 3,
    imported_assessments: 3,
    children_assessed: 2,
  },
  lifetime: {
    first_ever_activity_at: "2026-05-01T08:00:00+00:00",
    last_ever_activity_at: "2026-08-16T21:00:00+00:00",
    first_app_open_at: "2026-08-09T06:45:00+00:00",
    last_app_open_at: "2026-08-16T20:30:00+00:00",
    totals: {
      clock_entries: 30,
      clock_days: 15,
      clock_minutes_completed: 720,
      sessions: 40,
      app_assessments: 12,
    },
  },
  weekly,
  recent_weekday_sessions: {
    dates: recentWeekdays,
    cells: [0, 1, 2, 0, 3, 1, 0, 2, 1, 4],
  },
  recent_sessions: [
    {
      session_date: "2026-08-16",
      started_at: "2026-08-16T09:00:00+00:00",
      duration_seconds: 3_600,
      group_name: "Blue Group",
      letters_focused: ["a", "b"],
      blend_categories: null,
      present_attendees: 3,
      notes: "Strong participation",
    },
    {
      session_date: "2026-08-15",
      started_at: "2026-08-15T08:00:00+00:00",
      duration_seconds: 2_700,
      group_name: "Green Group",
      letters_focused: null,
      blend_categories: ["short vowels"],
      present_attendees: 2,
      notes: null,
    },
    {
      session_date: "2026-08-14",
      started_at: null,
      duration_seconds: null,
      group_name: "Legacy fallback group",
      letters_focused: null,
      blend_categories: null,
      present_attendees: 1,
      notes: "Legacy session",
    },
  ],
  clock_entries: [
    {
      local_date: "2026-08-16",
      sign_in_time: "2026-08-16T20:00:00+00:00",
      sign_out_time: null,
      duration_minutes: null,
      auto_clocked_out: false,
      is_active: true,
    },
    {
      local_date: "2026-08-16",
      sign_in_time: "2026-08-16T05:00:00+00:00",
      sign_out_time: "2026-08-16T06:30:00+00:00",
      duration_minutes: 90,
      auto_clocked_out: false,
      is_active: false,
    },
    {
      local_date: "2026-08-15",
      sign_in_time: "2026-08-15T06:00:00+00:00",
      sign_out_time: "2026-08-15T08:00:00+00:00",
      duration_minutes: 120,
      auto_clocked_out: true,
      is_active: false,
    },
  ],
  auth: {
    state: "ready",
    created_at: "2026-08-07T10:00:00+00:00",
    last_sign_in_at: "2026-08-16T20:20:00+00:00",
    provisioning_cutoff_at: "2026-08-08T02:59:03.524181+00:00",
    authenticated_after_provisioning: true,
  },
  email: "asemahle@example.org",
} satisfies MobileUserProfileResponse;

export const QUIET_MOBILE_USER_PROFILE_PAYLOAD: MobileUserProfileResponse = {
  ...structuredClone(VALID_MOBILE_USER_PROFILE_PAYLOAD),
  windowed_activity: {
    clock_entries: 0,
    sessions: 0,
    app_assessments: 0,
    last_clock_in_at: null,
    last_session_at: null,
    last_app_assessment_at: null,
    last_activity_at: null,
  },
};
