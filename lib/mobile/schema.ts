import { z } from "zod";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const absoluteTimestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
const metric = z.number().finite().nonnegative();

const trendPoint = z.object({
  date,
  primary: count,
  ecd: count,
  other: count,
  total: count,
});

const heatmapRow = z.object({
  user_id: uuid,
  ea_name: z.string().min(1),
  current_school_id: uuid.nullable(),
  current_school: z.string().min(1),
  employment_status: z.string().nullable(),
  cells: z.array(count),
  total_sessions: count,
  present_attendees: count,
  days_worked: count,
  avg_per_day_worked: metric,
});

export const mobileSessionsActivitySchema = z
  .object({
    generated_at: absoluteTimestamp,
    days: z.number().int().min(1).max(90),
    applied_filters: z.object({ school_id: uuid.nullable() }),
    school_options: z.array(
      z.object({
        id: uuid,
        name: z.string().min(1),
        school_type: z.string().nullable(),
      })
    ),
    daily_trend: z.array(trendPoint),
    ea_heatmap: z.object({
      dates: z.array(date).max(10),
      eas: z.array(heatmapRow),
    }),
    distribution: z.array(
      z.object({
        range: z.string().min(1),
        ea_count: count,
      })
    ),
    school_summary: z.array(
      z.object({
        school_id: uuid.nullable(),
        current_school: z.string().min(1),
        school_type: z.string().nullable(),
        total_sessions: count,
        sessions_this_week: count,
        active_eas: count,
        active_days: count,
        avg_sessions_per_day_per_ea: metric,
        present_attendees: count,
      })
    ),
  })
  .superRefine((value, context) => {
    if (value.daily_trend.length !== value.days) {
      context.addIssue({
        code: "custom",
        path: ["daily_trend"],
        message: "daily_trend must contain one row for every requested date",
      });
    }

    value.daily_trend.forEach((point, index) => {
      if (point.total !== point.primary + point.ecd + point.other) {
        context.addIssue({
          code: "custom",
          path: ["daily_trend", index, "total"],
          message: "total must equal primary + ecd + other",
        });
      }
    });

    value.ea_heatmap.eas.forEach((row, index) => {
      if (row.cells.length !== value.ea_heatmap.dates.length) {
        context.addIssue({
          code: "custom",
          path: ["ea_heatmap", "eas", index, "cells"],
          message: "heatmap cells must align with heatmap dates",
        });
      }
    });
  });

export const mobileSessionReviewFlagsSchema = z
  .object({
    count: count,
    flags: z
      .array(
        z
          .object({
            session_date: date,
            started_at: absoluteTimestamp.nullable(),
            ended_at: absoluteTimestamp.nullable(),
            submitting_ea_name: z.string().min(1),
            school_id: uuid,
            school_name: z.string().min(1),
            child_first_name: z.string().min(1),
            child_last_name: z.string().min(1),
            reason_code: z.literal("same_school_child_not_assigned_to_actor"),
            created_at: absoluteTimestamp,
            last_observed_at: absoluteTimestamp,
          })
          .strict()
      )
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.count < value.flags.length) {
      context.addIssue({
        code: "custom",
        path: ["count"],
        message: "count must be at least the number of returned flags",
      });
    }
  });
