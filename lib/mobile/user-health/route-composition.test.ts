import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...segments: string[]) =>
  fs.readFileSync(path.join(root, ...segments), "utf8");

test("the default Overview route does not fetch or render sync receipts", () => {
  const page = read("app", "mobile-app", "user-health", "page.tsx");

  assert.doesNotMatch(page, /getMobileSyncIncidents/);
  assert.doesNotMatch(page, /SyncIncidentAlerts/);
  assert.match(page, /getMobileUserHealth/);
});

test("Sync diagnostics has a route-backed page and owns its forensic fetch", () => {
  const page = read(
    "app",
    "mobile-app",
    "user-health",
    "sync-diagnostics",
    "page.tsx"
  );

  assert.match(page, /getMobileSyncIncidents/);
  assert.match(page, /SyncIncidentAlerts/);
  assert.doesNotMatch(page, /getMobileUserHealth/);
});

test("the Overview route defaults to seven calendar days and accepts Today", () => {
  const state = read("lib", "mobile", "user-health", "page-state.ts");

  assert.match(state, /DEFAULT_USER_HEALTH_DAYS = 7/);
  assert.match(state, /parsed >= 1/);
});

test("operational report panels do not inherit the global marketing section padding", () => {
  const overview = read("app", "mobile-app", "user-health", "page.tsx");
  const content = read(
    "components",
    "mobile-app",
    "user-health",
    "user-health-page-content.tsx"
  );
  const incidents = read(
    "components",
    "mobile-app",
    "sync-incidents",
    "sync-incident-alerts.tsx"
  );

  assert.match(overview, /<div data-testid="mobile-user-health-report-success"/);
  assert.doesNotMatch(
    overview,
    /<section[^>]+data-testid="mobile-user-health-report-success"/
  );
  assert.doesNotMatch(
    content,
    /<section[^>]+data-testid="mobile-user-health-report-error"/
  );
  assert.doesNotMatch(
    incidents,
    /<section[^>]+data-testid="mobile-sync-incident-alerts-/
  );
});
