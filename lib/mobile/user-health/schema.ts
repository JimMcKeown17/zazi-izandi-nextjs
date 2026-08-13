import { z } from "zod";

import {
  getUserAttentionReasons,
  hasRecentAppActivity,
  hasSeededDataReady,
} from "./presentation";

const uuid = z.string().uuid();
const absoluteTimestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
const waveSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  launch_date: z.iso.date(),
});

const userHealthRowSchema = z.object({
  user_id: uuid,
  display_name: z.string().min(1),
  email: z.email().nullable(),
  employment_status: z.string().nullable(),
  current_school_id: uuid.nullable(),
  current_school: z.string().min(1),
  wave: waveSchema.nullable().optional(),
  first_ever_activity_at: absoluteTimestamp.nullable().optional(),
  last_ever_activity_at: absoluteTimestamp.nullable().optional(),
  ever_registered_device: z.boolean().nullable().optional(),
  first_app_open_at: absoluteTimestamp.nullable().optional(),
  last_app_open_at: absoluteTimestamp.nullable().optional(),
  auth: z.object({
    state: z.enum(["ready", "unconfirmed", "banned", "missing_email"]),
    created_at: absoluteTimestamp,
    last_sign_in_at: absoluteTimestamp.nullable(),
    provisioning_cutoff_at: absoluteTimestamp.nullable(),
    authenticated_after_provisioning: z.boolean().nullable(),
  }),
  app_device: z.object({
    registered: z.boolean(),
    platform: z.enum(["ios", "android"]).nullable(),
    app_version: z.string().min(1).nullable(),
    last_seen_at: absoluteTimestamp.nullable(),
  }),
  data: z.object({
    expectation: z.enum(["seeded", "self_setup", "unknown"]),
    classes: count,
    children: count,
    groups: count,
    grouped_children: count,
    imported_assessments: count,
  }),
  activity: z.object({
    clock_entries: count,
    sessions: count,
    app_assessments: count,
    last_clock_in_at: absoluteTimestamp.nullable(),
    last_session_at: absoluteTimestamp.nullable(),
    last_app_assessment_at: absoluteTimestamp.nullable(),
    last_activity_at: absoluteTimestamp.nullable(),
  }),
});

