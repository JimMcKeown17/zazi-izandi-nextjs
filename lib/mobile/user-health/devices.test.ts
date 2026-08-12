import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeviceVersionBreakdown,
  splitVersionBreakdown,
} from "./devices";
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

test("top version rows plus the disclosed remainder account for every registered device", () => {
  const breakdown = [
    { label: "android · v8.0.0", count: 8 },
    { label: "android · v7.0.0", count: 7 },
    { label: "ios · v6.0.0", count: 6 },
    { label: "android · v5.0.0", count: 5 },
    { label: "ios · v4.0.0", count: 4 },
    { label: "android · v3.0.0", count: 3 },
    { label: "ios · v2.0.0", count: 2 },
    { label: "android · v1.0.0", count: 1 },
  ];

  const split = splitVersionBreakdown(breakdown, 6);

  assert.deepEqual(split.top, breakdown.slice(0, 6));
  assert.equal(split.remainderVersions, 2);
  assert.equal(split.remainderCount, 3);
  assert.equal(
    split.top.reduce((sum, row) => sum + row.count, 0) +
      split.remainderCount,
    breakdown.reduce((sum, row) => sum + row.count, 0)
  );
});
