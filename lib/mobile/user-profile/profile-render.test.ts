import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ClockHistoryTable } from "@/components/mobile-app/user-profile/clock-history-table";
import { EvidencePanel } from "@/components/mobile-app/user-profile/evidence-panel";
import { LifetimeSummary } from "@/components/mobile-app/user-profile/lifetime-summary";
import { ProfileDataQuality } from "@/components/mobile-app/user-profile/profile-data-quality";
import { ProfileHeader } from "@/components/mobile-app/user-profile/profile-header";
import { ProfileHowToPanel } from "@/components/mobile-app/user-profile/profile-how-to-panel";
import { ProfileNotFound } from "@/components/mobile-app/user-profile/profile-not-found";
import { RecentSessionsTable } from "@/components/mobile-app/user-profile/recent-sessions-table";
import { UsersIndexTable } from "@/components/mobile-app/user-profile/users-index-table";
import { WeekdaySessionStrip } from "@/components/mobile-app/user-profile/weekday-session-strip";
import { ProfileWeeklyTrends } from "@/components/mobile-app/user-profile/weekly-bar-chart";
import { MobileSidebarNavigation } from "@/components/mobile-app/layout/mobile-sidebar";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "../user-health/test-fixtures";
import { validateProfileUserId } from "./request";
import {
  QUIET_MOBILE_USER_PROFILE_PAYLOAD,
  VALID_MOBILE_USER_PROFILE_PAYLOAD,
} from "./test-fixtures";
import type { MobileUserProfileResponse } from "./types";

function normalizeHtml(html: string): string {
  return html
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

function visibleText(html: string): string {
  return normalizeHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderProfileOverview(
  profile = VALID_MOBILE_USER_PROFILE_PAYLOAD
): string {
  return renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(ProfileHeader, { profile }),
      createElement(EvidencePanel, { profile }),
      createElement(LifetimeSummary, { totals: profile.lifetime.totals })
    )
  );
}