export const mobileUserHealthSchema = z
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
    wave_options: z.array(waveSchema).optional(),
    summary: z.object({
      total_users: count,
      auth_ready: count,
      signed_in_ever: count,
      authentication_measurable: count,
      authenticated_after_provisioning: count,
      registered_devices: count,
      seeded_expected: count,
      seeded_data_ready: count,
      active_in_window: count,
      needs_attention: count,
    }),
    users: z.array(userHealthRowSchema),
  })
  .superRefine((value, context) => {
    const waveIds = new Set<string>();
    value.wave_options?.forEach((wave, index) => {
      if (waveIds.has(wave.id)) {
        context.addIssue({
          code: "custom",
          path: ["wave_options", index, "id"],
          message: "wave options must have unique ids",
        });
      }
      waveIds.add(wave.id);
    });

    const userIds = new Set<string>();
    value.users.forEach((user, index) => {
      if (userIds.has(user.user_id)) {
        context.addIssue({
          code: "custom",
          path: ["users", index, "user_id"],
          message: "health-board users must be unique",
        });
      }
      userIds.add(user.user_id);

      if (
        value.wave_options !== undefined &&
        user.wave != null &&
        !waveIds.has(user.wave.id)
      ) {
        context.addIssue({
          code: "custom",
          path: ["users", index, "wave", "id"],
          message: "user wave must appear in wave options",
        });
      }

      const hasFirstLifetime = "first_ever_activity_at" in user;
      const hasLastLifetime = "last_ever_activity_at" in user;
      const firstLifetime = user.first_ever_activity_at ?? null;
      const lastLifetime = user.last_ever_activity_at ?? null;
      if (hasFirstLifetime !== hasLastLifetime) {
        context.addIssue({
          code: "custom",
          path: [
            "users",
            index,
            hasFirstLifetime
              ? "last_ever_activity_at"
              : "first_ever_activity_at",
          ],
          message: "lifetime activity fields must ship together",
        });
      }
      if (hasFirstLifetime && hasLastLifetime) {
        if ((firstLifetime === null) !== (lastLifetime === null)) {
          context.addIssue({
            code: "custom",
            path: ["users", index, "last_ever_activity_at"],
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
            path: ["users", index, "last_ever_activity_at"],
            message: "lifetime activity bounds must be ordered",
          });
        }
        if (
          user.activity.last_activity_at !== null &&
          (lastLifetime === null ||
            new Date(user.activity.last_activity_at) > new Date(lastLifetime))
        ) {
          context.addIssue({
            code: "custom",
            path: ["users", index, "last_ever_activity_at"],
            message: "lifetime activity must cover windowed activity",
          });
        }
      }

      const hasFirstAppOpen = "first_app_open_at" in user;
      const hasLastAppOpen = "last_app_open_at" in user;
      const firstAppOpen = user.first_app_open_at ?? null;
      const lastAppOpen = user.last_app_open_at ?? null;
      if (hasFirstAppOpen !== hasLastAppOpen) {
        context.addIssue({
          code: "custom",
          path: [
            "users",
            index,
            hasFirstAppOpen ? "last_app_open_at" : "first_app_open_at",
          ],
          message: "app open fields must ship together",
        });
      }
      if (hasFirstAppOpen && hasLastAppOpen) {
        if ((firstAppOpen === null) !== (lastAppOpen === null)) {
          context.addIssue({
            code: "custom",
            path: ["users", index, "last_app_open_at"],
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
            path: ["users", index, "last_app_open_at"],
            message: "app open bounds must be ordered",
          });
        }
      }

      if (
        user.app_device.registered &&
        user.ever_registered_device === false
      ) {
        context.addIssue({
          code: "custom",
          path: ["users", index, "ever_registered_device"],
          message: "a registered device requires lifetime device evidence",
        });
      }

      const cutoffAt = user.auth.provisioning_cutoff_at;
      const authenticationResult = user.auth.authenticated_after_provisioning;
      if (cutoffAt === null) {
        if (authenticationResult !== null) {
          context.addIssue({
            code: "custom",
            path: ["users", index, "auth", "authenticated_after_provisioning"],
            message: "unmeasured authentication must not have a result",
          });
        }
      } else {
        const expectedAuthenticationResult =
          user.auth.last_sign_in_at !== null &&
          new Date(user.auth.last_sign_in_at) > new Date(cutoffAt);
        if (authenticationResult !== expectedAuthenticationResult) {
          context.addIssue({
            code: "custom",
            path: ["users", index, "auth", "authenticated_after_provisioning"],
            message: "authentication result must match the rollout cutoff",
          });
        }
      }

      const deviceEvidenceComplete =
        user.app_device.platform !== null &&
        user.app_device.last_seen_at !== null;
      if (user.app_device.registered !== deviceEvidenceComplete) {
        context.addIssue({
          code: "custom",
          path: ["users", index, "app_device"],
          message: "registered device state must match its evidence fields",
        });
      }
      if (user.data.grouped_children > user.data.children) {
        context.addIssue({
          code: "custom",
          path: ["users", index, "data", "grouped_children"],
          message: "grouped children cannot exceed owned children",
        });
      }
    });

    const expectedSummary = {
      total_users: value.users.length,
      auth_ready: value.users.filter((user) => user.auth.state === "ready")
        .length,
      signed_in_ever: value.users.filter(
        (user) => user.auth.last_sign_in_at !== null
      ).length,
      authentication_measurable: value.users.filter(
        (user) => user.auth.authenticated_after_provisioning !== null
      ).length,
      authenticated_after_provisioning: value.users.filter(
        (user) => user.auth.authenticated_after_provisioning === true
      ).length,
      registered_devices: value.users.filter(
        (user) => user.app_device.registered
      ).length,
      seeded_expected: value.users.filter(
        (user) => user.data.expectation === "seeded"
      ).length,
      seeded_data_ready: value.users.filter(hasSeededDataReady).length,
      active_in_window: value.users.filter(hasRecentAppActivity).length,
      needs_attention: value.users.filter(
        (user) => getUserAttentionReasons(user).length > 0
      ).length,
    };

    for (const [key, expected] of Object.entries(expectedSummary)) {
      if (value.summary[key as keyof typeof value.summary] !== expected) {
        context.addIssue({
          code: "custom",
          path: ["summary", key],
          message: `${key} must reconcile with users`,
        });
      }
    }
  });
