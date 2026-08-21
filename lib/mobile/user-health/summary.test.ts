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

test("the overview presents exactly four operational cards", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthSummary, {
      users: VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
      days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
      schoolId: null,
      cohort: "all",
      wave: "all",
    })
  );

  assert.match(html, /EA accounts/i);
  assert.match(html, /Activated ever/i);
  assert.match(html, /Active · 30d/i);
  assert.match(html, /Needs attention/i);
  assert.doesNotMatch(html, /Authenticated after provisioning/i);
  assert.doesNotMatch(html, /Device signals/i);
  assert.doesNotMatch(html, /Seeded data ready/i);
});

test("summary tiles deep-link into board filters using the payload's own scope", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthSummary, {
      users: VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
      days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
      schoolId: null,
      cohort: "all",
      wave: "all",
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
  assert.match(
    html,
    /href="\/mobile-app\/user-health\?days=30&amp;state=activated"/
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

test("degraded clipboard copy writes only pre-Part-B windowed wording", async () => {
  let copiedText = "";
  const restore = stubClipboard(async (text) => {
    copiedText = text;
  });

  try {
    assert.equal(
      await copyChaseListToClipboard(
        [
          VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
          VALID_MOBILE_USER_HEALTH_PAYLOAD.users[1],
        ],
        chaseListContext,
        { partB: false }
      ),
      "copied"
    );
    assert.match(copiedText, /Asemahle Mancayi — active · 30d/);
    assert.match(copiedText, /Lihle Jacobs — reached · 30d/);
    assert.doesNotMatch(copiedText, /activated/i);
    assert.doesNotMatch(copiedText, /\bquiet\b/i);
  } finally {
    restore();
  }
});
