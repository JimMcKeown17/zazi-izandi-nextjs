import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserHealthSummary } from "@/components/mobile-app/user-health/user-health-summary";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("the summary does not present GoTrue Auth history as a mobile-app login", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthSummary, {
      data: VALID_MOBILE_USER_HEALTH_PAYLOAD,
    })
  );

  assert.match(html, /Mobile logins/i);
  assert.match(html, /Not tracked/i);
  assert.match(html, /provisioning checks/i);
  assert.doesNotMatch(html, /have signed in at least once/i);
});
