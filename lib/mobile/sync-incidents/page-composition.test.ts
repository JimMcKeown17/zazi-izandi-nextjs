import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserHealthPageContent } from "@/components/mobile-app/user-health/user-health-page-content";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "../user-health/test-fixtures";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";
import type { MobileSyncIncidentsResult } from "./types";

const healthSuccess = {
  ok: true as const,
  data: VALID_MOBILE_USER_HEALTH_PAYLOAD,
};
const healthFailure = {
  ok: false as const,
  status: 502,
  message: "The onboarding health service is currently unavailable.",
};
const incidentSuccess: MobileSyncIncidentsResult = {
  ok: true,
  data: VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD,
};
const incidentFailure: MobileSyncIncidentsResult = {
  ok: false,
  status: 502,
  kind: "unavailable",
  message: "Sync incident alerts are temporarily unavailable.",
};

function render(
  healthResult: typeof healthSuccess | typeof healthFailure,
  incidentResult: MobileSyncIncidentsResult
): string {
  return renderToStaticMarkup(
    createElement(UserHealthPageContent, {
      healthResult,
      incidentResult,
      healthSuccess: createElement("section", {
        "data-testid": "fixture-health-success",
      }),
    })
  );
}

test("User Health and sync alerts render all four independent result states", () => {
  const bothSuccess = render(healthSuccess, incidentSuccess);
  assert.match(bothSuccess, /mobile-sync-incident-alerts-success/);
  assert.match(bothSuccess, /fixture-health-success/);
  assert.doesNotMatch(bothSuccess, /mobile-user-health-report-error/);

  const incidentOnlyFailure = render(healthSuccess, incidentFailure);
  assert.match(incidentOnlyFailure, /mobile-sync-incident-alerts-unavailable/);
  assert.match(incidentOnlyFailure, /fixture-health-success/);

  const healthOnlyFailure = render(healthFailure, incidentSuccess);
  assert.match(healthOnlyFailure, /mobile-sync-incident-alerts-success/);
  assert.match(healthOnlyFailure, /mobile-user-health-report-error/);
  assert.doesNotMatch(healthOnlyFailure, /fixture-health-success/);

  const bothFailure = render(healthFailure, incidentFailure);
  assert.match(bothFailure, /mobile-sync-incident-alerts-unavailable/);
  assert.match(bothFailure, /mobile-user-health-report-error/);
  assert.match(bothFailure, /User health board unavailable/);
});

test("the shared page heading exists even when both reports fail", () => {
  const html = render(healthFailure, incidentFailure);
  assert.match(html, /Mobile app operations/);
  assert.match(html, />User health</);
});
