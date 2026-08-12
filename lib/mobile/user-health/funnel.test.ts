import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserHealthFunnel } from "@/components/mobile-app/user-health/user-health-funnel";
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

test("unmeasured authentication is excluded from the login denominator, not counted as failed", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const counts = buildFunnelCounts(users);
  const html = renderToStaticMarkup(
    createElement(UserHealthFunnel, { counts, days: 30 })
  );
  // Fixture: 2 authenticated of 3 measurable of 4 accounts → must read 2/3, never 2 · 50%.
  assert.match(html, /2\/3/);

  const allUnmeasured = users.map((user) => ({
    ...user,
    auth: { ...user.auth, authenticated_after_provisioning: null },
  }));
  const unmeasuredHtml = renderToStaticMarkup(
    createElement(UserHealthFunnel, {
      counts: buildFunnelCounts(allUnmeasured),
      days: 30,
    })
  );
  assert.match(unmeasuredHtml, /Not measured/i);
  assert.doesNotMatch(unmeasuredHtml, /0\/0|NaN/);
});

test("the funnel renders each evidence stage as count and share of accounts", () => {
  const counts = buildFunnelCounts(VALID_MOBILE_USER_HEALTH_PAYLOAD.users);
  const html = renderToStaticMarkup(
    createElement(UserHealthFunnel, { counts, days: 30 })
  );
  assert.match(html, /Accounts/);
  assert.match(html, /Auth ready/);
  assert.match(html, /Logged in after provisioning/i);
  assert.match(html, /Device signal/);
  assert.match(html, /Active · 30d/);
  assert.match(html, /Seeded data ready/);
});
