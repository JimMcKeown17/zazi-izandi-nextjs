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
import {
  LEGACY_MOBILE_USER_HEALTH_PAYLOAD,
  VALID_MOBILE_USER_HEALTH_PAYLOAD,
} from "./test-fixtures";
import type { MobileRolloutWave, MobileUserHealthRow } from "./types";

function normalizeHtml(html: string): string {
  return html
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

function visibleText(html: string): string {
  return normalizeHtml(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function renderBoard(
  overrides: Partial<{
    users: MobileUserHealthRow[];
    generatedAt: string;
    initialPredicate: "all" | "has_blockers" | "active" | "activated" | "quiet" | "reached" | "not_started";
    initialWave: "all" | "none" | string;
    lifetimeEvidence: boolean;
    waveOptions: MobileRolloutWave[];
  }> = {}
): string {
  return renderToStaticMarkup(
    createElement(UserHealthBoard, {
      users: VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
      days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
      generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
      schoolId: null,
      schoolName: null,
      waveOptions: VALID_MOBILE_USER_HEALTH_PAYLOAD.wave_options,
      initialWave: "all",
      lifetimeEvidence: true,
      ...overrides,
    })
  );
}

test("the how-to-read panel keeps every honesty caveat and maps blockers to actions", () => {
  const html = renderToStaticMarkup(
    createElement(HowToReadPanel, { lifetimeEvidence: false })
  );
  const normalizedHtml = normalizeHtml(html);
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
  const html = renderBoard();
  const normalizedHtml = normalizeHtml(html);

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

test("the board exposes wave choices and a wave-scoped evidence funnel", () => {
  const allWavesHtml = renderBoard();
  assert.match(allWavesHtml, />All waves</);
  assert.match(allWavesHtml, />No wave</);
  assert.match(allWavesHtml, />ZZ Primary 2026</);
  assert.match(allWavesHtml, />ZZ ECD 2026</);

  const primaryWaveId = VALID_MOBILE_USER_HEALTH_PAYLOAD.wave_options[0].id;
  const primaryHtml = renderBoard({
    initialWave: primaryWaveId,
    generatedAt: "2026-08-12T14:30:00.000Z",
  });
  const primaryText = visibleText(primaryHtml);
  assert.match(
    primaryText,
    /ZZ Primary 2026 · launched 2026-08-08 · day 4/
  );
  assert.match(primaryText, /Accounts .* 2 · 100%/);
  assert.match(primaryText, /Opened app \(ever\) 1 · 50%/);
  assert.match(primaryText, /Activated \(ever\) 2 · 100%/);
  assert.match(primaryText, /Active · 30d 1 · 50%/);
});

test("durable stages and windowed indicators are labelled as separate claims", () => {
  const quietUser = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[1];
  const quietHtml = renderBoard({ users: [quietUser] });
  assert.match(quietHtml, /Activated<\/span>/);
  assert.match(quietHtml, /Quiet · 30d/);
  assert.doesNotMatch(quietHtml, /Active · 30d/);

  const html = renderBoard();
  assert.match(html, />Active · in window</);
  assert.match(html, />Activated \(ever\)</);
  assert.match(html, />Quiet \(activated, silent in window\)</);
});

test("the windowed Active predicate reconciles to the summary tile count", () => {
  const html = renderBoard({ initialPredicate: "active" });
  assert.match(
    visibleText(html),
    new RegExp(
      `${VALID_MOBILE_USER_HEALTH_PAYLOAD.summary.active_in_window} of ${VALID_MOBILE_USER_HEALTH_PAYLOAD.summary.total_users} users`
    )
  );
  assert.match(html, /Asemahle Mancayi/);
  assert.match(html, /Nobuhle Maseko/);
  assert.doesNotMatch(html, /Lihle Jacobs/);
});

test("an app-open-only account is reached and shows direct open evidence", () => {
  const appOpenOnly = VALID_MOBILE_USER_HEALTH_PAYLOAD.users.find(
    (user) => user.display_name === "Ayanda Ndlovu"
  );
  assert.ok(appOpenOnly);
  const html = renderBoard({ users: [appOpenOnly] });
  assert.match(html, /Reached<\/span>/);
  assert.match(html, /Opened 11 Aug 2026/);
});

test("degraded mode announces and consistently hides Part B board semantics", () => {
  const html = renderBoard({
    users: LEGACY_MOBILE_USER_HEALTH_PAYLOAD.users,
    waveOptions: [],
    lifetimeEvidence: false,
  });
  assert.match(
    visibleText(html),
    /Lifetime rollout evidence is temporarily unavailable — showing the window-scoped view\./
  );
  assert.match(html, /Active · 30d/);
  assert.doesNotMatch(html, /Activated/);
  assert.doesNotMatch(html, /Quiet/);
  assert.doesNotMatch(html, /All waves|No wave/);
  assert.doesNotMatch(html, /Opened/);
});

test("the how-to-read panel degrades from the same capability switch", () => {
  const legacyHtml = normalizeHtml(
    renderToStaticMarkup(
      createElement(HowToReadPanel, { lifetimeEvidence: false })
    )
  );
  assert.doesNotMatch(legacyHtml, /Activated/);
  assert.doesNotMatch(legacyHtml, /Quiet/);
  assert.doesNotMatch(legacyHtml, /\bwave\b/i);
  assert.doesNotMatch(legacyHtml, /Opened/);
  assert.match(
    legacyHtml,
    /Activity numbers and 'last activity' cover only the selected window — changing the window changes them\./
  );

  const partBHtml = normalizeHtml(
    renderToStaticMarkup(
      createElement(HowToReadPanel, { lifetimeEvidence: true })
    )
  );
  assert.match(
    partBHtml,
    /says the app reached them, not that they are teaching with it/
  );
  assert.doesNotMatch(partBHtml, /signed-in use/i);
});
