import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SessionsPageContent } from "@/components/mobile-app/sessions/sessions-page-content";
import { SESSION_REVIEW_ALERTS_UNAVAILABLE } from "@/lib/mobile/session-review-copy";
import {
  VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD,
  VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
} from "@/lib/mobile/test-fixtures";
import type {
  MobileSessionReviewFlagsResult,
  MobileSessionsActivityResult,
} from "@/lib/mobile/response";

const reportSuccess: MobileSessionsActivityResult = {
  ok: true,
  data: VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
};
const reportFailure: MobileSessionsActivityResult = {
  ok: false,
  status: 502,
  message: "The mobile-app report service is currently unavailable.",
};
const flagsSuccess: MobileSessionReviewFlagsResult = {
  ok: true,
  data: VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD,
};
const flagsFailure: MobileSessionReviewFlagsResult = {
  ok: false,
  status: 502,
  message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
};

function render(
  result: MobileSessionsActivityResult,
  reviewFlags: MobileSessionReviewFlagsResult
): string {
  return renderToStaticMarkup(
    createElement(
      SessionsPageContent,
      { result, reviewFlags },
      createElement("section", { "data-testid": "fixture-sessions-success" })
    )
  );
}

test("session review alerts render independently of the sessions report", () => {
  const flagsOkReportError = render(reportFailure, flagsSuccess);
  assert.match(flagsOkReportError, /mobile-session-review-alerts/);
  assert.match(flagsOkReportError, /mobile-sessions-report-error/);
  assert.match(flagsOkReportError, /Session report unavailable/);
  assert.doesNotMatch(flagsOkReportError, /fixture-sessions-success/);

  const flagsErrorReportOk = render(reportSuccess, flagsFailure);
  assert.match(flagsErrorReportOk, /mobile-session-review-unavailable/);
  assert.match(flagsErrorReportOk, /fixture-sessions-success/);
  assert.match(flagsErrorReportOk, /mobile-sessions-report-success/);

  const bothError = render(reportFailure, flagsFailure);
  assert.match(bothError, /mobile-session-review-unavailable/);
  assert.match(bothError, /mobile-sessions-report-error/);
  assert.match(bothError, /Session report unavailable/);
  assert.doesNotMatch(bothError, /fixture-sessions-success/);
});

test("the sessions heading exists even when both reports fail", () => {
  const html = render(reportFailure, flagsFailure);
  assert.match(html, /Mobile app reporting/);
  assert.match(html, />Sessions</);
});

test("the page passes the selected school type to the independent review-alert loader", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/mobile-app/sessions/page.tsx"),
    "utf8"
  );
  assert.match(
    source,
    /getMobileSessionReviewFlags\(\{\s*schoolId,\s*schoolType\s*\}\)/
  );
});