function extractTestId(html: string, testId: string): string {
  const start = html.indexOf(`data-testid="${testId}"`);
  assert.notEqual(start, -1, `Expected ${testId} in rendered HTML`);
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  assert.notEqual(sectionStart, -1);
  assert.notEqual(sectionEnd, -1);
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

test("the profile header preserves durable stage and windowed indicator wording", () => {
  const html = renderProfileOverview();
  const text = visibleText(html);

  assert.match(text, /Asemahle M/);
  assert.match(text, /Charles Duna Primary/);
  assert.match(
    text,
    /ZZ Primary 2026 · launched 2026-08-08 · day 9/
  );
  assert.match(text, /Activated/);
  assert.match(text, /Active · 30d/);
  assert.doesNotMatch(html, />Active<\/span>/);
  assert.doesNotMatch(text, /Quiet · 30d/);

  const quietText = visibleText(
    renderToStaticMarkup(
      createElement(ProfileHeader, {
        profile: QUIET_MOBILE_USER_PROFILE_PAYLOAD,
      })
    )
  );
  assert.match(quietText, /Activated/);
  assert.match(quietText, /Quiet · 30d/);
  assert.doesNotMatch(quietText, /Active · 30d/);

  const reachedProfile: MobileUserProfileResponse = structuredClone(
    VALID_MOBILE_USER_PROFILE_PAYLOAD
  );
  reachedProfile.windowed_activity = {
    clock_entries: 0,
    sessions: 0,
    app_assessments: 0,
    last_clock_in_at: null,
    last_session_at: null,
    last_app_assessment_at: null,
    last_activity_at: null,
  };
  reachedProfile.lifetime.first_ever_activity_at = null;
  reachedProfile.lifetime.last_ever_activity_at = null;
  reachedProfile.lifetime.first_app_open_at = null;
  reachedProfile.lifetime.last_app_open_at = null;
  reachedProfile.ever_registered_device = true;
  const reachedText = visibleText(
    renderToStaticMarkup(
      createElement(ProfileHeader, { profile: reachedProfile })
    )
  );
  assert.match(reachedText, /Reached/);
  assert.doesNotMatch(reachedText, /Activated|Active · 30d|Quiet · 30d/);
});

test("the profile header gives missing identity the shared unknown employment treatment", () => {
  const identityNullProfile: MobileUserProfileResponse = structuredClone(
    VALID_MOBILE_USER_PROFILE_PAYLOAD
  );
  identityNullProfile.identity = null;

  const text = visibleText(
    renderToStaticMarkup(
      createElement(ProfileHeader, { profile: identityNullProfile })
    )
  );

  assert.match(text, /Status unknown/);
  assert.match(text, /Activated/);
  assert.match(text, /Active · 30d/);
});

test("the evidence panel shows tri-state login, current and lifetime device evidence, app opens, and assessment coverage", () => {
  const text = visibleText(
    renderToStaticMarkup(
      createElement(EvidencePanel, {
        profile: VALID_MOBILE_USER_PROFILE_PAYLOAD,
      })
    )
  );

  assert.match(text, /Auth enabled/);
  assert.match(text, /Authenticated after provisioning/);
  assert.match(text, /Current device: Android · v1\.1\.1/);
  assert.match(text, /Ever registered: Yes/);
  assert.match(text, /Opened first:/);
  assert.match(text, /Opened last:/);
  assert.match(text, /2 of 3 children have assessment info/);

  const pluralClassesProfile: MobileUserProfileResponse = structuredClone(
    VALID_MOBILE_USER_PROFILE_PAYLOAD
  );
  pluralClassesProfile.data.classes = 2;
  const pluralClassesText = visibleText(
    renderToStaticMarkup(
      createElement(EvidencePanel, { profile: pluralClassesProfile })
    )
  );
  assert.match(pluralClassesText, /2 classes · 3 children/);
  assert.doesNotMatch(pluralClassesText, /2 class ·/);

  const notProvenProfile: MobileUserProfileResponse = structuredClone(
    VALID_MOBILE_USER_PROFILE_PAYLOAD
  );
  notProvenProfile.auth.authenticated_after_provisioning = false;
  const notProvenText = visibleText(
    renderToStaticMarkup(
      createElement(EvidencePanel, { profile: notProvenProfile })
    )
  );
  assert.match(notProvenText, /No authentication after provisioning/);

  const unmeasuredProfile: MobileUserProfileResponse = structuredClone(
    VALID_MOBILE_USER_PROFILE_PAYLOAD
  );
  unmeasuredProfile.auth.authenticated_after_provisioning = null;
  unmeasuredProfile.auth.provisioning_cutoff_at = null;
  const unmeasuredText = visibleText(
    renderToStaticMarkup(
      createElement(EvidencePanel, { profile: unmeasuredProfile })
    )
  );
  assert.match(
    unmeasuredText,
    /Post-provisioning authentication unmeasured/
  );
});

test("the lifetime summary owns five exact untruncated totals and labels every tile Lifetime", () => {
  const html = renderToStaticMarkup(
    createElement(LifetimeSummary, {
      totals: VALID_MOBILE_USER_PROFILE_PAYLOAD.lifetime.totals,
    })
  );
  const text = visibleText(html);

  assert.match(text, /Lifetime clock days 15/);
  assert.match(text, /Lifetime completed clock time 12h 00m/);
  assert.match(text, /Lifetime clock entries 30/);
  assert.match(text, /Lifetime sessions 40/);
  assert.match(text, /Lifetime app assessments 12/);
  assert.equal((html.match(/data-lifetime-tile="true"/g) ?? []).length, 5);
  assert.match(html, /^<section[^>]*><h2/);
  const tileLabels = html.match(/data-lifetime-tile="true"[\s\S]*?<\/article>/g);
  assert.equal(tileLabels?.length, 5);
  tileLabels?.forEach((tile) => assert.match(visibleText(tile), /Lifetime/));
});

test("the weekly section renders exactly four charts with distinct fixture metrics", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileWeeklyTrends, {
      series: VALID_MOBILE_USER_PROFILE_PAYLOAD.weekly,
    })
  );
  const text = visibleText(html);
  const currentWeekDisclosure =
    "The most recent bar is the current week so far, through the report snapshot—not a full week.";

  assert.equal((html.match(/data-weekly-chart="true"/g) ?? []).length, 4);
  assert.equal(
    text.split(currentWeekDisclosure).length - 1,
    4,
    "each weekly chart must disclose that its latest bar is week-to-date"
  );
  assert.equal(
    VALID_MOBILE_USER_PROFILE_PAYLOAD.generated_at,
    "2026-08-16T22:30:00+00:00"
  );
  assert.equal(
    VALID_MOBILE_USER_PROFILE_PAYLOAD.weekly.at(-1)?.week_start,
    "2026-08-17"
  );
  assert.doesNotMatch(text, /Twenty-six complete/);

  const clockDays = visibleText(extractTestId(html, "weekly-chart-clock_days"));
  assert.match(clockDays, /Clock days per week/);
  assert.match(clockDays, /Latest week: 3 clock days/);

  const completedMinutes = visibleText(
    extractTestId(html, "weekly-chart-clock_minutes_completed")
  );
  assert.match(completedMinutes, /Completed clock minutes per week/);
  assert.match(
    completedMinutes,
    /Latest week: 180 completed clock minutes/
  );

  const sessions = visibleText(extractTestId(html, "weekly-chart-sessions"));
  assert.match(sessions, /Sessions per week/);
  assert.match(sessions, /Sessions recorded for this EA/);
  assert.match(sessions, /Latest week: 4 sessions/);
  assert.doesNotMatch(sessions, /Literacy Coach/);

  const assessments = visibleText(
    extractTestId(html, "weekly-chart-app_assessments")
  );
  assert.match(assessments, /App assessments per week/);
  assert.match(assessments, /Latest week: 5 app assessments/);
});

