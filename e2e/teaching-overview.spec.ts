import { expect, test } from "./test";
import type { APIRequestContext, Page } from "@playwright/test";

const MOCK = "http://127.0.0.1:4012";

async function selectMode(request: APIRequestContext, mode: string) {
  const response = await request.post(`${MOCK}/__test/control`, {
    data: { reset: true, mode },
  });
  expect(response.ok()).toBe(true);
}

async function loggedPaths(request: APIRequestContext): Promise<string[]> {
  const response = await request.get(`${MOCK}/__test/requests`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.requests.map((entry: { path: string }) => entry.path);
}

async function expectLogged(request: APIRequestContext, path: string) {
  await expect.poll(() => loggedPaths(request), {
    message: `Expected a cold upstream request to ${path}; a missing call may indicate an unexpected Next fetch-cache hit.`,
  }).toContain(path);
}

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
}

test.describe("Teaching Overview — independent mocked Django reads", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      process.env.E2E_TEACHING_OVERVIEW_DJANGO_MOCKED !== "1",
      "Set E2E_TEACHING_OVERVIEW_DJANGO_MOCKED=1 for the cold-cache Teaching Overview proof."
    );
  });

  test("Slice 1 shows the shared PM route fallback during a real delayed navigation", async ({
    page,
    request,
    signInAsRole,
  }, testInfo) => {
    await selectMode(request, "slice1");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsRole("senior_staff");
    await page.goto("/pm");
    await page.getByRole("link", { name: "Quality Flags" }).click();
    await expect(page.getByTestId("pm-loading-page")).toBeVisible();
    await expect(page.getByText("Loading programme data…")).toBeVisible();
    await expectLogged(request, "/api/groups-2026/");
    await page.screenshot({
      path: testInfo.outputPath("pm-route-loading-1440x1000.png"),
      fullPage: false,
    });
    await expect(page.getByRole("heading", { name: "Quality Flags" })).toBeVisible();
  });

  test("staff see the recent partial lens before slow history and can inspect both", async ({
    page,
    request,
    signInAsRole,
  }, testInfo) => {
    await selectMode(request, "success");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsRole("senior_staff");
    await page.goto("/pm");
    await page.getByRole("link", { name: "Teaching Overview" }).click();

    await expect(page.getByRole("heading", { name: "Teaching Overview" })).toBeVisible();
    await expect(page.getByText("Loading recent mobile teaching data…")).toBeVisible();
    await expect(page.getByText("Loading the historical TeamPact view…")).toBeVisible();
    await expect(page.getByTestId("recent-teaching-content")).toBeVisible();
    await expect(page.getByText("Letter Focus uses a partial evidence window")).toBeVisible();
    await expect(page.getByText("Loading the historical TeamPact view…")).toBeVisible();

    const infoSummary = page.getByText("What is Letter Focus Score?", { exact: true });
    await infoSummary.focus();
    await expect(infoSummary).toBeFocused();
    await infoSummary.press("Enter");
    await expect(page.getByText(/Each session and each current group count equally/)).toBeVisible();

    const recentChart = page.getByTestId("teaching-overview-chart");
    await expect(recentChart).toBeVisible();
    await recentChart.locator(".recharts-scatter-symbol").first().click();
    await expect(page.locator("tr.bg-blue-50").first()).toContainText("Nomvula Dlamini");
    await expect(page.getByText(/good EA|bad EA|on track|needs support/i)).toHaveCount(0);

    const historical = page.getByTestId("historical-teampact-disclosure");
    const historicalSummary = historical.locator("summary");
    await expect(historical).not.toHaveAttribute("open", "");
    await historicalSummary.click();
    await expect(historical.getByText("EA Performance Map")).toBeVisible();
    await expect(historical.getByText("Letter Alignment Score (%)")).toBeVisible();
    await expect(historical.locator(".recharts-scatter-symbol").first()).toBeVisible();
    await historicalSummary.click();
    await expect(historical.getByTestId("historical-teampact-content")).toHaveCount(0);
    await historicalSummary.click();
    await expect(historical.locator(".recharts-scatter-symbol").first()).toBeVisible();

    await expectLogged(request, "/api/mobile/programme-fidelity/");
    await expectLogged(request, "/api/ea-performance/");
    await expectLogged(request, "/api/ea-performance-history/");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("teaching-overview-partial-staff-1440x1000.png"),
      fullPage: true,
    });

    await historicalSummary.click();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.locator("table")).not.toBeVisible();
      await expect(page.locator("article").filter({ hasText: "Nomvula Dlamini" }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`teaching-overview-partial-staff-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("table").getByRole("button", { name: "Inspect" }).first().click();
    const drillDown = page.getByRole("link", { name: "Open group and session evidence" }).first();
    await expect(drillDown).toHaveAttribute("href", /\/mobile-app\/programme-fidelity\?ea_user_id=[0-9a-f-]+&expanded_group_id=/);
    await drillDown.click();
    await expect(page).toHaveURL(/\/mobile-app\/programme-fidelity\?ea_user_id=[0-9a-f-]+/);
    await expect(page.getByTestId("programme-fidelity-success")).toBeVisible();
    await expectLogged(request, "/api/mobile/programme-fidelity/sessions/");
  });

  test("a mobile failure leaves the SEF historical lens usable", async ({
    page,
    request,
    signInAsRole,
  }, testInfo) => {
    await selectMode(request, "mobile_fail");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsRole("senior_staff");
    await page.goto("/pm/education-assistants?cohort=sef");
    await expect(page.getByTestId("recent-teaching-unavailable")).toBeVisible();
    await expect(page.getByText("Recent teaching data is temporarily unavailable")).toBeVisible();
    const historical = page.getByTestId("historical-teampact-disclosure");
    await historical.locator("summary").click();
    await expect(historical.getByText("EA Performance Map")).toBeVisible();
    await expect(historical.locator(".recharts-scatter-symbol").first()).toBeVisible();
    await expectLogged(request, "/api/mobile/programme-fidelity/");
    await expectLogged(request, "/api/ea-performance/");
    await page.screenshot({
      path: testInfo.outputPath("teaching-overview-mobile-unavailable-1440x1000.png"),
      fullPage: true,
    });
  });

  test("a TeamPact failure leaves the ECD full recent lens usable", async ({
    page,
    request,
    signInAsRole,
  }, testInfo) => {
    await selectMode(request, "historical_fail");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsRole("senior_staff");
    await page.goto("/pm/education-assistants?cohort=ecd");
    await expect(page.getByTestId("recent-teaching-content")).toBeVisible();
    await expect(page.getByText("Letter Focus evidence is available")).toBeVisible();
    await expect(page.getByTestId("teaching-overview-chart")).toBeVisible();
    const historical = page.getByTestId("historical-teampact-disclosure");
    await historical.locator("summary").click();
    await expect(historical.getByText("EA performance data unavailable.")).toBeVisible();
    await expectLogged(request, "/api/mobile/programme-fidelity/");
    await expectLogged(request, "/api/ea-performance/");
    await expectLogged(request, "/api/ea-performance-history/");
    await page.screenshot({
      path: testInfo.outputPath("teaching-overview-full-mobile-history-unavailable-1440x1000.png"),
      fullPage: true,
    });
  });

  test("funders receive expanded history and cause zero mobile reads", async ({
    page,
    request,
    signInAsRole,
  }, testInfo) => {
    await selectMode(request, "funder");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsRole("funder");
    await page.goto("/pm/education-assistants?cohort=all");
    await expect(page.getByText("Recent teaching data is restricted")).toBeVisible();
    const historical = page.getByTestId("historical-teampact-disclosure");
    await expect(historical).toHaveAttribute("open", "");
    await expect(historical.getByText("EA Performance Map")).toBeVisible();
    await expect(historical.locator(".recharts-scatter-symbol").first()).toBeVisible();
    await expect(page.getByTestId("recent-teaching-content")).toHaveCount(0);
    await expect(page.getByText("Current EAs", { exact: true })).toHaveCount(0);
    await expectLogged(request, "/api/ea-performance/");
    const paths = await loggedPaths(request);
    expect(paths.filter((path) => path === "/api/mobile/programme-fidelity/")).toHaveLength(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("teaching-overview-funder-history-1440x1000.png"),
      fullPage: true,
    });
  });
});
