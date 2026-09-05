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
  reference: "4bbec663-7300-4aca-9e8d-bb8a01d821c2",
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
      {
        result,
        reviewFlags,
        retryHref: "/mobile-app/sessions?days=30&school_type=ecd",
      },
      createElement("section", { "data-testid": "fixture-sessions-success" })
    )
  );
}

function renderWithExportPanel(
  result: MobileSessionsActivityResult
): string {
  return renderToStaticMarkup(
    createElement(
      SessionsPageContent,
      {
        result,
        reviewFlags: flagsFailure,
        exportPanel: createElement("section", {
          "data-testid": "fixture-session-exports",
        }),
      },
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

test("a transient report failure exposes an exact retry and support reference", () => {
  const html = render(reportFailure, flagsSuccess);

  assert.match(html, /This may be temporary/);
  assert.match(html, /Retry report/);
  assert.match(
    html,
    /href="\/mobile-app\/sessions\?days=30&amp;school_type=ecd"/
  );
  assert.match(html, /4bbec663-7300-4aca-9e8d-bb8a01d821c2/);
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

test("the export panel remains available when the rolling report fails", () => {
  assert.match(renderWithExportPanel(reportFailure), /fixture-session-exports/);
  assert.doesNotMatch(renderWithExportPanel(reportFailure), /fixture-sessions-success/);
});

test("the page capability-gates new exports and removes the misleading heatmap CSV", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/mobile-app/sessions/page.tsx"),
    "utf8"
  );
  assert.match(source, /hasCapability\(session\.role, "mobile\.csv\.export"\)/);
  assert.match(source, /<SessionExportsPanel/);
  assert.match(source, /exportPanel=/);
  assert.doesNotMatch(source, /exportFilenamePrefix=/);
});

test("the successful report places exports after the charts and immediately before the heatmap", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/mobile-app/sessions/page.tsx"),
    "utf8"
  );
  const successMarkup = source.split("const { data } = result;")[1];

  assert.ok(successMarkup, "expected successful report markup");
  assert.match(
    successMarkup,
    /<SessionDistribution[\s\S]*<\/div>\s*\{exportPanel\}\s*<EAHeatmap/
  );
  assert.doesNotMatch(
    successMarkup.match(/<SessionsPageContent[\s\S]*?>/)?.[0] ?? "",
    /exportPanel=/
  );
});

test("the sessions loader forwards and retains a request correlation id", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "lib/mobile/api.ts"),
    "utf8"
  );

  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /headers\.set\("X-Zazi-Request-Id", requestId\)/);
  assert.match(source, /reference: requestId/);
});
