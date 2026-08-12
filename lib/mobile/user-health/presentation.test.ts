import assert from "node:assert/strict";
import test from "node:test";

import {
  getProvisioningAuthenticationPresentation,
  getUserAttentionReasons,
  getUserHealthState,
  hasSeededDataReady,
} from "./presentation";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("import-complete seeded users are distinguished from seeded data gaps", () => {
  const [healthy, missingGroups] = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  assert.equal(hasSeededDataReady(healthy), true);
  assert.equal(hasSeededDataReady(missingGroups), false);
  assert.deepEqual(getUserAttentionReasons(missingGroups), [
    "seeded_groups_missing",
    "seeded_memberships_incomplete",
  ]);
});
test("zero data is expected for a self-setup ECD user", () => {
  const selfSetup = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[2];
  assert.deepEqual(getUserAttentionReasons(selfSetup), []);
  assert.equal(getUserHealthState(selfSetup), "active");
});

test("auth blocks take precedence over absence of activity", () => {
  const blocked = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[3];
  assert.deepEqual(getUserAttentionReasons(blocked), ["auth_blocked"]);
  assert.equal(getUserHealthState(blocked), "needs_attention");
});

test("post-provisioning authentication advances an otherwise healthy user to onboarding", () => {
  const authOnly = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    app_device: {
      registered: false,
      platform: null,
      app_version: null,
      last_seen_at: null,
    },
    activity: {
      clock_entries: 0,
      sessions: 0,
      app_assessments: 0,
      last_clock_in_at: null,
      last_session_at: null,
      last_app_assessment_at: null,
      last_activity_at: null,
    },
  };

  assert.equal(getUserHealthState(authOnly), "onboarding");
  assert.deepEqual(getProvisioningAuthenticationPresentation(authOnly), {
    label: "Authenticated after provisioning",
    detail: "Auth proof; app and device are not identified",
    tone: "proven",
  });
});

test("a provisioning-check timestamp does not advance the health state", () => {
  const preCutoff = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    auth: {
      ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0].auth,
      last_sign_in_at: "2026-08-08T02:58:00.000Z",
      authenticated_after_provisioning: false,
    },
    app_device: {
      registered: false,
      platform: null,
      app_version: null,
      last_seen_at: null,
    },
    activity: {
      clock_entries: 0,
      sessions: 0,
      app_assessments: 0,
      last_clock_in_at: null,
      last_session_at: null,
      last_app_assessment_at: null,
      last_activity_at: null,
    },
  };

  assert.equal(getUserHealthState(preCutoff), "not_started");
  assert.equal(
    getProvisioningAuthenticationPresentation(preCutoff).label,
    "No authentication after provisioning"
  );
});
