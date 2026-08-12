import assert from "node:assert/strict";
import test from "node:test";

import { buildFunnelCounts } from "./funnel";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("funnel counts derived from rows match the server summary", () => {
  const counts = buildFunnelCounts(VALID_MOBILE_USER_HEALTH_PAYLOAD.users);
  const summary = VALID_MOBILE_USER_HEALTH_PAYLOAD.summary;
  assert.equal(counts.accounts, summary.total_users);
  assert.equal(counts.auth_ready, summary.auth_ready);
  assert.equal(counts.device_signal, summary.registered_devices);
  assert.equal(counts.active_in_window, summary.active_in_window);
  assert.equal(counts.seeded_expected, summary.seeded_expected);
  assert.equal(counts.seeded_data_ready, summary.seeded_data_ready);
  // Tri-state: null = unmeasured (no trusted provisioning cutoff), never a failure.
  assert.equal(
    counts.authentication_measurable,
    summary.authentication_measurable
  );
  assert.equal(
    counts.logged_in_after_provisioning,
    summary.authenticated_after_provisioning
  );
});
