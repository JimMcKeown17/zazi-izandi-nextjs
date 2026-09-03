import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  SessionExportsPanel,
  SessionExportStatus,
} from "@/components/mobile-app/sessions/session-exports-panel";

test("renders the compact one-row export controls and concise unsynced note", () => {
  const html = renderToStaticMarkup(createElement(SessionExportsPanel, {
    today: "2026-09-01",
    schoolId: "11111111-1111-4111-8111-111111111111",
    schoolType: "primary",
  }));

  assert.match(html, /20 March 2026 pay-run window · 20 Feb–19 Mar/);
  assert.match(html, /aria-label="Download payroll summary"/);
  assert.match(html, />Payroll summary</);
  assert.match(html, /aria-label="Download session detail"/);
  assert.match(html, />Session detail</);
  assert.match(
    html,
    /lg:grid-cols-\[8rem_minmax\(11rem,1fr\)_auto_auto\]/
  );
  assert.match(html, /sm:grid-cols-2/);
  assert.match(html, /\*Unsynced sessions may not be reflected yet\./);
  assert.doesNotMatch(html, /closed-date pay-run window/);
  assert.doesNotMatch(html, /\b(?:completed|final)\b/i);
  assert.doesNotMatch(html, /not a payroll lock/);
  assert.doesNotMatch(html, /share them only through approved staff channels/i);
  assert.doesNotMatch(html, /bg-amber-50/);
  assert.match(html, /aria-live="polite" class="sr-only"/);
  assert.match(
    html,
    /<div role="region" aria-labelledby="mobile-session-exports-heading" data-testid="mobile-session-exports"/
  );
  assert.match(html, /id="mobile-session-exports-heading"/);
  assert.doesNotMatch(html, /<section[^>]*mobile-session-exports/);
});

test("keeps custom dates grouped in the range slot before the two downloads", () => {
  const html = renderToStaticMarkup(createElement(SessionExportsPanel, {
    today: "2026-01-10",
    schoolId: null,
    schoolType: null,
  }));

  assert.match(html, />Custom dates</);
  assert.match(html, />Start date</);
  assert.match(html, />End date</);
  assert.match(html, /value="2025-12-12"/);
  assert.match(html, /value="2026-01-10"/);
  assert.match(
    html,
    /xl:grid-cols-\[8rem_minmax\(22rem,1fr\)_auto_auto\]/
  );
  assert.match(
    html,
    /grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-1/
  );
  assert.match(
    html,
    /End date[\s\S]*Payroll summary[\s\S]*Session detail/
  );
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
