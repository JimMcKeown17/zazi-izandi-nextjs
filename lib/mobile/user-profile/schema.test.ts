import assert from "node:assert/strict";
import test from "node:test";

import { mobileUserProfileSchema } from "./schema";
import {
  PROFILE_GENERATED_AT,
  VALID_MOBILE_USER_PROFILE_PAYLOAD,
} from "./test-fixtures";
import type { MobileUserProfileResponse } from "./types";

function cloneProfile(): MobileUserProfileResponse {
  return structuredClone(VALID_MOBILE_USER_PROFILE_PAYLOAD);
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("the complete profile payload is retained at the UTC-to-SAST week boundary", () => {
  assert.equal(VALID_MOBILE_USER_PROFILE_PAYLOAD.generated_at, PROFILE_GENERATED_AT);
  assert.equal(VALID_MOBILE_USER_PROFILE_PAYLOAD.weekly.length, 26);
  assert.equal(
    VALID_MOBILE_USER_PROFILE_PAYLOAD.weekly.at(-1)?.week_start,
    "2026-08-17"
  );
  assert.equal(
    VALID_MOBILE_USER_PROFILE_PAYLOAD.recent_weekday_sessions.dates.at(-1),
    "2026-08-17"
  );

  const parsed = mobileUserProfileSchema.parse(
    VALID_MOBILE_USER_PROFILE_PAYLOAD
  );
  assert.deepEqual(parsed, VALID_MOBILE_USER_PROFILE_PAYLOAD);
});

test("weekly history must contain exactly 26 buckets", () => {
  const payload = cloneProfile();
  payload.weekly = payload.weekly.slice(1);
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("weekly dates must be Mondays ending in the generated SAST week", () => {
  const nonMonday = cloneProfile();
  nonMonday.weekly[0].week_start = shiftDate(
    nonMonday.weekly[0].week_start,
    1
  );

  const stale = cloneProfile();
  stale.weekly = stale.weekly.map((row) => ({
    ...row,
    week_start: shiftDate(row.week_start, -7),
  }));

  assert.equal(mobileUserProfileSchema.safeParse(nonMonday).success, false);
  assert.equal(mobileUserProfileSchema.safeParse(stale).success, false);
});

test("the weekday strip must contain the exact ten weekdays ending at the generated SAST date", () => {
  const short = cloneProfile();
  short.recent_weekday_sessions.dates =
    short.recent_weekday_sessions.dates.slice(1);
  short.recent_weekday_sessions.cells =
    short.recent_weekday_sessions.cells.slice(1);

  const stale = cloneProfile();
  stale.recent_weekday_sessions.dates =
    stale.recent_weekday_sessions.dates.map((date) => shiftDate(date, -7));

  assert.equal(mobileUserProfileSchema.safeParse(short).success, false);
  assert.equal(mobileUserProfileSchema.safeParse(stale).success, false);
});

test("a session cannot carry both letters and blend categories", () => {
  const payload = cloneProfile();
  payload.recent_sessions[0].blend_categories = ["short vowels"];
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("children with assessment information cannot exceed owned children", () => {
  const payload = cloneProfile();
  payload.data.children_assessed = payload.data.children + 1;
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("clock active, sign-out, and duration evidence must agree", () => {
  const activeWithDuration = cloneProfile();
  activeWithDuration.clock_entries[0].duration_minutes = 1;

  const completedWithoutSignOut = cloneProfile();
  completedWithoutSignOut.clock_entries[1].sign_out_time = null;

  assert.equal(
    mobileUserProfileSchema.safeParse(activeWithDuration).success,
    false
  );
  assert.equal(
    mobileUserProfileSchema.safeParse(completedWithoutSignOut).success,
    false
  );
});

test("completed clock entries reject a sign-out earlier than sign-in", () => {
  const payload = cloneProfile();
  payload.clock_entries[1].sign_out_time = "2026-08-16T04:59:59+00:00";
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("windowed source counts and timestamps are paired in both directions", () => {
  const sources = [
    ["clock_entries", "last_clock_in_at"],
    ["sessions", "last_session_at"],
    ["app_assessments", "last_app_assessment_at"],
  ] as const;

  for (const [countKey, timestampKey] of sources) {
    const positiveWithoutTimestamp = cloneProfile();
    positiveWithoutTimestamp.windowed_activity[timestampKey] = null;
    assert.equal(
      mobileUserProfileSchema.safeParse(positiveWithoutTimestamp).success,
      false,
      `${countKey} > 0 requires ${timestampKey}`
    );

    const zeroWithTimestamp = cloneProfile();
    zeroWithTimestamp.windowed_activity[countKey] = 0;
    assert.equal(
      mobileUserProfileSchema.safeParse(zeroWithTimestamp).success,
      false,
      `${countKey} = 0 requires a null ${timestampKey}`
    );
  }
});

test("last_activity_at must be the newest windowed source timestamp", () => {
  const payload = cloneProfile();
  payload.windowed_activity.last_activity_at =
    payload.windowed_activity.last_clock_in_at;
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("the profile activity window is fixed at 30 days", () => {
  const payload = cloneProfile();
  payload.days = 29;
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("device registration is rejected on both sides of the evidence biconditional", () => {
  const registeredWithoutEvidence = cloneProfile();
  registeredWithoutEvidence.app_device.platform = null;
  registeredWithoutEvidence.app_device.last_seen_at = null;

  const evidenceWithoutRegistration = cloneProfile();
  evidenceWithoutRegistration.app_device.registered = false;

  assert.equal(
    mobileUserProfileSchema.safeParse(registeredWithoutEvidence).success,
    false
  );
  assert.equal(
    mobileUserProfileSchema.safeParse(evidenceWithoutRegistration).success,
    false
  );
});

test("a currently registered device requires lifetime device evidence", () => {
  const payload = cloneProfile();
  payload.ever_registered_device = false;
  assert.equal(mobileUserProfileSchema.safeParse(payload).success, false);
});

test("lifetime and app-open bounds require matching nullity and chronological order", () => {
  const oneSidedLifetime = cloneProfile();
  oneSidedLifetime.lifetime.first_ever_activity_at = null;

  const invertedLifetime = cloneProfile();
  invertedLifetime.lifetime.first_ever_activity_at =
    "2026-08-16T21:01:00+00:00";

  const oneSidedAppOpen = cloneProfile();
  oneSidedAppOpen.lifetime.last_app_open_at = null;

  const invertedAppOpen = cloneProfile();
  invertedAppOpen.lifetime.first_app_open_at =
    "2026-08-16T20:31:00+00:00";

  assert.equal(
    mobileUserProfileSchema.safeParse(oneSidedLifetime).success,
    false
  );
  assert.equal(
    mobileUserProfileSchema.safeParse(invertedLifetime).success,
    false
  );
  assert.equal(
    mobileUserProfileSchema.safeParse(oneSidedAppOpen).success,
    false
  );
  assert.equal(
    mobileUserProfileSchema.safeParse(invertedAppOpen).success,
    false
  );
});
