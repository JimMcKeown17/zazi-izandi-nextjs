import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  UserHealthHeader,
  UserHealthPageContent,
} from "@/components/mobile-app/user-health/user-health-page-content";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "../user-health/test-fixtures";

const healthSuccess = {
  ok: true as const,
  data: VALID_MOBILE_USER_HEALTH_PAYLOAD,
};
const healthFailure = {
  ok: false as const,
  status: 502,
  message: "The onboarding health service is currently unavailable.",
};

test("the Overview shell renders health independently of sync diagnostics", () => {
  const success = renderToStaticMarkup(
    createElement(UserHealthPageContent, {
      healthResult: healthSuccess,
      healthSuccess: createElement("section", {
        "data-testid": "fixture-health-success",
      }),
    })
  );
  assert.match(success, /fixture-health-success/);
  assert.match(success, /Overview/);
  assert.match(success, /Sync diagnostics/);
  assert.doesNotMatch(success, /mobile-sync-incident-alerts/);

  const failure = renderToStaticMarkup(
    createElement(UserHealthPageContent, {
      healthResult: healthFailure,
      healthSuccess: null,
    })
  );
  assert.match(failure, /mobile-user-health-report-error/);
  assert.match(failure, /User health board unavailable/);
});

test("the route-backed diagnostics tab has its own active navigation state", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthHeader, { active: "sync-diagnostics" })
  );

  assert.match(html, /href="\/mobile-app\/user-health\/sync-diagnostics"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Mobile app operations/);
  assert.match(html, />User health</);
});
