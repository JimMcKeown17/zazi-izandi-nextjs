import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivityStage,
  hasEverOpenedApp,
  isQuiet,
} from "../user-health/presentation";
import {
  formatDurationMinutes,
  formatDurationSeconds,
  formatSessionFocus,
  toHealthRowShape,
} from "./presentation";
import {
  QUIET_MOBILE_USER_PROFILE_PAYLOAD,
  VALID_MOBILE_USER_PROFILE_PAYLOAD,
} from "./test-fixtures";
import type { MobileUserProfileResponse } from "./types";

test("session focus distinguishes letter, blending, and legacy records", () => {
  assert.equal(formatSessionFocus(["a", "b"], null), "A, B");
  assert.equal(
    formatSessionFocus(null, ["short vowels"]),
    "Blending: short vowels"
  );
  assert.equal(formatSessionFocus(null, null), "—");
});

test("profile durations use the existing readable hours-and-minutes style", () => {
  assert.equal(formatDurationMinutes(90), "1h 30m");
  assert.equal(formatDurationMinutes(null), "—");
  assert.equal(formatDurationSeconds(3_600), "1h 00m");
  assert.equal(formatDurationSeconds(null), "—");
});

test("the health-row adapter preserves every board field and uses windowed activity", () => {
  const profile = VALID_MOBILE_USER_PROFILE_PAYLOAD;
  const row = toHealthRowShape(profile);

  assert.deepEqual(row.activity, profile.windowed_activity);
  assert.deepEqual(row.app_device, profile.app_device);
  assert.deepEqual(row.auth, profile.auth);
  assert.deepEqual(row.wave, profile.wave);
  assert.equal(row.user_id, profile.user_id);
  assert.equal(row.display_name, profile.identity.display_name);
  assert.equal(row.email, profile.email);
  assert.equal(row.employment_status, profile.identity.employment_status);
  assert.equal(row.current_school_id, profile.identity.current_school_id);
  assert.equal(row.current_school, profile.identity.current_school);
  assert.equal(row.data.expectation, profile.identity.data_expectation);
  assert.equal(row.data.children, profile.data.children);
  assert.equal(row.first_ever_activity_at, profile.lifetime.first_ever_activity_at);
  assert.equal(row.last_ever_activity_at, profile.lifetime.last_ever_activity_at);
  assert.equal(row.first_app_open_at, profile.lifetime.first_app_open_at);
  assert.equal(row.last_app_open_at, profile.lifetime.last_app_open_at);
  assert.equal(row.ever_registered_device, profile.ever_registered_device);
  assert.equal(getActivityStage(row), "active");
  assert.equal(isQuiet(row), false);
});

test("lifetime activity remains active while a zeroed 30-day window is quiet", () => {
  const row = toHealthRowShape(QUIET_MOBILE_USER_PROFILE_PAYLOAD);
  assert.equal(getActivityStage(row), "active");
  assert.equal(isQuiet(row), true);
});

test("an app-open-only profile remains reached without becoming active", () => {
  const profile: MobileUserProfileResponse = {
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
    app_device: {
      registered: false,
      platform: null,
      app_version: null,
      last_seen_at: null,
    },
    ever_registered_device: false,
    lifetime: {
      ...structuredClone(VALID_MOBILE_USER_PROFILE_PAYLOAD.lifetime),
      first_ever_activity_at: null,
      last_ever_activity_at: null,
      totals: {
        clock_entries: 0,
        clock_days: 0,
        clock_minutes_completed: 0,
        sessions: 0,
        app_assessments: 0,
      },
    },
    auth: {
      ...VALID_MOBILE_USER_PROFILE_PAYLOAD.auth,
      last_sign_in_at: "2026-08-08T02:00:00+00:00",
      authenticated_after_provisioning: false,
    },
  };

  const row = toHealthRowShape(profile);
  assert.equal(getActivityStage(row), "reached");
  assert.equal(hasEverOpenedApp(row), true);
  assert.equal(isQuiet(row), false);
});
