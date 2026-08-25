import fs from "node:fs/promises";

import { expect, test } from "./test";

test.describe("Mobile programme fidelity — locally mocked Django contract", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      process.env.E2E_PROGRAMME_FIDELITY_DJANGO_MOCKED !== "1",
      "Set E2E_PROGRAMME_FIDELITY_DJANGO_MOCKED=1 for the reviewed local contract mock."
    );
  });

  test("authorized staff can coach, filter, expand bounded explanations, and export at desktop", async ({
    page,
    signInAsRole,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsRole("senior_staff");
    await page.goto("/mobile-app/programme-fidelity?attention=all");

    await expect(page.getByTestId("programme-fidelity-success")).toBeVisible();
    await expect(page.getByText("Current mobile guidance is live", { exact: false })).toBeVisible();
    await expect(page.getByText("Suggested next letters: m, a", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Historical alignment not calculated").first()).toBeVisible();
    await expect(page.getByText("Former owner · recent activity only").first()).toBeVisible();
    await expect(page.getByText(/This is not an EA ranking/)).toBeVisible();

    const desktopFilters = page.getByTestId("programme-fidelity-filters-desktop");
    await desktopFilters.getByLabel("Attention view").selectOption("current");
    await desktopFilters.getByRole("button", { name: "Apply" }).click();
    await page.waitForURL(/attention=current/);
    await expect(page.getByText(/1 row;/)).toBeVisible();

    await page.goto("/mobile-app/programme-fidelity?attention=all");
    const table = page.locator("table");
    await table.getByRole("link", { name: "Sessions" }).first().click();
    await expect(page.getByTestId("programme-fidelity-session-details").first()).toBeVisible();
    await expect(page.getByText("Before evidence ledger").first()).toBeVisible();
    await expect(page.getByText("Historical alignment not calculated").first()).toBeVisible();
    await expect(page.getByText(/this is not one 15-day score window/i).first()).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download coaching CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("programme-fidelity-coaching-queue-2026-08-25.csv");
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const csv = await fs.readFile(downloadPath!, "utf8");
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://invalid.example\"\")\"");
    expect(csv).toContain("\"'+SUM(1,2) Foundation Group\"");
    expect(csv).not.toContain("group_id");

    await page.screenshot({
      path: testInfo.outputPath("programme-fidelity-1440x1000.png"),
      fullPage: false,
    });
  });

  test("the 375x812 coaching queue remains readable and the route stays reachable in mobile navigation", async ({
    page,
    signInAsRole,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signInAsRole("junior_staff");
    await page.goto("/mobile-app/programme-fidelity?attention=all");

    await expect(page.getByTestId("programme-fidelity-success")).toBeVisible();
    await expect(page.locator("article").filter({ hasText: "Coach One" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Programme fidelity" })).toBeVisible();
    await expect(page.locator("table")).not.toBeVisible();

    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

    await page.screenshot({
      path: testInfo.outputPath("programme-fidelity-375x812.png"),
      fullPage: false,
    });

    await page.getByRole("link", { name: "Show session details" }).first().click();
    await expect(page.getByTestId("programme-fidelity-session-details").last()).toBeVisible();
    await expect(page.getByText("Before evidence ledger").last()).toBeVisible();

    const nav = page.getByTestId("mobile-nav-scroll");
    const navSize = await nav.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(navSize.scrollWidth).toBeGreaterThan(navSize.clientWidth);

    await page.screenshot({
      path: testInfo.outputPath("programme-fidelity-375x812-details.png"),
      fullPage: false,
    });
  });

  test("an EA role cannot reach the queue or its mobile navigation item", async ({
    page,
    signInAsRole,
  }) => {
    await signInAsRole("ea");
    await page.goto("/mobile-app/programme-fidelity");
    await page.waitForURL(/\/login\?error=insufficient_role/);
    await expect(page.getByTestId("programme-fidelity-success")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Programme fidelity" })).toHaveCount(0);
  });
});
