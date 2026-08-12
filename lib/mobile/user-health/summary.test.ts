import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserHealthSummary } from "@/components/mobile-app/user-health/user-health-summary";
import { UserHealthBoard } from "@/components/mobile-app/user-health/user-health-board";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("the summary presents the rollout-cutoff authentication proxy precisely", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthSummary, {
      data: VALID_MOBILE_USER_HEALTH_PAYLOAD,
    })
  );

  assert.match(html, /Authenticated after provisioning/i);
  assert.match(html, /2\s*\/\s*3/i);
  assert.match(html, /credential-release cutoff/i);
  assert.match(html, /not app\/device proof/i);
  assert.doesNotMatch(html, /Mobile logins/i);
  assert.doesNotMatch(html, /Not tracked/i);
  assert.doesNotMatch(html, /have signed in at least once/i);
});

test("summary tiles deep-link into board filters using the payload's own scope", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthSummary, {
      data: VALID_MOBILE_USER_HEALTH_PAYLOAD,
    })
  );

  assert.match(
    html,
    /href="\/mobile-app\/user-health\?days=30&amp;state=has_blockers"/
  );
  assert.match(
    html,
    /href="\/mobile-app\/user-health\?days=30&amp;state=active"/
  );
});

test("the Auth/Login column distinguishes proven, pre-cutoff, and unmeasured accounts", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthBoard, {
      users: VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
      days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
    })
  );

  assert.match(html, /Auth \/ login/i);
  assert.match(html, /Authenticated after provisioning/i);
  assert.match(html, /No authentication after provisioning/i);
  assert.match(html, /Post-provisioning authentication unmeasured/i);
  assert.match(html, /Cutoff:/i);
  assert.match(html, /app and device are not identified/i);
});
