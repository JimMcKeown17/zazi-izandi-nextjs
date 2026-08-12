import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserHealthSummary } from "@/components/mobile-app/user-health/user-health-summary";
import {
  copyChaseListToClipboard,
  UserHealthBoard,
} from "@/components/mobile-app/user-health/user-health-board";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

const chaseListContext = {
  days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
  generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
  schoolId: null,
  schoolName: null,
};

function stubClipboard(writeText: (text: string) => Promise<void>): () => void {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText } },
  });
  return () => {
    if (original) Object.defineProperty(globalThis, "navigator", original);
    else delete (globalThis as { navigator?: Navigator }).navigator;
  };
}

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
      generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
      schoolId: null,
      schoolName: null,
    })
  );

  assert.match(html, /Auth \/ login/i);
  assert.match(html, /Authenticated after provisioning/i);
  assert.match(html, /No authentication after provisioning/i);
  assert.match(html, /Post-provisioning authentication unmeasured/i);
  assert.match(html, /Cutoff:/i);
  assert.match(html, /app and device are not identified/i);
  assert.match(html, /Download CSV/i);
  assert.match(html, /Copy list/i);
});

test("copy success is reported only after clipboard writing resolves", async () => {
  let resolveWrite: (() => void) | undefined;
  let copiedText = "";
  const restore = stubClipboard(
    (text) =>
      new Promise<void>((resolve) => {
        copiedText = text;
        resolveWrite = resolve;
      })
  );

  try {
    let settled = false;
    const resultPromise = copyChaseListToClipboard(
      VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
      chaseListContext
    ).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    assert.equal(settled, false);
    assert.ok(resolveWrite);
    resolveWrite();
    assert.equal(await resultPromise, "copied");
    assert.match(copiedText, /User health chase list/);
  } finally {
    restore();
  }
});

test("clipboard rejection returns the retryable failure state", async () => {
  const restore = stubClipboard(async () => {
    throw new Error("clipboard denied");
  });

  try {
    assert.equal(
      await copyChaseListToClipboard(
        VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
        chaseListContext
      ),
      "failed"
    );
  } finally {
    restore();
  }
});
