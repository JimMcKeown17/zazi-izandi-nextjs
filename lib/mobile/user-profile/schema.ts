import { z } from "zod";

const uuid = z.string().uuid();
const absoluteTimestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
const nullableTimestamp = absoluteTimestamp.nullable();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const waveSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  launch_date: z.iso.date(),
});

const activitySchema = z.object({
  clock_entries: count,
  sessions: count,
  app_assessments: count,
  last_clock_in_at: nullableTimestamp,
  last_session_at: nullableTimestamp,
  last_app_assessment_at: nullableTimestamp,
  last_activity_at: nullableTimestamp,
});

const identitySchema = z.object({
  display_name: z.string().min(1),
  employment_status: z.string().nullable(),
  current_school_id: uuid.nullable(),
  current_school: z.string().min(1),
  school_type: z.string().nullable(),
  data_expectation: z.enum(["seeded", "self_setup", "unknown"]),
});

const appDeviceSchema = z.object({
  registered: z.boolean(),
  platform: z.enum(["ios", "android"]).nullable(),
  app_version: z.string().min(1).nullable(),
  last_seen_at: nullableTimestamp,
});

const dataSchema = z.object({
  classes: count,
  children: count,
  groups: count,
  grouped_children: count,
  imported_assessments: count,
  children_assessed: count,
});

const lifetimeTotalsSchema = z.object({
  clock_entries: count,
  clock_days: count,
  clock_minutes_completed: count,
  sessions: count,
  app_assessments: count,
});

const lifetimeSchema = z.object({
  first_ever_activity_at: nullableTimestamp,
  last_ever_activity_at: nullableTimestamp,
  first_app_open_at: nullableTimestamp,
  last_app_open_at: nullableTimestamp,
  totals: lifetimeTotalsSchema,
});

const weeklyRowSchema = z.object({
  week_start: z.iso.date(),
  clock_days: count,
  clock_minutes_completed: count,
  sessions: count,
  app_assessments: count,
});

const recentSessionSchema = z.object({
  session_date: z.iso.date(),
  started_at: nullableTimestamp,
  duration_seconds: count.nullable(),
  group_name: z.string().nullable(),
  letters_focused: z.array(z.string()).nullable(),
  blend_categories: z.array(z.string()).nullable(),
  present_attendees: count,
  notes: z.string().nullable(),
});

const clockEntrySchema = z.object({
  local_date: z.iso.date(),
  sign_in_time: absoluteTimestamp,
  sign_out_time: nullableTimestamp,
  duration_minutes: count.nullable(),
  auto_clocked_out: z.boolean(),
  is_active: z.boolean(),
});

const authSchema = z.object({
  state: z.enum(["ready", "unconfirmed", "banned", "missing_email"]),
  created_at: absoluteTimestamp,
  last_sign_in_at: nullableTimestamp,
  provisioning_cutoff_at: nullableTimestamp,
  authenticated_after_provisioning: z.boolean().nullable(),
});

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addCalendarDays(date: string, days: number): string {
  return toIsoDate(new Date(Date.parse(date) + days * MS_PER_DAY));
}

