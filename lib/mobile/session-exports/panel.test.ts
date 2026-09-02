import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  SessionExportsPanel,
  SessionExportStatus,
} from "@/components/mobile-app/sessions/session-exports-panel";

test("renders the confirmed pay-run boundary, both downloads, and live-snapshot warning", () => {
  const html = renderToStaticMarkup(createElement(SessionExportsPanel, {
    today: "2026-09-01",
    schoolId: "11111111-1111-4111-8111-111111111111",
    schoolType: "primary",
  }));

  assert.match(html, /20 March 2026 pay-run window · 20 Feb–19 Mar/);
  assert.match(html, /Download payroll summary/);
  assert.match(html, /Download session detail/);
  assert.match(html, /closed-date pay-run window/);
  assert.doesNotMatch(html, /\b(?:completed|final)\b/i);
  assert.match(html, /not a payroll lock/);
  assert.match(html, /Sessions still held offline on a phone are absent/);
});

test("renders accessible pending and error status copy", () => {
  const pending = renderToStaticMarkup(createElement(SessionExportStatus, {
    pending: true,
    message: "",
  }));
  const error = renderToStaticMarkup(createElement(SessionExportStatus, {
    pending: false,
    message: "Choose a shorter range and try again.",
  }));

  assert.match(pending, /aria-live="polite"/);
  assert.match(pending, /Preparing the CSV from the live server snapshot/);
  assert.match(error, /Choose a shorter range and try again/);
});
