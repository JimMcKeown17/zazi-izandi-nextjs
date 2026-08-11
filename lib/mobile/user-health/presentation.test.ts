import assert from "node:assert/strict";
import test from "node:test";

import {
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
