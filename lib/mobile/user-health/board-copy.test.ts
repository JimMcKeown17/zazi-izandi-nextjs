import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HowToReadPanel } from "@/components/mobile-app/user-health/how-to-read-panel";
import { UserHealthBoard } from "@/components/mobile-app/user-health/user-health-board";
import {
  ATTENTION_LABELS,
  BLOCKER_PLAYBOOK,
} from "./presentation";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("the how-to-read panel keeps every honesty caveat and maps blockers to actions", () => {
  const html = renderToStaticMarkup(createElement(HowToReadPanel));
  const normalizedHtml = html.replaceAll("&#x27;", "'");
  assert.match(html, /How to read this evidence/i);
  assert.match(html, /synthetic/i);
  assert.match(html, /not proof that the app is absent|unknown/i);
  assert.match(html, /provisioning/i);
  assert.match(html, /re-run the seed/i);
  assert.doesNotMatch(html, /youth/i);

  for (const reason of Object.keys(ATTENTION_LABELS) as Array<
    keyof typeof ATTENTION_LABELS
  >) {
    assert.ok(html.includes(ATTENTION_LABELS[reason]));
    assert.ok(normalizedHtml.includes(BLOCKER_PLAYBOOK[reason]));
  }
});

test("the board uses EA terminology and exposes blocker actions on its chips", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthBoard, {
      users: VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
      days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
      generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
      schoolId: null,
      schoolName: null,
    })
  );
  const normalizedHtml = html.replaceAll("&#x27;", "'");

  assert.match(html, /Find an EA/i);
  assert.match(html, /EA identity/i);
  assert.ok(
    normalizedHtml.includes(`title="${BLOCKER_PLAYBOOK.auth_blocked}"`)
  );
  assert.ok(
    normalizedHtml.includes(
      `title="${BLOCKER_PLAYBOOK.seeded_groups_missing}"`
    )
  );
  assert.doesNotMatch(html, /youth/i);
});
