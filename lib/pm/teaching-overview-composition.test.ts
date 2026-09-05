import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HistoricalTeamPactDisclosure } from "@/components/pm/education-assistants/historical-teampact-disclosure";
import { TeachingOverviewContent } from "@/components/pm/education-assistants/teaching-overview-content";
import { filterProgrammeFidelityRowsByCohort } from "./cohorts";
import { buildTeachingOverviewPortfolios } from "./teaching-overview";
import {
  VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD,
  VALID_PROGRAMME_FIDELITY_PAYLOAD,
} from "../mobile/programme-fidelity/test-fixtures";

const source = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("the Teaching Overview page streams recent and historical reads independently", () => {
  const page = source("app/pm/education-assistants/page.tsx");
  assert.match(page, /getAuthenticatedMobileSession/);
  assert.match(page, /hasCapability\([\s\S]*"mobile\.sessions\.read"/);
  assert.match(page, /canReadRecentTeaching \? \([\s\S]*<RecentTeachingSection/);
  assert.match(page, /<HistoricalTeamPactSection/);
  assert.equal((page.match(/<SectionErrorBoundary/g) ?? []).length, 2);
  assert.equal((page.match(/<Suspense/g) ?? []).length, 2);
  assert.doesNotMatch(page, /getEAPerformance|fetchProgrammeFidelityWithToken/);
  assert.match(page, /defaultOpen=\{!canReadRecentTeaching\}/);
});

test("each server section owns only its source and expected failure behavior", () => {
  const recent = source(
    "components/pm/education-assistants/recent-teaching-section.tsx"
  );
  const historical = source(
    "components/pm/education-assistants/historical-teampact-section.tsx"
  );
  assert.match(recent, /getAuthenticatedMobileSession/);
  assert.match(recent, /session\.getToken\(\)/);
  assert.match(recent, /fetchProgrammeFidelityWithToken/);
  assert.doesNotMatch(recent, /getEAPerformance/);
  assert.match(historical, /Promise\.all\(\[\s*getEAPerformance\(cohort\),\s*getEAPerformanceHistory\(cohort\)/);
  assert.doesNotMatch(historical, /fetchProgrammeFidelity|getToken/);
  assert.match(historical, /!isLive/);
  assert.match(historical, /!historyIsLive/);
});

test("section error recovery refreshes its Flight data and preserves Next control flow", () => {
  const boundary = source(
    "components/pm/education-assistants/section-error-boundary.tsx"
  );
  assert.match(boundary, /unstable_rethrow\(error\)/);
  assert.match(boundary, /router\.refresh\(\)/);
  assert.match(boundary, /setRetryAttempt/);
  assert.doesNotMatch(boundary, /onClick=\{\(\) => this\.setState/);
});

test("the legacy annual chart is mounted only when its disclosure is open", () => {
  const sentinel = createElement("div", null, "LEGACY_CHART_SENTINEL");
  const collapsed = renderToStaticMarkup(
    createElement(HistoricalTeamPactDisclosure, { defaultOpen: false }, sentinel)
  );
  const expanded = renderToStaticMarkup(
    createElement(HistoricalTeamPactDisclosure, { defaultOpen: true }, sentinel)
  );
  assert.doesNotMatch(collapsed, /LEGACY_CHART_SENTINEL/);
  assert.match(expanded, /LEGACY_CHART_SENTINEL/);
  assert.match(expanded, /Historical TeamPact view — legacy annual measure/);
});

test("recent presentation names Letter Focus plainly and preserves v1 unknowns", () => {
  const filtered = filterProgrammeFidelityRowsByCohort(
    VALID_PROGRAMME_FIDELITY_PAYLOAD.rows,
    "all"
  );
  const html = renderToStaticMarkup(
    createElement(TeachingOverviewContent, {
      data: VALID_PROGRAMME_FIDELITY_PAYLOAD,
      portfolios: buildTeachingOverviewPortfolios(filtered.rows, 1),
      cohortLabel: "All Programme",
      exclusionCounts: filtered.exclusionCounts,
    })
  );
  assert.match(html, /Teaching patterns|EA teaching patterns/);
  assert.match(html, /Letter Focus was not calculated for this run/);
  assert.match(html, /Not calculated for this run/);
  assert.match(html, /Each session and each current group count equally/);
  assert.doesNotMatch(html, /EA Quality Score|good EA|bad EA|on track/i);
});

test("causal v2 presentation shows score denominators without a programme target", () => {
  const filtered = filterProgrammeFidelityRowsByCohort(
    VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD.rows,
    "all"
  );
  const html = renderToStaticMarkup(
    createElement(TeachingOverviewContent, {
      data: VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD,
      portfolios: buildTeachingOverviewPortfolios(filtered.rows, 2),
      cohortLabel: "All Programme",
      exclusionCounts: filtered.exclusionCounts,
    })
  );
  assert.match(html, /Letter Focus evidence is available/);
  assert.match(html, /50\.0%/);
  assert.match(html, /1 of 1 groups/);
  assert.match(html, /3 scorable sessions/);
  assert.doesNotMatch(html, /target|quadrant|high quality|needs support/i);

  const body = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
  assert.ok(body);
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal((row[1].match(/<td(?:\s|>)/g) ?? []).length, 6);
    assert.doesNotMatch(row[1], /colspan=/i);
  }
});

test("the stable URL is relabelled Teaching Overview in navigation", () => {
  const sidebar = source("components/pm/layout/pm-sidebar.tsx");
  assert.match(
    sidebar,
    /name: "Teaching Overview", href: "\/pm\/education-assistants"/
  );
});
