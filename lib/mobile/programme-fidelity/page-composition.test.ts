import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MobileSidebarNavigation } from "@/components/mobile-app/layout/mobile-sidebar";
import { FidelityPageContent } from "@/components/mobile-app/programme-fidelity/fidelity-page-content";
import { VALID_PROGRAMME_FIDELITY_PAYLOAD } from "./test-fixtures";

test("the server route guards capability and parallelizes independent aggregate/detail reads", () => {
  const page = fs.readFileSync(
    path.join(process.cwd(), "app/mobile-app/programme-fidelity/page.tsx"),
    "utf8"
  );
  assert.match(page, /requireMobileSessionsSession/);
  assert.match(page, /Promise\.all/);
  assert.match(page, /fetchProgrammeFidelityWithToken/);
  assert.match(page, /fetchProgrammeFidelitySessionsWithToken/);
  assert.doesNotMatch(page, /supabase|service_role/i);
});

test("the populated v0-a page renders coaching guidance without causal or ranking claims", () => {
  const html = renderToStaticMarkup(
    createElement(FidelityPageContent, {
      result: { ok: true, data: VALID_PROGRAMME_FIDELITY_PAYLOAD },
      sessionsResult: null,
      filters: { schoolId: null, eaUserId: null, attention: "all" },
      expansion: null,
    })
  );
  assert.match(html, /Current mobile guidance is live/);
  assert.match(html, /historical alignment is not yet calculated/i);
  assert.match(html, /Suggested next letters: m, a/);
  assert.match(html, /Former owner.*current tracker advice is not assigned/i);
  assert.match(html, /This is not an EA ranking/);
  assert.match(html, /href="\/pm"/);
  assert.doesNotMatch(html, /on track/i);
  assert.doesNotMatch(html, /learner_id|child_uuid|service_role|source cursor/i);
});

test("Programme fidelity is session-capability visible in desktop and mobile navigation", () => {
  const permitted = renderToStaticMarkup(
    createElement(MobileSidebarNavigation, {
      pathname: "/mobile-app/programme-fidelity",
      canReadSessions: true,
      canReadTimeEntries: false,
      canReadUserHealth: false,
    })
  );
  const denied = renderToStaticMarkup(
    createElement(MobileSidebarNavigation, {
      pathname: "/mobile-app/user-health",
      canReadSessions: false,
      canReadTimeEntries: false,
      canReadUserHealth: true,
    })
  );
  assert.match(permitted, /href="\/mobile-app\/programme-fidelity"/);
  assert.match(permitted, /aria-label="Programme fidelity"/);
  assert.doesNotMatch(denied, /href="\/mobile-app\/programme-fidelity"|aria-label="Programme fidelity"/);
});

test("a stale completed snapshot is retained but visibly labelled stale", () => {
  const stale = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  stale.freshness.is_stale = true;
  const html = renderToStaticMarkup(
    createElement(FidelityPageContent, {
      result: { ok: true, data: stale },
      sessionsResult: null,
      filters: { schoolId: null, eaUserId: null, attention: "all" },
      expansion: null,
    })
  );
  assert.match(html, /Latest completed mobile guidance is stale/);
  assert.match(html, /stale — latest completed data retained/);
});