function getSastCalendarDate(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getExpectedWeekStarts(generatedAt: string): string[] {
  const generatedDate = getSastCalendarDate(generatedAt);
  const generatedDay = new Date(`${generatedDate}T00:00:00Z`).getUTCDay();
  const currentMonday = addCalendarDays(
    generatedDate,
    -((generatedDay + 6) % 7)
  );
  return Array.from({ length: 26 }, (_, index) =>
    addCalendarDays(currentMonday, (index - 25) * 7)
  );
}

function getExpectedRecentWeekdays(generatedAt: string): string[] {
  let cursor = getSastCalendarDate(generatedAt);
  const dates: string[] = [];
  while (dates.length < 10) {
    const day = new Date(`${cursor}T00:00:00Z`).getUTCDay();
    if (day >= 1 && day <= 5) dates.unshift(cursor);
    cursor = addCalendarDays(cursor, -1);
  }
  return dates;
}

function timestampsMatch(
  left: string | null,
  right: string | null
): boolean {
  if (left === null || right === null) return left === right;
  return new Date(left).getTime() === new Date(right).getTime();
}

export const mobileUserProfileSchema = z
  .object({
    generated_at: absoluteTimestamp,
    user_id: uuid,
    days: z.number().int(),
    windowed_activity: activitySchema,
    identity: identitySchema.nullable(),
    wave: waveSchema.nullable(),
    app_device: appDeviceSchema,
    ever_registered_device: z.boolean(),
    data: dataSchema,
    lifetime: lifetimeSchema,
    weekly: z.array(weeklyRowSchema).length(26),
    recent_weekday_sessions: z.object({
      dates: z.array(z.iso.date()).length(10),
      cells: z.array(count).length(10),
    }),
    recent_sessions: z.array(recentSessionSchema).max(20),
    clock_entries: z.array(clockEntrySchema).max(100),
    auth: authSchema,
    email: z.email().nullable(),
  })
  .superRefine((value, context) => {
    if (value.days !== 30) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "profile activity window must be 30 days",
      });
    }

    const expectedWeeks = getExpectedWeekStarts(value.generated_at);
    value.weekly.forEach((row, index) => {
      if (row.week_start !== expectedWeeks[index]) {
        context.addIssue({
          code: "custom",
          path: ["weekly", index, "week_start"],
          message: "weekly buckets must match the generated SAST week",
        });
      }
    });

    const expectedWeekdays = getExpectedRecentWeekdays(value.generated_at);
    value.recent_weekday_sessions.dates.forEach((date, index) => {
      if (date !== expectedWeekdays[index]) {
        context.addIssue({
          code: "custom",
          path: ["recent_weekday_sessions", "dates", index],
          message: "weekday strip must match the generated SAST date",
        });
      }
    });

    const sourcePairs = [
      ["clock_entries", "last_clock_in_at"],
      ["sessions", "last_session_at"],
      ["app_assessments", "last_app_assessment_at"],
    ] as const;
    for (const [countKey, timestampKey] of sourcePairs) {
      const hasCount = value.windowed_activity[countKey] > 0;
      const hasTimestamp = value.windowed_activity[timestampKey] !== null;
      if (hasCount !== hasTimestamp) {
        context.addIssue({
          code: "custom",
          path: ["windowed_activity", timestampKey],
          message: `${timestampKey} must match ${countKey}`,
        });
      }
    }

    const sourceTimestamps = [
      value.windowed_activity.last_clock_in_at,
      value.windowed_activity.last_session_at,
      value.windowed_activity.last_app_assessment_at,
    ].filter((timestamp): timestamp is string => timestamp !== null);
    const expectedLastActivity = sourceTimestamps.reduce<string | null>(
      (latest, timestamp) =>
        latest === null || new Date(timestamp) > new Date(latest)
          ? timestamp
          : latest,
      null
    );
    if (
      !timestampsMatch(
        value.windowed_activity.last_activity_at,
        expectedLastActivity
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["windowed_activity", "last_activity_at"],
        message: "last activity must be the newest windowed source timestamp",
      });
    }

    const firstLifetime = value.lifetime.first_ever_activity_at;
    const lastLifetime = value.lifetime.last_ever_activity_at;
    if ((firstLifetime === null) !== (lastLifetime === null)) {
      context.addIssue({
        code: "custom",
        path: ["lifetime", "last_ever_activity_at"],
        message: "lifetime activity bounds must have matching nullity",
      });
    }
    if (
      firstLifetime !== null &&
      lastLifetime !== null &&
      new Date(firstLifetime) > new Date(lastLifetime)
    ) {
      context.addIssue({
        code: "custom",
        path: ["lifetime", "last_ever_activity_at"],
        message: "lifetime activity bounds must be ordered",
      });
    }
    if (
      value.windowed_activity.last_activity_at !== null &&
      (lastLifetime === null ||
        new Date(value.windowed_activity.last_activity_at) >
          new Date(lastLifetime))
    ) {
      context.addIssue({
        code: "custom",
        path: ["lifetime", "last_ever_activity_at"],
        message: "lifetime activity must cover windowed activity",
      });
    }

    const firstAppOpen = value.lifetime.first_app_open_at;
    const lastAppOpen = value.lifetime.last_app_open_at;
    if ((firstAppOpen === null) !== (lastAppOpen === null)) {
      context.addIssue({
        code: "custom",
        path: ["lifetime", "last_app_open_at"],
        message: "app open bounds must have matching nullity",
      });
    }
    if (
      firstAppOpen !== null &&
      lastAppOpen !== null &&
      new Date(firstAppOpen) > new Date(lastAppOpen)
    ) {
      context.addIssue({
        code: "custom",
        path: ["lifetime", "last_app_open_at"],
        message: "app open bounds must be ordered",
      });
    }

    const deviceEvidenceComplete =
      value.app_device.platform !== null &&
      value.app_device.last_seen_at !== null;
    if (value.app_device.registered !== deviceEvidenceComplete) {
      context.addIssue({
        code: "custom",
        path: ["app_device"],
        message: "registered device state must match its evidence fields",
      });
    }
    if (value.app_device.registered && !value.ever_registered_device) {
      context.addIssue({
        code: "custom",
        path: ["ever_registered_device"],
        message: "a registered device requires lifetime device evidence",
      });
    }

    const cutoffAt = value.auth.provisioning_cutoff_at;
    const authenticationResult = value.auth.authenticated_after_provisioning;
    if (cutoffAt === null) {
      if (authenticationResult !== null) {
        context.addIssue({
          code: "custom",
          path: ["auth", "authenticated_after_provisioning"],
          message: "unmeasured authentication must not have a result",
        });
      }
    } else {
      const expectedAuthenticationResult =
        value.auth.last_sign_in_at !== null &&
        new Date(value.auth.last_sign_in_at) > new Date(cutoffAt);
      if (authenticationResult !== expectedAuthenticationResult) {
        context.addIssue({
          code: "custom",
          path: ["auth", "authenticated_after_provisioning"],
          message: "authentication result must match the rollout cutoff",
        });
      }
    }

    if (value.data.grouped_children > value.data.children) {
      context.addIssue({
        code: "custom",
        path: ["data", "grouped_children"],
        message: "grouped children cannot exceed owned children",
      });
    }
    if (value.data.children_assessed > value.data.children) {
      context.addIssue({
        code: "custom",
        path: ["data", "children_assessed"],
        message: "assessed children cannot exceed owned children",
      });
    }

    value.recent_sessions.forEach((session, index) => {
      if (
        session.letters_focused !== null &&
        session.blend_categories !== null
      ) {
        context.addIssue({
          code: "custom",
          path: ["recent_sessions", index, "blend_categories"],
          message: "session focus fields are mutually exclusive",
        });
      }
    });

    value.clock_entries.forEach((entry, index) => {
      const hasNoSignOut = entry.sign_out_time === null;
      const hasNoDuration = entry.duration_minutes === null;
      if (
        entry.is_active !== hasNoSignOut ||
        entry.is_active !== hasNoDuration
      ) {
        context.addIssue({
          code: "custom",
          path: ["clock_entries", index],
          message: "clock active state must match sign-out and duration fields",
        });
      }
      if (
        entry.sign_out_time !== null &&
        new Date(entry.sign_out_time) < new Date(entry.sign_in_time)
      ) {
        context.addIssue({
          code: "custom",
          path: ["clock_entries", index, "sign_out_time"],
          message: "clock sign-out cannot precede sign-in",
        });
      }
    });
  });
