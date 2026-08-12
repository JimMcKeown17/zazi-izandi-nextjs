import assert from "node:assert/strict";
import test from "node:test";

import { buildDeviceVersionBreakdown } from "./devices";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("only registered devices are counted, grouped by platform and version", () => {
  const breakdown = buildDeviceVersionBreakdown(
    VALID_MOBILE_USER_HEALTH_PAYLOAD.users
  );
  const registered = VALID_MOBILE_USER_HEALTH_PAYLOAD.users.filter(
    (user) => user.app_device.registered
  ).length;
  assert.equal(
    breakdown.reduce((sum, row) => sum + row.count, 0),
    registered
  );
  assert.match(breakdown[0].label, /^(android|ios) · v/);
});

test("a registered device without a version reports an unknown version", () => {
  const user = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    app_device: {
      registered: true as const,
      platform: "android" as const,
      app_version: null,
      last_seen_at: null,
    },
  };
  assert.deepEqual(buildDeviceVersionBreakdown([user]), [
    { label: "android · unknown version", count: 1 },
  ]);
});