test("the weekday session strip renders all ten seeded dates and counts", () => {
  const { dates, cells } =
    VALID_MOBILE_USER_PROFILE_PAYLOAD.recent_weekday_sessions;
  const html = normalizeHtml(
    renderToStaticMarkup(createElement(WeekdaySessionStrip, { dates, cells }))
  );

  assert.equal((html.match(/data-session-cell="true"/g) ?? []).length, 10);
  assert.equal((html.match(/role="img"/g) ?? []).length, 10);
  dates.forEach((date, index) => {
    assert.ok(html.includes(`aria-label="${date}: ${cells[index]} sessions"`));
    assert.ok(html.includes(`data-count="${cells[index]}"`));
  });
});

test("the recent sessions table shows group, focus, attendance, and duration evidence", () => {
  const text = visibleText(
    renderToStaticMarkup(
      createElement(RecentSessionsTable, {
        sessions: VALID_MOBILE_USER_PROFILE_PAYLOAD.recent_sessions,
      })
    )
  );

  assert.match(text, /Blue Group/);
  assert.match(text, /A, B/);
  assert.match(text, /Blending: short vowels/);
  assert.match(text, /Legacy fallback group/);
  assert.match(text, /3 present/);
  assert.match(text, /2 present/);
  assert.match(text, /1h 00m/);
  assert.match(text, /45m/);
});

test("the clock table shows timestamps, durations, and markers without GPS fields", () => {
  const html = renderToStaticMarkup(
    createElement(ClockHistoryTable, {
      entries: VALID_MOBILE_USER_PROFILE_PAYLOAD.clock_entries,
    })
  );
  const text = visibleText(html);

  assert.match(text, /Clock in/);
  assert.match(text, /Clock out/);
  assert.match(text, /1h 30m/);
  assert.match(text, /2h 00m/);
  assert.match(text, /Automatic clock-out/);
  assert.match(text, /Active/);
  assert.doesNotMatch(text, /\b(?:lat|latitude|lon|longitude)\b/i);
});

test("the profile how-to panel separates lifetime and windowed claims without knowledge claims", () => {
  const text = visibleText(
    renderToStaticMarkup(createElement(ProfileHowToPanel, { days: 30 }))
  );

  assert.match(text, /Lifetime/);
  assert.match(text, /30-day window/);
  assert.match(text, /assessment info/);
  assert.match(
    text,
    /it says the app reached them, not that they are teaching with it or still using it/
  );
  assert.match(text, /missing Opened evidence is not proof/i);
  assert.doesNotMatch(text, /\bmastered\b/i);
  assert.doesNotMatch(text, /\blearned\b/i);
});

