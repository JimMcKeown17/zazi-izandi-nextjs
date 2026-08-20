import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  SessionReviewAlerts,
  SESSION_REVIEW_ALERTS_VISIBLE_LIMIT,
} from "@/components/mobile-app/sessions/session-review-alerts";
import {
  SESSION_REVIEW_ALERTS_UNAVAILABLE,
  SESSION_REVIEW_REASON_COPY,
} from "./session-review-copy";
import { VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD } from "./test-fixtures";
import type { MobileSessionReviewFlag } from "./types";

test("session review copy names the roster fact without accusing the EA of fraud", () => {
  assert.equal(
    SESSION_REVIEW_ALERTS_UNAVAILABLE,
    "Session review alerts are unavailable"
  );
  assert.match(
    SESSION_REVIEW_REASON_COPY.same_school_child_not_assigned_to_actor,
    /another education assistant at the same school/
  );
  assert.doesNotMatch(
    SESSION_REVIEW_REASON_COPY.same_school_child_not_assigned_to_actor,
    /fraud|cheat|steal/i
  );
});

test("unavailable copy is not printed twice under the heading", () => {
  const html = renderToStaticMarkup(
    createElement(SessionReviewAlerts, {
      result: {
        ok: false,
        status: 502,
        message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
      },
    })
  );
  const matches = html.match(/Session review alerts are unavailable/g) ?? [];
  assert.equal(matches.length, 1);
  assert.match(html, /mobile-session-review-unavailable/);
});

test("truncated flag lists show a visible-of-total caption and cap rendered rows", () => {
  const flag = VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD.flags[0];
  const flags: MobileSessionReviewFlag[] = Array.from(
    { length: SESSION_REVIEW_ALERTS_VISIBLE_LIMIT + 4 },
    (_, index) => ({
      ...flag,
      session_id: `7c1f3f4a-2c8d-4a11-9c5e-2b6d1a0e9f${String(index).padStart(2, "0")}`,
      child_first_name: `Child${index}`,
    })
  );
  const count = flags.length + 10;
  const html = renderToStaticMarkup(
    createElement(SessionReviewAlerts, {
      result: { ok: true, data: { count, flags } },
    })
  );

  assert.match(
    html,
    new RegExp(`Showing ${SESSION_REVIEW_ALERTS_VISIBLE_LIMIT} of ${count}`)
  );
  assert.equal((html.match(/<li /g) ?? []).length, SESSION_REVIEW_ALERTS_VISIBLE_LIMIT);
  assert.match(html, /Child0/);
  assert.doesNotMatch(html, new RegExp(`Child${SESSION_REVIEW_ALERTS_VISIBLE_LIMIT}`));
});
