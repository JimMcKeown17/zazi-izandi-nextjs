import { z } from "zod";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const absoluteTimestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();

export const mobileTimeEntriesActivitySchema = z
  .object({
    generated_at: absoluteTimestamp,
    days: z.number().int().min(1).max(90),
    applied_filters: z.object({
      school_id: uuid.nullable(),
      // Optional so a legacy backend that predates the filter still decodes;
      // decodeMobileTimeEntriesActivityResponse then fails closed if the echo
      // does not confirm the requested school type.
      school_type: z.enum(["ecd", "primary"]).nullish(),
    }),
    school_options: z.array(
      z.object({
        id: uuid,
        name: z.string().min(1),
        school_type: z.string().nullable(),
      })
    ),
    summary: z.object({
      total_entries: count,
      completed_entries: count,
      active_entries: count,
      automatic_clock_outs: count,
      eas_with_entries: count,
      completed_duration_minutes: count,
    }),
    entries: z.array(
      z.object({
        id: uuid,
        user_id: uuid,
        ea_name: z.string().min(1),
        employment_status: z.string().nullable(),
        current_school_id: uuid.nullable(),
        current_school: z.string().min(1),
        local_date: date,
        sign_in_time: absoluteTimestamp,
        sign_out_time: absoluteTimestamp.nullable(),
        duration_minutes: count.nullable(),
        auto_clocked_out: z.boolean(),
        is_active: z.boolean(),
      })
    ),
  })
  .superRefine((value, context) => {
    const ids = new Set<string>();
    const users = new Set<string>();
    let completedEntries = 0;
    let activeEntries = 0;
    let automaticClockOuts = 0;
    let completedDurationMinutes = 0;

    value.entries.forEach((entry, index) => {
      if (ids.has(entry.id)) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "id"],
          message: "time-entry ids must be unique",
        });
      }
      ids.add(entry.id);
      users.add(entry.user_id);

      const hasCompletedFields =
        entry.sign_out_time !== null && entry.duration_minutes !== null;
      if (entry.is_active === hasCompletedFields) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "is_active"],
          message: "active state must match nullable clock-out fields",
        });
      }
      if (entry.is_active && entry.auto_clocked_out) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "auto_clocked_out"],
          message: "an open entry cannot already be automatically clocked out",
        });
      }
      if (
        entry.sign_out_time !== null &&
        Date.parse(entry.sign_out_time) < Date.parse(entry.sign_in_time)
      ) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "sign_out_time"],
          message: "clock-out cannot precede clock-in",
        });
      }

      if (entry.is_active) {
        activeEntries += 1;
      } else {
        completedEntries += 1;
        completedDurationMinutes += entry.duration_minutes ?? 0;
      }
      if (entry.auto_clocked_out) automaticClockOuts += 1;
    });

    const expectedSummary = {
      total_entries: value.entries.length,
      completed_entries: completedEntries,
      active_entries: activeEntries,
      automatic_clock_outs: automaticClockOuts,
      eas_with_entries: users.size,
      completed_duration_minutes: completedDurationMinutes,
    };

    for (const [key, expected] of Object.entries(expectedSummary)) {
      if (value.summary[key as keyof typeof value.summary] !== expected) {
        context.addIssue({
          code: "custom",
          path: ["summary", key],
          message: `${key} must reconcile with entries`,
        });
      }
    }
  });