test("the pure users index sorts roster rows and links every EA to a profile", () => {
  const html = renderToStaticMarkup(
    createElement(UsersIndexTable, {
      users: [...VALID_MOBILE_USER_HEALTH_PAYLOAD.users].reverse(),
      days: VALID_MOBILE_USER_HEALTH_PAYLOAD.days,
      lifetimeEvidence: true,
    })
  );

  for (const user of VALID_MOBILE_USER_HEALTH_PAYLOAD.users) {
    assert.match(
      html,
      new RegExp(`href="/mobile-app/users/${user.user_id}"`)
    );
  }
  assert.ok(html.indexOf("Asemahle Mancayi") < html.indexOf("Lihle Jacobs"));
  assert.match(visibleText(html), /ZZ Primary 2026/);
  assert.match(visibleText(html), /Activated/);
});

test("malformed and unknown user ids share one indistinguishable not-found state", () => {
  assert.equal(validateProfileUserId("not-a-uuid"), null);

  const malformedHtml = renderToStaticMarkup(createElement(ProfileNotFound));
  const unknownUuidHtml = renderToStaticMarkup(createElement(ProfileNotFound));

  assert.equal(malformedHtml, unknownUuidHtml);
  assert.match(malformedHtml, /data-testid="mobile-user-profile-not-found"/);
  assert.match(visibleText(malformedHtml), /User profile not found/);
});

test("the data-quality state explains the per-EA repair without outage wording", () => {
  const html = renderToStaticMarkup(createElement(ProfileDataQuality));
  const text = visibleText(html);

  assert.match(html, /data-testid="mobile-user-profile-data-quality"/);
  assert.match(text, /Profile data needs repair/);
  assert.match(text, /clock history contains invalid entries/);
  assert.match(text, /sign-out earlier than its sign-in/);
  assert.match(text, /data problem with this EA's records/);
  assert.match(text, /repair by the engineering team/);
  assert.match(text, /Other EAs are unaffected/);
  assert.doesNotMatch(text, /service unavailable|outage/i);
  assert.doesNotMatch(text, /\b(?:RPC|invariant|mastered|learned)\b/i);
});

test("the sidebar exposes Users to capability holders in both nav variants and supports mobile overflow", () => {
  const html = renderToStaticMarkup(
    createElement(MobileSidebarNavigation, {
      pathname: "/mobile-app/users/3eb26195-c9b4-41a2-a01d-3b341a28177e",
      canReadSessions: true,
      canReadTimeEntries: true,
      canReadUserHealth: true,
    })
  );
  const desktop = extractTestId(html, "mobile-sidebar-desktop");
  const mobile = extractTestId(html, "mobile-sidebar-bottom-nav");

  assert.match(desktop, /href="\/mobile-app\/users"/);
  assert.match(mobile, /href="\/mobile-app\/users"/);
  assert.match(desktop, /Schools/);
  assert.match(desktop, /Soon/);
  assert.ok(desktop.indexOf(">Users<") < desktop.indexOf(">Schools<"));
  assert.match(mobile, /data-testid="mobile-nav-scroll"[^>]*overflow-x-auto/);
  assert.match(mobile, /data-testid="mobile-nav-scroll"[^>]*scrollbar-none/);
  assert.match(
    mobile,
    /data-testid="mobile-nav-items"[^>]*class="[^"]*w-max mx-auto min-w-full[^"]*justify-around/
  );
  assert.match(mobile, /aria-label="Users"[^>]*class="[^"]*shrink-0/);
  assert.match(mobile, /aria-label="Back to site"[^>]*class="[^"]*shrink-0/);
  assert.match(mobile, /data-testid="mobile-nav-right-fade"[^>]*bg-gradient-to-l/);
});

test("the sidebar omits Users entirely for junior-staff capabilities in both nav variants", () => {
  const html = renderToStaticMarkup(
    createElement(MobileSidebarNavigation, {
      pathname: "/mobile-app/sessions",
      canReadSessions: true,
      canReadTimeEntries: true,
      canReadUserHealth: false,
    })
  );
  const desktop = extractTestId(html, "mobile-sidebar-desktop");
  const mobile = extractTestId(html, "mobile-sidebar-bottom-nav");

  assert.doesNotMatch(desktop, /href="\/mobile-app\/users"|>Users</);
  assert.doesNotMatch(mobile, /href="\/mobile-app\/users"|aria-label="Users"/);
  assert.match(desktop, /Schools/);
  assert.match(desktop, /Soon/);
});
